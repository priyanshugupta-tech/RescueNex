import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  fullName?: string;
  email: string;
  password?: string;
  role: UserRole;
  agency?: 'RESCUENEX' | 'SDRF' | 'BRO' | 'COMMUTER';
  phoneNumber?: string;
  isPhoneVerified?: boolean;
  phoneOtp?: string;
  phoneOtpExpiresAt?: Date;
  isPhonePromptDismissed?: boolean;
  phoneUpdateHistory?: Date[];
  smsAlertsEnabled?: boolean;
  whatsappAlertsEnabled?: boolean;
  preferredLanguage?: 'en' | 'hi' | 'dogri' | 'kashmiri';
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    cityName?: string;
    updatedAt: Date;
  };
  isVerified: boolean;
  verificationExpiresAt?: Date;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  authProvider: 'LOCAL' | 'GOOGLE';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      required: [true, 'email is required!'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    password: {
      type: String,
      required: [true, 'password is required!']
    },
    role: {
      type: String,
      enum: ['ADMIN', 'OPERATOR', 'SCOUT', 'PUBLIC'],
      default: 'PUBLIC',
      required: true
    },
    agency: {
      type: String,
      enum: ['RESCUENEX', 'SDRF', 'BRO', 'COMMUTER'],
      default: 'COMMUTER'
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    phoneOtp: {
      type: String
    },
    phoneOtpExpiresAt: {
      type: Date
    },
    isPhonePromptDismissed: {
      type: Boolean,
      default: false
    },
    phoneUpdateHistory: {
      type: [Date],
      default: []
    },
    smsAlertsEnabled: {
      type: Boolean,
      default: true
    },
    whatsappAlertsEnabled: {
      type: Boolean,
      default: true
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'hi', 'dogri', 'kashmiri'],
      default: 'hi'
    },
    lastKnownLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      cityName: { type: String },
      updatedAt: { type: Date }
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationExpiresAt: {
      type: Date
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    authProvider: {
      type: String,
      enum: ['LOCAL', 'GOOGLE'],
      default: 'LOCAL'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.phoneOtp;
        delete ret.phoneOtpExpiresAt;
        return ret;
      }
    }
  }
);

// Non-required unique index on phoneNumber (only enforces uniqueness when phoneNumber exists and is non-empty)
UserSchema.index(
  { phoneNumber: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { phoneNumber: { $type: 'string', $gt: '' } }
  }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
