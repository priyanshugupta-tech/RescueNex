import { Schema, model, Document } from 'mongoose';
import { RiskLevel } from '../types/index.js';

export interface ISectorDocument extends Document {
  sectorId: string;
  name: string;
  highway: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  sirenActive: boolean;
  currentRiskLevel: RiskLevel;
  currentLsiScore: number;
  installedNodes: string[];
  baselineThresholds: {
    maxSoilMoisture: number;
    maxTiltAngle: number;
    maxRainRateMmHr: number;
  };
}

const SectorSchema = new Schema<ISectorDocument>(
  {
    sectorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    highway: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    elevationM: { type: Number, required: true },
    sirenActive: { type: Boolean, default: false },
    currentRiskLevel: {
      type: String,
      enum: ['LOW', 'ADVISORY', 'WARNING', 'CRITICAL'],
      default: 'LOW'
    },
    currentLsiScore: { type: Number, default: 0.1 },
    installedNodes: [{ type: String }],
    baselineThresholds: {
      maxSoilMoisture: { type: Number, default: 75.0 },
      maxTiltAngle: { type: Number, default: 2.5 },
      maxRainRateMmHr: { type: Number, default: 25.0 }
    }
  },
  {
    timestamps: true
  }
);

export const SectorModel = model<ISectorDocument>('Sector', SectorSchema);
