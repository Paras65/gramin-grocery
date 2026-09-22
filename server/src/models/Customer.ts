import mongoose, { Schema, Document } from 'mongoose';
import { autoTenantPlugin } from '../plugins/autoTenantPlugin.js';

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientUUID: string;
  name: string;
  phone: string;
  para: string;
  balanceDue: number;
  dueDate?: Date;
  dueReason?: 'KHARIF_DHAN' | 'MONTHLY_DBT' | 'WEEKLY_HAAT' | 'OTHER';
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    clientUUID: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    para: { type: String, required: true, trim: true },
    balanceDue: { type: Number, default: 0 },
    dueDate: { type: Date },
    dueReason: {
      type: String,
      enum: ['KHARIF_DHAN', 'MONTHLY_DBT', 'WEEKLY_HAAT', 'OTHER'],
      default: 'KHARIF_DHAN',
    },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Apply auto-tenant plugin for strict isolation
CustomerSchema.plugin(autoTenantPlugin);

// Compound Indexes for Performance & Data Integrity
// 1. Phone is UNIQUE per store/tenant (Store A and Store B can both have customer '98261XXXXX')
CustomerSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
// 2. ClientUUID is UNIQUE per store for idempotent sync
CustomerSchema.index({ tenantId: 1, clientUUID: 1 }, { unique: true });
// 3. Fast Para/Mohalla grouping filter in village
CustomerSchema.index({ tenantId: 1, para: 1 });
// 4. Fast sorting of highest debt customers
CustomerSchema.index({ tenantId: 1, balanceDue: -1 });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

