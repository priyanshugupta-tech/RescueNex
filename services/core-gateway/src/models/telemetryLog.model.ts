import { Schema, model, Document } from 'mongoose';
import { RiskLevel } from '../types/index.js';

export interface ITelemetryLogDocument extends Document {
  nodeId: string;
  sectorId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  gpsFix: boolean;
  soilMoisturePct: number;
  temperatureC?: number;
  humidityPct?: number;
  tiltX?: number;
  tiltY?: number;
  tiltMagnitude: number;
  tiltDelta: number;
  accelRms: number;
  vibrationDetected?: boolean;
  rain1hIntensityMm: number;
  rain24hCumulativeMm: number;
  lsiScore: number;
  riskLevel: RiskLevel;
  wakeReason: 'TIMER_HEARTBEAT' | 'MOTION_INTERRUPT' | 'MANUAL';
  isCrisisEvent: boolean;
  batteryPct?: number;
}

const TelemetryLogSchema = new Schema<ITelemetryLogDocument>(
  {
    nodeId: { type: String, required: true, index: true },
    sectorId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitudeM: { type: Number },
    gpsFix: { type: Boolean, default: true },
    soilMoisturePct: { type: Number, required: true },
    temperatureC: { type: Number, default: 15.0 },
    humidityPct: { type: Number, default: 70.0 },
    tiltX: { type: Number, default: 0 },
    tiltY: { type: Number, default: 0 },
    tiltMagnitude: { type: Number, required: true },
    tiltDelta: { type: Number, required: true },
    accelRms: { type: Number, default: 1.0 },
    vibrationDetected: { type: Boolean, default: false },
    rain1hIntensityMm: { type: Number, default: 0 },
    rain24hCumulativeMm: { type: Number, default: 0 },
    lsiScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'ADVISORY', 'WARNING', 'CRITICAL'],
      required: true
    },
    wakeReason: {
      type: String,
      enum: ['TIMER_HEARTBEAT', 'MOTION_INTERRUPT', 'MANUAL'],
      default: 'TIMER_HEARTBEAT'
    },
    isCrisisEvent: { type: Boolean, default: false, index: true },
    batteryPct: { type: Number, default: 100 }
  },
  {
    timestamps: true
  }
);

// Expire routine normal logs after 30 days to keep Atlas storage lean, keep crisis events permanently
TelemetryLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60, partialFilterExpression: { isCrisisEvent: false } }
);

export const TelemetryLogModel = model<ITelemetryLogDocument>('TelemetryLog', TelemetryLogSchema);
