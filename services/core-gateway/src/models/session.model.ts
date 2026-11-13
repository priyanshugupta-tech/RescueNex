import { Schema, model, Document, Types } from 'mongoose';

export interface ISessionDocument extends Document {
  user: Types.ObjectId;
  ip: string;
  userAgent: string;
  refreshToken: string; // SHA-256 hashed
  revoked: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user is required!']
    },
    ip: {
      type: String,
      required: [true, 'ip is required!']
    },
    userAgent: {
      type: String,
      required: [true, 'userAgent is required!']
    },
    refreshToken: {
      type: String,
      required: [true, 'refreshToken is required!'],
      unique: true,
      index: true
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Prune revoked sessions after 24 hours
SessionSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 86400, partialFilterExpression: { revoked: true } }
);

// Expire active sessions after 10 days
SessionSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 10 * 24 * 60 * 60, partialFilterExpression: { revoked: false } }
);

export const SessionModel = model<ISessionDocument>('Session', SessionSchema);
