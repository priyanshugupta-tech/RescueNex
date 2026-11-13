import { Request, Response } from 'express';
import { z } from 'zod';
import { stateService } from '../services/state.service.js';
import { aiService } from '../services/ai.service.js';
import { alertService } from '../services/alert.service.js';
import { simulationService } from '../services/simulation.service.js';
import { NodeTelemetry } from '../types/index.js';

// Schema for incoming telemetry from physical ESP32 or simulated gateway
const telemetryIngestSchema = z.object({
  node_id: z.string().default('NODE_BANIHAL_01'),
  soil_moisture_pct: z.number().min(0).max(100),
  temperature_c: z.number().optional().default(15.0),
  humidity_pct: z.number().optional().default(70.0),
  tilt_x: z.number().default(0),
  tilt_y: z.number().default(0),
  accel_rms: z.number().optional().default(1.0),
  vibration_detected: z.boolean().optional().default(false),
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

    // Store in-memory state
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

    // AI Dynamic Risk Evaluation (Fuses ESP32 + IMD Weather)
    const lsiResult = await aiService.evaluateRisk({
      nodeId: telemetry.nodeId,
      sectorId: sector.id,
      latitude: sector.latitude,
      longitude: sector.longitude,
      telemetry,
      weather
    });

    // Check if alert escalation needed
    let generatedAlert = null;
    if (lsiResult.riskLevel !== 'LOW') {
      generatedAlert = alertService.triggerEmergencyAlert(sector, telemetry.nodeId, lsiResult);
    } else {
      stateService.updateSectorRisk(sector.id, 'LOW', lsiResult.lsiScore);
    }

    // Broadcast over WebSocket to active UI clients
    if (socketEmitter) {
      socketEmitter('TELEMETRY_STREAM', {
        telemetry,
        lsiResult,
        sector
      });
      socketEmitter('PHYSICAL_NODE_DATA', {
        telemetry,
        lsiResult,
        sector
      });
    }

    res.status(200).json({
      success: true,
      message: 'Telemetry ingested and evaluated successfully.',
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

export const triggerDemoCrisis = async (req: Request, res: Response): Promise<void> => {
  const sectorId = req.body.sector_id || 'SECTOR_RAMBAN';
  await simulationService.injectDemoCrisisEvent(sectorId);
  res.json({
    success: true,
    message: `Injected simulated landslide crisis for sector '${sectorId}'.`
  });
};
