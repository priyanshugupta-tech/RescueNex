import { Schema, model, Document } from 'mongoose';

export interface IRateLimitDocument extends Document {
  key: string;              // e.g., 'login:username' or 'otp:email'
  attempts: number;
  firstAttemptAt: Date;
  lockUntil: Date | null;
  updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimitDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    attempts: { type: Number, default: 0 },
    firstAttemptAt: { type: Date, default: Date.now },
    lockUntil: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

// Auto-prune expired rate limits from Atlas after 45 minutes of inactivity
RateLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 45 * 60 });

export const RateLimitModel = model<IRateLimitDocument>('RateLimit', RateLimitSchema);
