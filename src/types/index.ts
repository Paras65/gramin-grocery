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
  munimPin?: string; // 4-digit munim/staff PIN (local only, hashed)
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
    status: 'ACTIVE' | 'EXPIRED';
  };
  customerCount: number;
  totalDebt: number;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
