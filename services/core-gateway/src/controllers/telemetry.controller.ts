import { Request, Response } from 'express';
import { z } from 'zod';
import { stateService } from '../services/state.service.js';
import { aiService } from '../services/ai.service.js';
import { alertService } from '../services/alert.service.js';
import { weatherService } from '../services/weather.service.js';
import { NodeTelemetry, LSIResult, MountainSector } from '../types/index.js';
import { TelemetryLogModel } from '../models/telemetryLog.model.js';
import { isDatabaseConnected } from '../config/database.js';

// Schema for incoming telemetry from physical ESP32 with dynamic GPS
const telemetryIngestSchema = z.object({
  node_id: z.string().default('NODE_01'),
  // Live GPS Coordinates from onboard module (NEO-6M / NEO-8M)
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude_m: z.number().optional().default(1730),
  gps_fix: z.boolean().optional().default(true),

  // Soil & IMU Telemetry
  soil_moisture_pct: z.number().min(0).max(100),
  temperature_c: z.number().optional().default(15.0),
  humidity_pct: z.number().optional().default(70.0),
  tilt_x: z.number().default(0),
  tilt_y: z.number().default(0),
  accel_rms: z.number().optional().default(1.0),
  vibration_detected: z.boolean().optional().default(false),
  wake_reason: z.enum(['TIMER_HEARTBEAT', 'MOTION_INTERRUPT', 'MANUAL']).optional().default('TIMER_HEARTBEAT'),
  battery_pct: z.number().optional().default(100)
});

let socketEmitter: any = null;
export const setTelemetrySocketEmitter = (emitter: any) => {
  socketEmitter = emitter;
};

/**
 * Finds the closest mountain sector to live GPS coordinates or creates a dynamic sector
 */
const resolveSectorForGPS = (lat: number, lon: number): MountainSector => {
  const sectors = stateService.getAllSectors();
  let closest = sectors[0];
  let minDistance = Number.MAX_VALUE;

  for (const s of sectors) {
    const dist = Math.hypot(s.latitude - lat, s.longitude - lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = s;
    }
  }

  // Update closest sector's current active coordinate anchor to the live GPS fix
  closest.latitude = lat;
  closest.longitude = lon;
  return closest;
};

