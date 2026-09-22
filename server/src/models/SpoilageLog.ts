import mongoose, { Schema, Document } from 'mongoose';
import { autoTenantPlugin } from '../plugins/autoTenantPlugin.js';

export interface ISpoilageLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientSpoilageId: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: 'POWER_CUT' | 'HEAT_DAMAGE' | 'EXPIRED' | 'RODENT_PEST' | 'OTHER';
  estimatedLoss: number;
  timestamp: Date;
  note?: string;
  createdAt: Date;
}

const SpoilageLogSchema = new Schema<ISpoilageLog>(
  {
    clientSpoilageId: { type: String, required: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    reason: {
      type: String,
      enum: ['POWER_CUT', 'HEAT_DAMAGE', 'EXPIRED', 'RODENT_PEST', 'OTHER'],
      required: true,
    },
    estimatedLoss: { type: Number, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

SpoilageLogSchema.plugin(autoTenantPlugin);

SpoilageLogSchema.index({ tenantId: 1, clientSpoilageId: 1 }, { unique: true });
SpoilageLogSchema.index({ tenantId: 1, reason: 1 });
SpoilageLogSchema.index({ tenantId: 1, timestamp: -1 });

export const SpoilageLog = mongoose.model<ISpoilageLog>('SpoilageLog', SpoilageLogSchema);

