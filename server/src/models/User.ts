import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  mobile: string;
  pinHash: string;
  role: 'OWNER' | 'CASHIER';
  isActive: boolean;
  lastLoginAt?: Date;
  comparePin(candidatePin: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    pinHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'CASHIER'], default: 'CASHIER', required: true },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Compound Unique Index: Mobile unique per tenant (and globally for login lookup)
UserSchema.index({ mobile: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

// Helper to compare 4-digit PIN securely
UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pinHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);

