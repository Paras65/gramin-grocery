import mongoose, { Schema, Document } from 'mongoose';

export type SecurityEventType = 
  | 'STORE_REGISTRATION'
  | 'LOGIN'
  | 'FAILED_LOGIN'
  | 'PAYMENT_CLAIM'
  | 'SUSPICIOUS_PROXY'
  | 'ADMIN_ACTION';

export type SecurityRiskLevel = 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK' | 'FRAUD';

export interface ISecurityAuditLog extends Document {
  tenantId?: mongoose.Types.ObjectId;
  storeName?: string;
  ownerPhone?: string;
  eventType: SecurityEventType;
  ipAddress: string;
  userAgent?: string;
  isProxy: boolean;
  proxyDetails?: {
    headersDetected: string[];
    isDatacenter: boolean;
    isVpnOrTor: boolean;
  };
  riskScore: number; // 0 to 100
  riskLevel: SecurityRiskLevel;
  riskReasons: string[];
  actionTaken: 'NONE' | 'FLAGGED' | 'SUSPENDED';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SecurityAuditLogSchema = new Schema<ISecurityAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', index: true },
    storeName: { type: String, trim: true },
    ownerPhone: { type: String, trim: true, index: true },
    eventType: {
      type: String,
      enum: ['STORE_REGISTRATION', 'LOGIN', 'FAILED_LOGIN', 'PAYMENT_CLAIM', 'SUSPICIOUS_PROXY', 'ADMIN_ACTION'],
      required: true,
      index: true,
    },
    ipAddress: { type: String, required: true, trim: true, index: true },
    userAgent: { type: String, trim: true },
    isProxy: { type: Boolean, default: false, index: true },
    proxyDetails: {
      headersDetected: { type: [String], default: [] },
      isDatacenter: { type: Boolean, default: false },
      isVpnOrTor: { type: Boolean, default: false },
    },
    riskScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    riskLevel: {
      type: String,
      enum: ['SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'FRAUD'],
      default: 'SAFE',
      index: true,
    },
    riskReasons: { type: [String], default: [] },
    actionTaken: {
      type: String,
      enum: ['NONE', 'FLAGGED', 'SUSPENDED'],
      default: 'NONE',
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Scalability Safeguards & Fast Query Indexes (Rule 8)
SecurityAuditLogSchema.index({ ipAddress: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
SecurityAuditLogSchema.index({ riskScore: -1, createdAt: -1 });
SecurityAuditLogSchema.index({ eventType: 1, createdAt: -1 });

// SOC 2 / ISO 27001 Bounded Storage: 90-day automatic MongoDB TTL expiration
SecurityAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SecurityAuditLog = mongoose.model<ISecurityAuditLog>('SecurityAuditLog', SecurityAuditLogSchema);

