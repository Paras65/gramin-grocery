import mongoose, { Schema, Document } from 'mongoose';

export interface IVoucher extends Document {
  code: string;
  durationMonths: number;
  isRedeemed: boolean;
  redeemedByTenantId?: mongoose.Types.ObjectId;
  redeemedByStoreName?: string;
  redeemedAt?: Date;
  createdBy: string;
  note?: string;
  campaign?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherSchema = new Schema<IVoucher>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      enum: [1, 3, 12],
      default: 1,
    },
    isRedeemed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    redeemedByTenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      index: true,
    },
    redeemedByStoreName: {
      type: String,
      trim: true,
    },
    redeemedAt: {
      type: Date,
    },
    createdBy: {
      type: String,
      required: true,
      default: 'SUPER_ADMIN',
    },
    note: {
      type: String,
      trim: true,
    },
    campaign: {
      type: String,
      trim: true,
      index: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast admin querying and redemption lookup
VoucherSchema.index({ code: 1, isRedeemed: 1 });
VoucherSchema.index({ isRedeemed: 1, createdAt: -1 });

export const Voucher = mongoose.model<IVoucher>('Voucher', VoucherSchema);
