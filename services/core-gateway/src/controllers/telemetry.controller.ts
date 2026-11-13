import { Request, Response } from 'express';
import { z } from 'zod';
import { stateService } from '../services/state.service.js';
import { aiService } from '../services/ai.service.js';
import { alertService } from '../services/alert.service.js';
import { NodeTelemetry, LSIResult } from '../types/index.js';
import { TelemetryLogModel } from '../models/telemetryLog.model.js';
import { isDatabaseConnected } from '../config/database.js';

// Schema for incoming telemetry from physical ESP32
const telemetryIngestSchema = z.object({
  node_id: z.string().default('NODE_BANIHAL_01'),
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

    // Map physical node to Banihal Sector
    const sector = stateService.getSector('SECTOR_BANIHAL') || stateService.getAllSectors()[0];
    const weather = stateService.getWeather(sector.id) || {
      sectorId: sector.id,
      timestamp: Date.now(),
      rain1hIntensityMm: 0,
      rain24hCumulativeMm: 12.0,
      antecedentRain7dMm: 45.0,
      cloudburstRisk: false,
      temperatureC: 15.0,
      relativeHumidityPct: 65.0,
      weatherCode: 0
    };

    // Attempt AI Risk Evaluation via Python microservice
    let lsiResult: LSIResult | null = null;
    let aiStatus = 'ONLINE';
    let generatedAlert = null;

    try {
      lsiResult = await aiService.evaluateRisk({
        nodeId: telemetry.nodeId,
        sectorId: sector.id,
        latitude: sector.latitude,
        longitude: sector.longitude,
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

    // Persist to MongoDB Atlas TelemetryLog
    if (isDatabaseConnected()) {
      try {
        await TelemetryLogModel.create({
          nodeId: telemetry.nodeId,
          sectorId: sector.id,
          timestamp: new Date(telemetry.timestamp),
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

    // Broadcast over WebSocket to active UI clients
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
        ? 'Telemetry ingested and evaluated by Python AI microservice.'
        : 'Telemetry ingested. Python AI microservice is currently OFFLINE (prediction skipped).',
      aiStatus,
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
