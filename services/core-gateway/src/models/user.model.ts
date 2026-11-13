import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUserDocument extends Document {
  id: string;
  name: string;
  username: string;
  email?: string;
  passwordHash: string;
  role: UserRole;
  agency?: 'SDMA' | 'SDRF' | 'BRO' | 'COMMUTER';
  phone?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
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
    phone: { type: String, trim: true },
    isApproved: { type: Boolean, default: false, index: true },
    approvedBy: { type: String },
    approvedAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
