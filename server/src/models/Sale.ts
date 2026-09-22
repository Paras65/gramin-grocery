import mongoose, { Schema, Document } from 'mongoose';
import { autoTenantPlugin } from '../plugins/autoTenantPlugin.js';

export interface ISaleItem {
  productId?: string;
  name: string;
  hindiName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface ISale extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientSaleId: string;
  timestamp: Date;
  items: ISaleItem[];
  totalAmount: number;
  paymentMode: 'CASH' | 'UDHAAR' | 'UPI';
  customerId?: string;
  customerName?: string;
  createdAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    clientSaleId: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    items: [
      {
        productId: { type: String },
        name: { type: String, required: true },
        hindiName: { type: String },
        quantity: { type: Number, required: true },
        unit: { type: String, required: true },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMode: { type: String, enum: ['CASH', 'UDHAAR', 'UPI'], required: true },
    customerId: { type: String },
    customerName: { type: String },
  },
  { timestamps: true }
);

SaleSchema.plugin(autoTenantPlugin);

// Compound Indexes for fast daily counter reports & sales history
SaleSchema.index({ tenantId: 1, clientSaleId: 1 }, { unique: true });
SaleSchema.index({ tenantId: 1, timestamp: -1 });
SaleSchema.index({ tenantId: 1, paymentMode: 1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);

