import mongoose, { Schema, Document } from 'mongoose';

export type PaymentClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IPaymentClaim extends Document {
  tenantId: mongoose.Types.ObjectId;
  storeName: string;
  ownerName: string;
  phone: string;
  amount: number;
  planDurationMonths: number;
  utrNumber: string;
  status: PaymentClaimStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentClaimSchema = new Schema<IPaymentClaim>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    storeName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    planDurationMonths: { type: Number, required: true, default: 1 },
    utrNumber: { type: String, required: true, trim: true, uppercase: true },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    approvedBy: { type: String },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for fast admin querying and deduplication
PaymentClaimSchema.index({ utrNumber: 1, status: 1 });
PaymentClaimSchema.index({ tenantId: 1, status: 1 });
PaymentClaimSchema.index({ status: 1, createdAt: -1 });

export const PaymentClaim = mongoose.model<IPaymentClaim>('PaymentClaim', PaymentClaimSchema);

