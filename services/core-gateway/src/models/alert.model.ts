import { Schema, model, Document } from 'mongoose';
import { RiskLevel } from '../types/index.js';

export interface IAlertDocument extends Document {
  alertId: string;
  sectorId: string;
  sectorName: string;
  nodeId: string;
  timestamp: Date;
  riskLevel: RiskLevel;
  lsiScore: number;
  headline: string;
  descriptions: {
    en: string;
    hi: string;
    dogri: string;
    kashmiri: string;
  };
  sirenTriggered: boolean;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

const AlertSchema = new Schema<IAlertDocument>(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    sectorId: { type: String, required: true, index: true },
    sectorName: { type: String, required: true },
    nodeId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'ADVISORY', 'WARNING', 'CRITICAL'],
      required: true
    },
    lsiScore: { type: Number, required: true },
    headline: { type: String, required: true },
    descriptions: {
      en: { type: String, required: true },
      hi: { type: String, required: true },
      dogri: { type: String, required: true },
      kashmiri: { type: String, required: true }
    },
    sirenTriggered: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'ACTIVE',
      index: true
    },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  {
    timestamps: true
  }
);

// TTL Index: Resolved alerts are automatically deleted from MongoDB Atlas 48 hours (172800s) after resolution.
// When resolvedAt is undefined/null (ACTIVE alerts), MongoDB TTL will NOT expire them.
AlertSchema.index({ resolvedAt: 1 }, { expireAfterSeconds: 172800 });

export const AlertModel = model<IAlertDocument>('Alert', AlertSchema);
