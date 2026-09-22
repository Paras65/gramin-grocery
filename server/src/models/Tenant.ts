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
    status: 'ACTIVE' | 'EXPIRED';
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
      status: { type: String, enum: ['ACTIVE', 'EXPIRED'], default: 'ACTIVE' },
    },
  },
  { timestamps: true }
);

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);
