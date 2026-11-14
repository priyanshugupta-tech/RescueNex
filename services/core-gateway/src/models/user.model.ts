import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUserDocument extends Document {
  _id: Types.ObjectId;
  fullName?: string;
  userName: string;
  email: string;
  password?: string;
  role: UserRole;
  agency?: 'SDMA' | 'SDRF' | 'BRO' | 'COMMUTER';
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
    userName: {
      type: String,
      required: [true, 'userName is required!'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
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
      enum: ['SDMA', 'SDRF', 'BRO', 'COMMUTER'],
      default: 'COMMUTER'
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
        return ret;
      }
    }
  }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
