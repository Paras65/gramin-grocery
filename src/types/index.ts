export type PaymentMode = 'CASH' | 'UDHAAR' | 'UPI';

export type DueReason = 'KHARIF_DHAN' | 'MONTHLY_DBT' | 'WEEKLY_HAAT' | 'OTHER';

export type SpoilageReason = 'POWER_CUT' | 'HEAT_DAMAGE' | 'EXPIRED' | 'RODENT_PEST' | 'OTHER';

export interface Product {
  id?: string;
  name: string;
  hindiName: string;
  category: 'staples' | 'pulses' | 'oils' | 'spices' | 'snacks' | 'hygiene' | 'dairy' | 'rural_special';
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  unit: 'kg' | 'g' | 'liter' | 'packet' | 'piece' | 'pouch';
  minStockThreshold: number;
  isLoose: boolean;
  expiryDate?: string; // YYYY-MM-DD
  barcode?: string; // EAN-13, UPC, or custom barcode string
  updatedAt?: string;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  para: string; // Village mohalla/neighborhood (e.g., Patel Para, School Para)
  balanceDue: number; // Positive means customer owes shopkeeper
  creditLimit?: number; // Maximum allowed credit limit in ₹ (e.g., 2000)
  dueDate?: string;
  dueReason?: DueReason;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id?: string;
  customerId: string;
  type: 'UDHAAR' | 'JAMA'; // UDHAAR = credit taken, JAMA = credit repaid
  amount: number;
  timestamp: string;
  note?: string;
  billItemsSummary?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  calculatedPrice: number;
  customRate?: number;
}

