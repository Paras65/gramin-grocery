import mongoose, { Schema, Document } from 'mongoose';

export type AnnouncementType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
export type AnnouncementTargetMode = 'ALL' | 'SELECTED';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  type: AnnouncementType;
  targetMode: AnnouncementTargetMode;
  targetStoreIds: mongoose.Types.ObjectId[];
  targetPlan: 'ALL' | 'FREE' | 'PRO';
  targetDistrict: string;
  isActive: boolean;
  expiresAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['INFO', 'WARNING', 'ALERT', 'SUCCESS'],
      default: 'INFO',
    },
    targetMode: {
      type: String,
      enum: ['ALL', 'SELECTED'],
      default: 'ALL',
      index: true,
    },
    targetStoreIds: [{ type: Schema.Types.ObjectId, ref: 'Tenant' }],
    targetPlan: {
      type: String,
      enum: ['ALL', 'FREE', 'PRO'],
      default: 'ALL',
    },
    targetDistrict: { type: String, default: 'ALL' },
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date },
    createdBy: { type: String, default: 'SUPER_ADMIN' },
  },
  { timestamps: true }
);

// Scalability index for fast fetching active announcements
AnnouncementSchema.index({ isActive: 1, targetMode: 1, createdAt: -1 });

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

