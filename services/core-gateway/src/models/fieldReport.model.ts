import { Schema, model, Document } from 'mongoose';
import { HazardType, ReportSeverity, UserRole } from '../types/index.js';

export interface IFieldReportDocument extends Document {
  reportId: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  alertId?: string;
  sectorId?: string;
  hazardType: HazardType;
  severity: ReportSeverity;
  latitude: number;
  longitude: number;
  cityName?: string;
  description: string;
  reportedAt: Date;
  syncedAt: Date;
  status: 'SUBMITTED' | 'VERIFIED' | 'DISMISSED';
  source: 'ONLINE' | 'OFFLINE_SYNC';
}

const FieldReportSchema = new Schema<IFieldReportDocument>(
  {
    reportId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    alertId: { type: String, index: true },
    sectorId: { type: String, index: true },
    userName: { type: String, default: 'Anonymous Commuter' },
    userRole: {
      type: String,
      enum: ['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC'],
      default: 'PUBLIC'
    },
    hazardType: {
      type: String,
      enum: ['ROCKFALL', 'CRACK', 'WATER_LOGGING', 'DEBRIS_FLOW', 'ROAD_BLOCK'],
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    cityName: { type: String },
    description: { type: String, required: true },
    reportedAt: { type: Date, required: true, index: true },
    syncedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['SUBMITTED', 'VERIFIED', 'DISMISSED'],
      default: 'SUBMITTED',
      index: true
    },
    source: {
      type: String,
      enum: ['ONLINE', 'OFFLINE_SYNC'],
      default: 'ONLINE'
    }
  },
  {
    timestamps: true
  }
);

// Compound geospatial index for corridor proximity queries
FieldReportSchema.index({ latitude: 1, longitude: 1 });

export const FieldReportModel = model<IFieldReportDocument>('FieldReport', FieldReportSchema);