export const ingestTelemetry = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = telemetryIngestSchema.parse(req.body);

    const tiltMagnitude = Number(Math.sqrt(data.tilt_x * data.tilt_x + data.tilt_y * data.tilt_y).toFixed(2));
    const previous = stateService.getTelemetry(data.node_id);
    const prevMagnitude = previous ? previous.tiltMagnitude : tiltMagnitude;
    const tiltDelta = Number(Math.abs(tiltMagnitude - prevMagnitude).toFixed(2));

    const telemetry: NodeTelemetry = {
      nodeId: data.node_id,
      timestamp: Date.now(),
      latitude: data.latitude,
      longitude: data.longitude,
      altitudeM: data.altitude_m,
      gpsFix: data.gps_fix,
      soilMoisturePct: Number(data.soil_moisture_pct.toFixed(1)),
      temperatureC: Number(data.temperature_c.toFixed(1)),
      humidityPct: Number(data.humidity_pct.toFixed(1)),
      tiltX: Number(data.tilt_x.toFixed(2)),
      tiltY: Number(data.tilt_y.toFixed(2)),
      tiltMagnitude,
      tiltDelta,
      accelRms: Number(data.accel_rms.toFixed(2)),
      vibrationDetected: data.vibration_detected,
      batteryPct: data.battery_pct,
      isPhysicalNode: true
    };

    // Store in RAM state
    stateService.setTelemetry(telemetry);

    // Resolve dynamic mountain sector based on live GPS position
    const sector = resolveSectorForGPS(data.latitude, data.longitude);

    // Dynamic Weather Sync for the Node's exact live GPS location
    const weather = await weatherService.syncSectorWeather(sector.id, data.latitude, data.longitude);

    // Attempt AI Risk Evaluation via Python microservice
    let lsiResult: LSIResult | null = null;
    let aiStatus = 'ONLINE';
    let generatedAlert = null;

    try {
      lsiResult = await aiService.evaluateRisk({
        nodeId: telemetry.nodeId,
        sectorId: sector.id,
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        telemetry,
        weather
      });

      // Process alert if AI reports elevated hazard
      if (lsiResult.riskLevel !== 'LOW') {
        generatedAlert = await alertService.triggerEmergencyAlert(sector, telemetry.nodeId, lsiResult);
      } else {
        stateService.updateSectorRisk(sector.id, 'LOW', lsiResult.lsiScore);
      }
    } catch (aiError: any) {
      aiStatus = 'OFFLINE';
      console.warn(`[AI Engine] ${aiError.message}`);
    }

    // Persist to MongoDB Atlas TelemetryLog with dynamic GPS fix
    if (isDatabaseConnected()) {
      try {
        await TelemetryLogModel.create({
          nodeId: telemetry.nodeId,
          sectorId: sector.id,
          timestamp: new Date(telemetry.timestamp),
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
          altitudeM: telemetry.altitudeM,
          gpsFix: telemetry.gpsFix,
          soilMoisturePct: telemetry.soilMoisturePct,
          tiltMagnitude: telemetry.tiltMagnitude,
          tiltDelta: telemetry.tiltDelta,
          accelRms: telemetry.accelRms,
          rain1hIntensityMm: weather.rain1hIntensityMm,
          rain24hCumulativeMm: weather.rain24hCumulativeMm,
          lsiScore: lsiResult ? lsiResult.lsiScore : 0,
          riskLevel: lsiResult ? lsiResult.riskLevel : 'LOW',
          wakeReason: data.wake_reason,
          isCrisisEvent: lsiResult ? (lsiResult.riskLevel === 'CRITICAL' || lsiResult.riskLevel === 'WARNING') : false,
          batteryPct: telemetry.batteryPct
        });
      } catch (e: any) {
        console.warn('⚠️ [MongoDB] TelemetryLog write error:', e.message);
      }
    }

    // Broadcast over WebSocket with dynamic GPS fix
    if (socketEmitter) {
      socketEmitter('TELEMETRY_STREAM', {
        telemetry,
        lsiResult,
        sector,
        aiStatus,
        wakeReason: data.wake_reason
      });
      socketEmitter('PHYSICAL_NODE_DATA', {
        telemetry,
        lsiResult,
        sector,
        aiStatus,
        wakeReason: data.wake_reason
      });
    }

    res.status(200).json({
      success: true,
      message: aiStatus === 'ONLINE'
        ? 'Telemetry ingested, GPS resolved, and evaluated by Python AI microservice.'
        : 'Telemetry ingested with live GPS. Python AI microservice is currently OFFLINE (prediction skipped).',
      aiStatus,
      gps: {
        latitude: telemetry.latitude,
        longitude: telemetry.longitude,
        altitudeM: telemetry.altitudeM
      },
      telemetry,
      lsiResult,
      alert: generatedAlert
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Invalid telemetry payload.' });
  }
};

export const getAllTelemetry = (req: Request, res: Response): void => {
  res.json({
    success: true,
    nodes: stateService.getAllTelemetry()
  });
};

export const getAllSectors = (req: Request, res: Response): void => {
  res.json({
    success: true,
    sectors: stateService.getAllSectors()
  });
};

export const getTelemetryHistory = async (req: Request, res: Response): Promise<void> => {
  const { nodeId, limit = 50 } = req.query;

  if (isDatabaseConnected()) {
    try {
      const query: any = {};
      if (nodeId) query.nodeId = nodeId;
      const history = await TelemetryLogModel.find(query)
        .sort({ timestamp: -1 })
        .limit(Number(limit));

      res.json({
        success: true,
        source: 'MongoDB_Atlas',
        count: history.length,
        history
      });
      return;
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error reading telemetry history:', e.message);
    }
  }

  res.json({
    success: true,
    source: 'In_Memory',
    history: stateService.getAllTelemetry()
  });
};
