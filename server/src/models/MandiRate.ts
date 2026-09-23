import mongoose, { Schema, Document } from 'mongoose';

export type MandiRateTrend = 'STABLE' | 'RISING' | 'FALLING';

export interface IMandiRate extends Document {
  commodity: string;          // e.g., "शक्कर (Sugar)", "सोयाबीन तेल (Soybean Oil)"
  commodityKey: string;       // Normalized key for search/matching: e.g., "sugar", "soybean_oil", "toor_dal"
  category: 'staples' | 'pulses' | 'oils' | 'spices' | 'vegetables' | 'grains';
  unit: string;               // e.g., 'kg', 'liter', 'tin-15kg', 'bag-50kg', 'quintal'
  benchmarkRate: number;      // Official benchmark rate (₹)
  minRate: number;            // Minimum mandi prevailing rate (₹)
  maxRate: number;            // Maximum mandi prevailing rate (₹)
  trend: MandiRateTrend;      // STABLE, RISING, FALLING
  advisory?: string;          // Hindi advisory note, e.g., "नई आवक से भाव स्थिर हैं"
  scope: 'STATE_WIDE' | 'DISTRICT';
  district: string;           // 'ALL' for state-wide, or specific district (e.g., 'रायपुर')
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MandiRateSchema = new Schema<IMandiRate>(
  {
    commodity: {
      type: String,
      required: true,
      trim: true,
    },
    commodityKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['staples', 'pulses', 'oils', 'spices', 'vegetables', 'grains'],
      default: 'staples',
      index: true,
    },
    unit: {
      type: String,
      default: 'kg',
      trim: true,
    },
    benchmarkRate: {
      type: Number,
      required: true,
      min: 0,
    },
    minRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    trend: {
      type: String,
      enum: ['STABLE', 'RISING', 'FALLING'],
      default: 'STABLE',
    },
    advisory: {
      type: String,
      trim: true,
      default: '',
    },
    scope: {
      type: String,
      enum: ['STATE_WIDE', 'DISTRICT'],
      default: 'STATE_WIDE',
    },
    district: {
      type: String,
      default: 'ALL',
      index: true,
    },
    updatedBy: {
      type: String,
      default: 'Super Admin',
    },
  },
  {
    timestamps: true,
  }
);

// Composite index for fast district-wise lookup
MandiRateSchema.index({ district: 1, category: 1 });

export const MandiRate = mongoose.model<IMandiRate>('MandiRate', MandiRateSchema);