export interface Sale {
  id?: string;
  timestamp: string;
  items: {
    productId?: string;
    name: string;
    hindiName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  discount?: number; // Cash discount or round-off in ₹
  paymentMode: PaymentMode;
  customerId?: string;
  customerName?: string;
  splitPayment?: {
    cash: number;
    udhaar: number;
  };
}

export interface SpoilageLog {
  id?: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: SpoilageReason;
  estimatedLoss: number;
  timestamp: string;
  note?: string;
  deductedProductId?: string;
  deductedQty?: number;
}

export interface DailyExpense {
  id?: string;
  description: string;
  amount: number;
  timestamp: string;
}

export interface DailyCashClose {
  id?: string;
  date: string; // YYYY-MM-DD
  openingCash?: number;
  physicalCashInDrawer: number;
  totalCashSalesDay: number;
  totalJamaCollectedDay: number;
  totalExpenses: number;
  expenses: DailyExpense[];
  calculatedExpectedCash: number;
  cashDifference: number; // positive = excess, negative = shortage
  totalUpiSalesDay?: number;
  totalUdhaarSalesDay?: number;
  note?: string;
  closedAt: string; // ISO timestamp
  denominations?: {
    d500?: number;
    d200?: number;
    d100?: number;
    d50?: number;
    d20?: number;
    d10?: number;
    coins?: number;
  };
}

export type TenantPlan = 'FREE' | 'PRO';

export type UserRole = 'owner' | 'munim' | 'superadmin';

export interface TenantInfo {
  id?: string;
  _id?: string;
  storeName: string;
  village: string;
  block?: string;
  district?: string;
  plan?: TenantPlan;
  planExpiryDate?: string;
  isTrial?: boolean;
  referralCode?: string;
  referralCount?: number;
  bonusDaysEarned?: number;
  munimPin?: string; // 4-digit munim/staff PIN (local only, hashed)
  featureOverrides?: {
    haatMode?: boolean;
    thermalPrinting?: boolean;
    voiceBilling?: boolean;
    cameraScanner?: boolean;
    spoilageGuard?: boolean;
    mandiPlanner?: boolean;
  };
  quotaOverrides?: {
    maxProducts?: number;
    maxCustomers?: number;
    maxMonthlySales?: number;
  };
}

export interface Wholesaler {
  id: string;
  name: string;
  phone: string;
  mandiLocation?: string; // e.g. तहसील मंडी, गंज बाज़ार
  category?: string; // e.g. 'अनाज व किराना', 'तेल व वनस्पति', 'मसाले', 'FMCG'
}

export interface PlatformMetrics {
  totalStores: number;
  proStores: number;
  freeStores: number;
  totalCustomers: number;
  totalProducts: number;
  totalGMV: number;
  totalSalesCount: number;
  totalVillageDebt: number;
}

export interface DistrictStat {
  district: string;
  storesCount: number;
}

export interface AdminStoreSummary {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  address: {
    village: string;
    mohalla?: string;
    block: string;
    district: string;
    state: string;
  };
  subscription: {
    plan: TenantPlan;
    status: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'SUSPENDED';
    planExpiryDate?: string;
    startDate?: string;
    pausedAt?: string;
    remainingDaysOnPause?: number;
    pauseReason?: string;
    daysRemaining?: number;
    isExpired?: boolean;
    isTrial?: boolean;
  };
  referral?: {
    code: string;
    referralCount: number;
    bonusDaysEarned: number;
  };
  latestClaim?: {
    utrNumber: string;
    amount: number;
    status: string;
    planDurationMonths: number;
    createdAt: string;
    rejectionReason?: string;
  } | null;
  daysRemaining?: number;
  isExpired?: boolean;
  customerCount: number;
  productCount?: number;
  salesCount?: number;
  spoilageCount?: number;
  storageKb?: number;
  featureOverrides?: {
    haatMode?: boolean;
    thermalPrinting?: boolean;
    voiceBilling?: boolean;
    cameraScanner?: boolean;
    spoilageGuard?: boolean;
    mandiPlanner?: boolean;
  };
  quotaOverrides?: {
    maxProducts?: number;
    maxCustomers?: number;
    maxMonthlySales?: number;
  };
  totalDebt: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadCategory = 'HOT_UPGRADE' | 'POWER_MERCHANT' | 'NEARING_QUOTA' | 'STEADY' | 'DORMANT';

export interface StoreStorageAnalytics {
  tenantId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  village: string;
  district: string;
  plan: TenantPlan;
  isTrial: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'PAUSED';
  daysRemaining: number;
  counts: {
    products: number;
    customers: number;
    sales: number;
    transactions: number;
    spoilage: number;
    totalRecords: number;
  };
  estimatedStorageKb: number;
  quotaLimits: {
    maxProducts: number;
    maxCustomers: number;
  };
  storageUsedPercent: number;
  upgradeReadinessScore: number;
  leadCategory: LeadCategory;
  lastActivityAt?: string;
  isActive: boolean;
}

export interface PlatformStorageOverview {
  totalStorageKb: number;
  totalRecords: number;
  collectionBreakdown: {
    products: { count: number; estimatedKb: number };
    customers: { count: number; estimatedKb: number };
    sales: { count: number; estimatedKb: number };
    transactions: { count: number; estimatedKb: number };
    spoilage: { count: number; estimatedKb: number };
  };
  hotUpgradeCount: number;
  nearingQuotaCount: number;
  powerMerchantCount: number;
  dormantCount: number;
}

export type AnnouncementType = 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
export type AnnouncementTargetMode = 'ALL' | 'SELECTED';

export interface PlatformAnnouncement {
  _id: string;
  id?: string;
  title: string;
  message: string;
  type: AnnouncementType;
  targetMode: AnnouncementTargetMode;
  targetStoreIds?: Array<{ _id: string; storeName: string; ownerName?: string; phone?: string; address?: { district?: string } } | string>;
  targetPlan: 'ALL' | 'FREE' | 'PRO';
  targetDistrict: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export type PaymentClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentClaim {
  _id?: string;
  id?: string;
  tenantId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  amount: number;
  planDurationMonths: number;
  utrNumber: string;
  status: PaymentClaimStatus;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VoucherItem {
  _id?: string;
  id?: string;
  code: string;
  durationMonths: number;
  isRedeemed: boolean;
  redeemedByTenantId?: string;
  redeemedByStoreName?: string;
  redeemedAt?: string;
  createdBy: string;
  note?: string;
  campaign?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SecurityEventType = 
  | 'STORE_REGISTRATION'
  | 'LOGIN'
  | 'FAILED_LOGIN'
  | 'PAYMENT_CLAIM'
  | 'SUSPICIOUS_PROXY'
  | 'ADMIN_ACTION';

export type SecurityRiskLevel = 'SAFE' | 'SUSPICIOUS' | 'HIGH_RISK' | 'FRAUD';

export interface SecurityAuditLogItem {
  _id: string;
  tenantId?: string;
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
  riskScore: number;
  riskLevel: SecurityRiskLevel;
  riskReasons: string[];
  actionTaken: 'NONE' | 'FLAGGED' | 'SUSPENDED';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface FlaggedStoreRisk {
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  village: string;
  district: string;
  plan: 'FREE' | 'BASIC' | 'PRO';
  status: 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'SUSPENDED';
  riskScore: number;
  riskLevel: SecurityRiskLevel;
  isProxy: boolean;
  isDatacenter: boolean;
  isVpnOrTor: boolean;
  lastIp: string;
  riskReasons: string[];
  lastEventAt: string;
  isTrial: boolean;
}

export interface IpCollisionGroup {
  ipAddress: string;
  storeCount: number;
  isProxy: boolean;
  stores: Array<{
    tenantId: string;
    storeName: string;
    phone: string;
  }>;
}

export interface DuplicateUtrAlert {
  id: string;
  utrNumber: string;
  storeName: string;
  phone: string;
  ipAddress: string;
  riskScore: number;
  reason: string;
  createdAt: string;
}

export interface FraudRadarOverview {
  overview: {
    totalEvents: number;
    highRiskCount: number;
    proxyHitsCount: number;
    ipCollisionCount: number;
    duplicateUtrCount: number;
    suspendedStoresCount: number;
  };
  flaggedStores: FlaggedStoreRisk[];
  ipCollisions: IpCollisionGroup[];
  duplicateUtrAlerts: DuplicateUtrAlert[];
}


