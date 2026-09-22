import mongoose, { Schema, Document } from 'mongoose';
import { autoTenantPlugin } from '../plugins/autoTenantPlugin.js';

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientUUID: string;
  name: string;
  hindiName: string;
  category: 'staples' | 'pulses' | 'oils' | 'spices' | 'snacks' | 'hygiene' | 'dairy' | 'rural_special';
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  unit: 'kg' | 'g' | 'liter' | 'packet' | 'piece' | 'pouch';
  minStockThreshold: number;
  isLoose: boolean;
  expiryDate?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    clientUUID: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    hindiName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['staples', 'pulses', 'oils', 'spices', 'snacks', 'hygiene', 'dairy', 'rural_special'],
      required: true,
    },
    purchasePrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    stockQty: { type: Number, required: true, default: 0 },
    unit: {
      type: String,
      enum: ['kg', 'g', 'liter', 'packet', 'piece', 'pouch'],
      required: true,
    },
    minStockThreshold: { type: Number, default: 5 },
    isLoose: { type: Boolean, default: false },
    expiryDate: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.plugin(autoTenantPlugin);

// Compound Indexes for fast counter POS & Mandi Restock queries
ProductSchema.index({ tenantId: 1, clientUUID: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ tenantId: 1, stockQty: 1 }); // Mandi restock planner low stock radar

export const Product = mongoose.model<IProduct>('Product', ProductSchema);

