import { Schema, model, Document } from 'mongoose';

export interface ISessionDocument extends Document {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  isValid: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: String, required: true, index: true },
    refreshToken: { type: String, required: true, unique: true, index: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    isValid: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // Auto-deleted by Mongo TTL when expired
  },
  {
    timestamps: true
  }
);

export const SessionModel = model<ISessionDocument>('Session', SessionSchema);
