import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  storeName: string;
  ownerName: string;
  phone: string;
  address: {
    village: string;
    mohalla?: string;
    block: string;
    district: string;
    state: string;
    pincode?: string;
  };
  settings: {
    language: 'hi' | 'en';
    harvestCycles: string[];
    lowStockThresholdDefault: number;
  };
  subscription: {
    plan: 'FREE' | 'BASIC' | 'PRO';
    status: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
    planExpiryDate?: Date;
    startDate?: Date;
    pausedAt?: Date;
    remainingDaysOnPause?: number;
    pauseReason?: string;
    isTrial?: boolean;
  };
  referral?: {
    code: string;
    referredBy?: string;
    referralCount: number;
    bonusDaysEarned: number;
  };
  featureOverrides?: {
    haatMode?: boolean;
    thermalPrinting?: boolean;
    voiceBilling?: boolean;
    cameraScanner?: boolean;
    spoilageGuard?: boolean;
    mandiPlanner?: boolean;
  };
  quotaOverrides?: {
    maxProducts?: number;
    maxCustomers?: number;
    maxMonthlySales?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    storeName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true, index: true },
    address: {
      village: { type: String, required: true, trim: true },
      mohalla: { type: String, trim: true },
      block: { type: String, required: true, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, default: 'Chhattisgarh' },
      pincode: { type: String },
    },
    settings: {
      language: { type: String, enum: ['hi', 'en'], default: 'hi' },
      harvestCycles: { type: [String], default: ['KHARIF_DHAN', 'MONTHLY_DBT'] },
      lowStockThresholdDefault: { type: Number, default: 5 },
    },
    subscription: {
      plan: { type: String, enum: ['FREE', 'BASIC', 'PRO'], default: 'FREE' },
      status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'PAUSED'], default: 'ACTIVE' },
      planExpiryDate: { type: Date },
      startDate: { type: Date },
      pausedAt: { type: Date },
      remainingDaysOnPause: { type: Number },
      pauseReason: { type: String, trim: true },
      isTrial: { type: Boolean, default: false },
    },
    referral: {
      code: { type: String, unique: true, sparse: true, trim: true, uppercase: true, index: true },
      referredBy: { type: String, trim: true },
      referralCount: { type: Number, default: 0 },
      bonusDaysEarned: { type: Number, default: 0 },
    },
    featureOverrides: {
      haatMode: { type: Boolean },
      thermalPrinting: { type: Boolean },
      voiceBilling: { type: Boolean },
      cameraScanner: { type: Boolean },
      spoilageGuard: { type: Boolean },
      mandiPlanner: { type: Boolean },
    },
    quotaOverrides: {
      maxProducts: { type: Number },
      maxCustomers: { type: Number },
      maxMonthlySales: { type: Number },
    },
  },
  { timestamps: true }
);

TenantSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
