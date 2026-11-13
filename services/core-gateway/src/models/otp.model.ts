import { Schema, model, Document } from 'mongoose';

export interface IOtpDocument extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const OtpSchema = new Schema<IOtpDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // Auto-deleted by Mongo TTL when expired
  },
  {
    timestamps: true
  }
);

export const OtpModel = model<IOtpDocument>('Otp', OtpSchema);
