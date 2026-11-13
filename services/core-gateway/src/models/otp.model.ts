import { Schema, model, Document, Types } from 'mongoose';

export interface IOtpDocument extends Document {
  email: string;
  user: Types.ObjectId;
  otpHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const OtpSchema = new Schema<IOtpDocument>(
  {
    email: {
      type: String,
      required: [true, 'email is required!'],
      lowercase: true,
      trim: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user is required!']
    },
    otpHash: {
      type: String,
      required: [true, 'otpHash is required!']
    }
  },
  { timestamps: true }
);

// Auto-expires after 300 seconds (5 minutes)
OtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

export const OtpModel = model<IOtpDocument>('Otp', OtpSchema);
