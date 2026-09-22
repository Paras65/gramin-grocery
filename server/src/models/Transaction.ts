import mongoose, { Schema, Document } from 'mongoose';
import { autoTenantPlugin } from '../plugins/autoTenantPlugin.js';

export interface ITransaction extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientTxnId: string; // Idempotency key generated offline on client
  customerId: string; // Client UUID of customer
  type: 'UDHAAR' | 'JAMA';
  amount: number;
  timestamp: Date;
  note?: string;
  billItemsSummary?: string;
  operatorId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    clientTxnId: { type: String, required: true },
    customerId: { type: String, required: true, index: true },
    type: { type: String, enum: ['UDHAAR', 'JAMA'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    timestamp: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true },
    billItemsSummary: { type: String, trim: true },
    operatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TransactionSchema.plugin(autoTenantPlugin);

// Compound Unique Index: Prevents duplicate transactions on dropped cellular connections
TransactionSchema.index({ tenantId: 1, clientTxnId: 1 }, { unique: true });
// Compound Index: Rapid fetch of customer's historical ledger
TransactionSchema.index({ tenantId: 1, customerId: 1, timestamp: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

