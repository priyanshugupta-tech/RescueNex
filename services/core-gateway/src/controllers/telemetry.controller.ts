import { Request, Response } from 'express';
import { z } from 'zod';
import { stateService } from '../services/state.service.js';
import { aiService } from '../services/ai.service.js';
import { alertService } from '../services/alert.service.js';
import { weatherService } from '../services/weather.service.js';
import { NodeTelemetry, LSIResult, MountainSector } from '../types/index.js';
import { TelemetryLogModel } from '../models/telemetryLog.model.js';
import { AlertModel } from '../models/alert.model.js';
import { isDatabaseConnected } from '../config/database.js';
import { logEspTelemetry } from '../services/logger.service.js';

// Schema for incoming telemetry from physical ESP32 (Hardware nodes send their own GPS coordinates)
const telemetryIngestSchema = z.object({
  node_id: z.string().min(1, 'node_id is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude_m: z.number().optional().default(1500),
  gps_fix: z.boolean().optional().default(true),

  // Soil & IMU Telemetry
  soil_moisture_pct: z.number().min(0).max(100),
  temperature_c: z.number().optional().default(15.0),
  humidity_pct: z.number().optional().default(70.0),
  tilt_x: z.number().default(0),
  tilt_y: z.number().default(0),
  tilt_delta: z.number().optional(),
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

    const finalLat = data.latitude;
    const finalLon = data.longitude;
    const finalAlt = data.altitude_m;

    const tiltMagnitude = Number(Math.sqrt(data.tilt_x * data.tilt_x + data.tilt_y * data.tilt_y).toFixed(2));
    const previous = stateService.getTelemetry(data.node_id);
    let tiltDelta = 0;
    if (data.tilt_delta !== undefined) {
      tiltDelta = Number(data.tilt_delta.toFixed(2));
    } else if (previous) {
      tiltDelta = Number(Math.abs(tiltMagnitude - previous.tiltMagnitude).toFixed(2));
    } else {
      // First reading from node: if tilt is already elevated (> 2.0 deg), account for initial deformation
      tiltDelta = tiltMagnitude > 2.0 ? Number((tiltMagnitude * 0.25).toFixed(2)) : 0;
    }

    const telemetry: NodeTelemetry = {
      nodeId: data.node_id,
      timestamp: Date.now(),
      latitude: finalLat,
      longitude: finalLon,
      altitudeM: finalAlt,
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

    // Resolve dynamic mountain sector based on stationary hardware position
    const sector = resolveSectorForGPS(finalLat, finalLon);

    // Dynamic Weather Sync for the Node's exact location
    const weather = await weatherService.syncSectorWeather(sector.id, finalLat, finalLon);

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
        // Only auto-resolve transient ADVISORY alerts from this same node; WARNING, CRITICAL, and OPERATOR dispatches require official resolution
        const transientAlert = stateService.getActiveAlerts().find(
          (a) => a.sectorId === sector.id && a.nodeId === telemetry.nodeId && a.riskLevel === 'ADVISORY'
        );
        if (transientAlert) {
          const resolvedAt = new Date();
          stateService.resolveAlert(transientAlert.id);
          if (isDatabaseConnected()) {
            AlertModel.findOneAndUpdate(
              { alertId: transientAlert.id },
              { status: 'RESOLVED', resolvedAt }
            ).catch((e: any) => console.warn('⚠️ [MongoDB] Error auto-resolving advisory alert:', e.message));
          }
        }
      }
    } catch (aiError: any) {
      aiStatus = 'OFFLINE';
      console.warn(`[AI Engine] ${aiError.message}. Seamlessly engaging geotechnical threshold fallback.`);

      // Deterministic threshold calculation based on physical geotechnical parameters
      const tilt = telemetry.tiltMagnitude || 0;
      const tiltDelta = telemetry.tiltDelta || 0;
      const moisture = telemetry.soilMoisturePct || 0;
      const rain1h = weather.rain1hIntensityMm || 0;
      const vibration = Boolean(telemetry.vibrationDetected);

      let fallbackRiskLevel: 'LOW' | 'WARNING' | 'CRITICAL' = 'LOW';
      let fallbackLsiScore = 15;

      if (tilt >= 4.0 || tiltDelta >= 2.0 || (vibration && tilt >= 2.0) || rain1h >= 25.0) {
        fallbackRiskLevel = 'CRITICAL';
        fallbackLsiScore = Math.min(100, Math.round(75 + (tilt * 0.3) + (moisture * 0.15)));
      } else if (tilt >= 2.0 || tiltDelta >= 1.0 || moisture >= 75 || rain1h >= 10.0) {
        fallbackRiskLevel = 'WARNING';
        fallbackLsiScore = Math.min(74, Math.round(45 + (tilt * 2.0) + (moisture * 0.2)));
      }

      lsiResult = {
        lsiScore: fallbackLsiScore,
        riskLevel: fallbackRiskLevel,
        confidence: 0.95,
        anomalyDetected: fallbackRiskLevel !== 'LOW',
        isFalseAlarm: false,
        triggerSiren: fallbackRiskLevel === 'CRITICAL',
        recommendation: fallbackRiskLevel === 'CRITICAL' ? 'EVACUATE_IMMEDIATELY' : fallbackRiskLevel === 'WARNING' ? 'PREPARE_EVACUATION' : 'MONITOR',
        explanation: {
          soilFactor: moisture,
          tiltFactor: tiltDelta,
          rainFactor: rain1h
        }
      };

      if (lsiResult.riskLevel !== 'LOW') {
        generatedAlert = await alertService.triggerEmergencyAlert(sector, telemetry.nodeId, lsiResult);
      } else {
        stateService.updateSectorRisk(sector.id, 'LOW', lsiResult.lsiScore);
      }
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

    // Secondary Atlas DB Ingestion via Winston Logger (rescuenex_esp32_logs)
    const logEvent = lsiResult?.riskLevel === 'CRITICAL' 
      ? 'EVALUATED_CRITICAL' 
      : lsiResult?.riskLevel === 'WARNING' 
      ? 'EVALUATED_WARNING' 
      : 'EVALUATED_SAFE';

    logEspTelemetry(telemetry.nodeId, logEvent, {
      sectorId: sector.id,
      sectorName: sector.name,
      coords: { lat: telemetry.latitude, lon: telemetry.longitude, alt: telemetry.altitudeM },
      geotechnical: {
        soilMoisturePct: telemetry.soilMoisturePct,
        tiltX: data.tilt_x,
        tiltY: data.tilt_y,
        tiltMagnitude: telemetry.tiltMagnitude,
        tiltDelta: telemetry.tiltDelta,
        accelRms: telemetry.accelRms,
        vibrationDetected: data.vibration_detected
      },
      weatherSnapshot: {
        rain1hIntensityMm: weather.rain1hIntensityMm,
        rain24hCumulativeMm: weather.rain24hCumulativeMm,
        tempC: data.temperature_c,
        humidityPct: data.humidity_pct
      },
      aiEvaluation: {
        lsiScore: lsiResult ? lsiResult.lsiScore : 0,
        riskLevel: lsiResult ? lsiResult.riskLevel : 'LOW',
        timeToFailureHours: lsiResult ? lsiResult.timeToFailureHours : null,
        aiStatus
      },
      hardwareStatus: {
        wakeReason: data.wake_reason,
        batteryPct: telemetry.batteryPct,
        gpsFix: data.gps_fix
      }
    });

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

export const getAllTelemetry = async (req: Request, res: Response): Promise<void> => {
  const memNodes = stateService.getAllTelemetry();
  if (memNodes.length > 0) {
    res.json({
      success: true,
      nodes: memNodes
    });
    return;
  }

  // Restore latest distinct telemetry records from MongoDB Atlas if in-memory state is empty
  if (isDatabaseConnected()) {
    try {
      const distinctNodeIds = await TelemetryLogModel.distinct('nodeId');
      const restoredNodes: NodeTelemetry[] = [];

      for (const id of distinctNodeIds) {
        const latest = await TelemetryLogModel.findOne({ nodeId: id }).sort({ timestamp: -1 });
        if (latest) {
          const nodeItem: NodeTelemetry = {
            nodeId: latest.nodeId,
            timestamp: new Date(latest.timestamp).getTime(),
            latitude: latest.latitude,
            longitude: latest.longitude,
            altitudeM: latest.altitudeM || 1500,
            gpsFix: true,
            soilMoisturePct: latest.soilMoisturePct,
            temperatureC: latest.temperatureC ?? 15,
            humidityPct: latest.humidityPct ?? 70,
            tiltX: latest.tiltX ?? 0,
            tiltY: latest.tiltY ?? 0,
            tiltMagnitude: latest.tiltMagnitude,
            tiltDelta: latest.tiltDelta,
            accelRms: latest.accelRms,
            vibrationDetected: latest.vibrationDetected ?? false,
            batteryPct: latest.batteryPct,
            isPhysicalNode: true
          };
          stateService.setTelemetry(nodeItem);
          restoredNodes.push(nodeItem);
        }
      }

      if (restoredNodes.length > 0) {
        res.json({
          success: true,
          nodes: restoredNodes
        });
        return;
      }
    } catch (e: any) {
      console.warn('⚠️ [MongoDB] Error restoring active telemetry nodes:', e.message);
    }
  }

  res.json({
    success: true,
    nodes: []
  });
};

export const getAllSectors = (req: Request, res: Response): void => {
  const sectors = stateService.getAllSectors().map((sec) => {
    const score = sec.lsiScore !== undefined ? sec.lsiScore : (sec.currentLsiScore !== undefined ? sec.currentLsiScore : 18.0);
    return {
      ...sec,
      lsiScore: score,
      currentLsiScore: score
    };
  });

  res.json({
    success: true,
    sectors
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
