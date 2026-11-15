import { Schema, model, Document } from 'mongoose';
import { RiskLevel } from '../types/index.js';

export interface IBroadcastLogDocument extends Document {
  broadcastId: string;
  alertId: string;
  sectorId: string;
  sectorName: string;
  riskLevel: RiskLevel;
  channel: 'SMS' | 'EMAIL' | 'ALL';
  recipientCount: number;
  recipients: Array<{
    userId: string;
    phoneNumber?: string;
    email?: string;
    channel: 'SMS' | 'EMAIL';
    status: 'SENT' | 'FAILED';
    messageId?: string;
    errorMessage?: string;
    distanceKm: number;
  }>;
  message: {
    en: string;
    hi: string;
  };
  dispatchedAt: Date;
  provider: 'FAST2SMS' | 'RESEND' | 'NONE_CONFIGURED';
}

const BroadcastLogSchema = new Schema<IBroadcastLogDocument>(
  {
    broadcastId: { type: String, required: true, unique: true, index: true },
    alertId: { type: String, required: true, index: true },
    sectorId: { type: String, required: true, index: true },
    sectorName: { type: String, required: true },
    riskLevel: {
      type: String,
      enum: ['LOW', 'ADVISORY', 'WARNING', 'CRITICAL'],
      required: true
    },
    channel: {
      type: String,
      enum: ['SMS', 'EMAIL', 'ALL'],
      default: 'ALL'
    },
    recipientCount: { type: Number, default: 0 },
    recipients: [
      {
        userId: { type: String, required: true },
        phoneNumber: { type: String },
        email: { type: String },
        channel: { type: String, enum: ['SMS', 'EMAIL'], required: true },
        status: { type: String, enum: ['SENT', 'FAILED'], required: true },
        messageId: { type: String },
        errorMessage: { type: String },
        distanceKm: { type: Number, required: true }
      }
    ],
    message: {
      en: { type: String, required: true },
      hi: { type: String, required: true }
    },
    dispatchedAt: { type: Date, default: Date.now, index: true },
    provider: {
      type: String,
      enum: ['FAST2SMS', 'RESEND', 'NONE_CONFIGURED'],
      default: 'NONE_CONFIGURED'
    }
  },
  {
    timestamps: true
  }
);

export const BroadcastLogModel = model<IBroadcastLogDocument>('BroadcastLog', BroadcastLogSchema);
