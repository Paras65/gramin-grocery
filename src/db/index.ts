import Dexie, { type Table } from 'dexie';
import type { Customer, DailyCashClose, Product, Sale, SpoilageLog, Transaction } from '../types';

export class GraminKiranaDB extends Dexie {
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  transactions!: Table<Transaction, string>;
  sales!: Table<Sale, string>;
  spoilageLogs!: Table<SpoilageLog, string>;
  dailyCashClose!: Table<DailyCashClose, string>;
  archivedSales!: Table<Sale & { fiscalYear?: string }, string>;

  constructor() {
    super('GraminKiranaDB');
    this.version(1).stores({
      products: 'id, name, hindiName, category, stockQty, expiryDate',
      customers: 'id, name, phone, para, balanceDue, dueDate',
      transactions: 'id, customerId, type, timestamp',
      sales: 'id, timestamp, paymentMode, customerId',
      spoilageLogs: 'id, reason, timestamp'
    });
    this.version(2).stores({
      products: 'id, name, hindiName, category, stockQty, expiryDate',
      customers: 'id, name, phone, para, balanceDue, dueDate',
      transactions: 'id, customerId, type, timestamp',
      sales: 'id, timestamp, paymentMode, customerId',
      spoilageLogs: 'id, reason, timestamp',
      dailyCashClose: 'id, date, closedAt'
    });
    this.version(3).stores({
      products: 'id, name, hindiName, category, stockQty, expiryDate, barcode',
      customers: 'id, name, phone, para, balanceDue, dueDate',
      transactions: 'id, customerId, type, timestamp',
      sales: 'id, timestamp, paymentMode, customerId',
      spoilageLogs: 'id, reason, timestamp',
      dailyCashClose: 'id, date, closedAt'
    });
    this.version(4).stores({
      products: 'id, name, hindiName, category, stockQty, expiryDate, barcode, updatedAt',
      customers: 'id, name, phone, para, balanceDue, dueDate, updatedAt',
      transactions: 'id, customerId, type, timestamp',
      sales: 'id, timestamp, paymentMode, customerId',
      spoilageLogs: 'id, reason, timestamp',
      dailyCashClose: 'id, date, closedAt',
      archivedSales: 'id, timestamp, paymentMode, customerId, fiscalYear'
    });
  }
}

export const db = new GraminKiranaDB();

// Default 36+ Authentic Village Items for Chhattisgarh
export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  // Staples & Flour
  { name: 'Arwa Chawal (Usna)', hindiName: 'अरवा / उसना चावल', category: 'staples', purchasePrice: 28, sellingPrice: 34, stockQty: 120, unit: 'kg', minStockThreshold: 30, isLoose: true },
  { name: 'Gehu Atta (Chakki)', hindiName: 'गेहूं आटा', category: 'staples', purchasePrice: 26, sellingPrice: 32, stockQty: 85, unit: 'kg', minStockThreshold: 25, isLoose: true },
  { name: 'Besan (Gram Flour)', hindiName: 'चना बेसन', category: 'staples', purchasePrice: 75, sellingPrice: 90, stockQty: 25, unit: 'kg', minStockThreshold: 10, isLoose: true },
  { name: 'Suji / Rawa', hindiName: 'सूजी / रवा', category: 'staples', purchasePrice: 38, sellingPrice: 48, stockQty: 18, unit: 'kg', minStockThreshold: 8, isLoose: true },
  { name: 'Maida', hindiName: 'मैदा', category: 'staples', purchasePrice: 36, sellingPrice: 45, stockQty: 15, unit: 'kg', minStockThreshold: 5, isLoose: true },
  { name: 'Poha / Chuda', hindiName: 'पोहा / चूड़ा', category: 'staples', purchasePrice: 38, sellingPrice: 48, stockQty: 30, unit: 'kg', minStockThreshold: 10, isLoose: true },

  // Pulses / Daal
  { name: 'Rahar Daal (Toor)', hindiName: 'रहर (तुअर) दाल', category: 'pulses', purchasePrice: 140, sellingPrice: 165, stockQty: 40, unit: 'kg', minStockThreshold: 15, isLoose: true },
  { name: 'Chana Daal', hindiName: 'चना दाल', category: 'pulses', purchasePrice: 78, sellingPrice: 92, stockQty: 35, unit: 'kg', minStockThreshold: 12, isLoose: true },
  { name: 'Urad Daal (Kaali/Dhuli)', hindiName: 'उड़द दाल', category: 'pulses', purchasePrice: 110, sellingPrice: 130, stockQty: 20, unit: 'kg', minStockThreshold: 8, isLoose: true },
  { name: 'Kala Chana', hindiName: 'देसी काला चना', category: 'pulses', purchasePrice: 65, sellingPrice: 80, stockQty: 30, unit: 'kg', minStockThreshold: 10, isLoose: true },

  // Oils & Ghee
  { name: 'Sarson Tel (Mustard Loose)', hindiName: 'सरसों तेल (खुला)', category: 'oils', purchasePrice: 125, sellingPrice: 145, stockQty: 45, unit: 'liter', minStockThreshold: 15, isLoose: true },
  { name: 'Soyabean Tel (Pouch 1L)', hindiName: 'सोयाबीन तेल (पाउच)', category: 'oils', purchasePrice: 108, sellingPrice: 122, stockQty: 24, unit: 'packet', minStockThreshold: 10, isLoose: false },
  { name: 'Desi Ghee (Pouch 200ml)', hindiName: 'देसी घी पाउच', category: 'oils', purchasePrice: 110, sellingPrice: 130, stockQty: 12, unit: 'pouch', minStockThreshold: 5, isLoose: false },

  // Spices & Sugar
  { name: 'Shakkhar (Sugar)', hindiName: 'शक्कर / चीनी', category: 'spices', purchasePrice: 41, sellingPrice: 46, stockQty: 90, unit: 'kg', minStockThreshold: 25, isLoose: true },
  { name: 'Gud (Jaggery Bheli)', hindiName: 'देसी गुड़ भेली', category: 'spices', purchasePrice: 44, sellingPrice: 55, stockQty: 40, unit: 'kg', minStockThreshold: 15, isLoose: true },
  { name: 'Tata Namak (1kg)', hindiName: 'टाटा नमक', category: 'spices', purchasePrice: 24, sellingPrice: 28, stockQty: 32, unit: 'packet', minStockThreshold: 12, isLoose: false, barcode: '8901030383921' },
  { name: 'Loose Namak (Sada Khula)', hindiName: 'सादा खुला नमक', category: 'spices', purchasePrice: 10, sellingPrice: 15, stockQty: 50, unit: 'kg', minStockThreshold: 20, isLoose: true },
  { name: 'Mirch Powder (200g)', hindiName: 'लाल मिर्च पाउडर', category: 'spices', purchasePrice: 60, sellingPrice: 75, stockQty: 16, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010111' },
  { name: 'Haldi Powder (200g)', hindiName: 'हल्दी पाउडर', category: 'spices', purchasePrice: 48, sellingPrice: 60, stockQty: 18, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010222' },
  { name: 'Dhaniya Powder (200g)', hindiName: 'धनिया पाउडर', category: 'spices', purchasePrice: 42, sellingPrice: 55, stockQty: 15, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010333' },
  { name: 'Jeera (Loose)', hindiName: 'जीरा (खुला)', category: 'spices', purchasePrice: 320, sellingPrice: 390, stockQty: 6, unit: 'kg', minStockThreshold: 2, isLoose: true },

  // Tea & Snacks
  { name: 'Chai Patti (Red Label 250g)', hindiName: 'चाय पत्ती (रेड लेबल)', category: 'snacks', purchasePrice: 115, sellingPrice: 130, stockQty: 14, unit: 'packet', minStockThreshold: 5, isLoose: false, barcode: '8901030381234' },
  { name: 'Khuli Chai Patti (Loose)', hindiName: 'खुली चाय पत्ती', category: 'snacks', purchasePrice: 220, sellingPrice: 280, stockQty: 10, unit: 'kg', minStockThreshold: 3, isLoose: true },
  { name: 'Parle-G Biscuit (₹5)', hindiName: 'पारले-जी बिस्कुट', category: 'snacks', purchasePrice: 4.15, sellingPrice: 5, stockQty: 120, unit: 'packet', minStockThreshold: 40, isLoose: false, barcode: '8901719101052' },
  { name: 'Tiger Glucose (₹5)', hindiName: 'टाइगर बिस्कुट', category: 'snacks', purchasePrice: 4.2, sellingPrice: 5, stockQty: 60, unit: 'packet', minStockThreshold: 20, isLoose: false, barcode: '8901063012019' },
  { name: 'Maggi Noodles (₹14)', hindiName: 'मैगी नूडल्स', category: 'snacks', purchasePrice: 12.2, sellingPrice: 14, stockQty: 48, unit: 'packet', minStockThreshold: 15, isLoose: false, barcode: '8901058852309' },
  { name: 'Ratlami Sev / Mixture', hindiName: 'रतलामी सेव / मिक्सचर', category: 'snacks', purchasePrice: 36, sellingPrice: 45, stockQty: 25, unit: 'packet', minStockThreshold: 8, isLoose: false, barcode: '8906001234567' },

  // Hygiene & Cleaning
  { name: 'Ghari Detergent Powder (1kg)', hindiName: 'घड़ी डिटर्जेंट पाउडर', category: 'hygiene', purchasePrice: 62, sellingPrice: 72, stockQty: 30, unit: 'packet', minStockThreshold: 10, isLoose: false, barcode: '8906010500010' },
  { name: 'Rin Soap Bar (₹10)', hindiName: 'रिन साबुन टिकी', category: 'hygiene', purchasePrice: 8.5, sellingPrice: 10, stockQty: 50, unit: 'piece', minStockThreshold: 15, isLoose: false, barcode: '8901030018021' },
  { name: 'Lifebuoy Soap (₹10)', hindiName: 'लाइफबॉय साबुन', category: 'hygiene', purchasePrice: 8.4, sellingPrice: 10, stockQty: 45, unit: 'piece', minStockThreshold: 15, isLoose: false, barcode: '8901030019035' },
  { name: 'Clinic Plus Sachet (₹1)', hindiName: 'क्लिनिक प्लस पाउच', category: 'hygiene', purchasePrice: 0.75, sellingPrice: 1, stockQty: 240, unit: 'pouch', minStockThreshold: 60, isLoose: false, barcode: '8901030020048' },
  { name: 'Colgate Strong Teeth (50g)', hindiName: 'कोलगेट पेस्ट (50g)', category: 'hygiene', purchasePrice: 28, sellingPrice: 34, stockQty: 18, unit: 'piece', minStockThreshold: 6, isLoose: false, barcode: '8901314010528' },

  // Dairy & Perishables (Frequent Spoilage due to power cuts)
  { name: 'Amul Taaza Milk (500ml)', hindiName: 'अमुल ताज़ा दूध', category: 'dairy', purchasePrice: 26, sellingPrice: 29, stockQty: 8, unit: 'pouch', minStockThreshold: 5, isLoose: false, expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] },
  { name: 'Dahi Pouch (200g)', hindiName: 'ताज़ा दही पाउच', category: 'dairy', purchasePrice: 16, sellingPrice: 20, stockQty: 6, unit: 'pouch', minStockThreshold: 4, isLoose: false, expiryDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] },
  { name: 'Thums Up Cold Drink (250ml)', hindiName: 'थम्स अप बॉटल', category: 'dairy', purchasePrice: 16.5, sellingPrice: 20, stockQty: 15, unit: 'piece', minStockThreshold: 8, isLoose: false },

  // Rural Special Items
  { name: 'Bidi Bundle (Chhap 502)', hindiName: 'बीड़ी बंडल (502 छाप)', category: 'rural_special', purchasePrice: 16, sellingPrice: 20, stockQty: 90, unit: 'packet', minStockThreshold: 30, isLoose: false },
  { name: 'Cheeta Matchbox (माचिस)', hindiName: 'चीता माचिस बॉक्स', category: 'rural_special', purchasePrice: 0.8, sellingPrice: 1, stockQty: 150, unit: 'piece', minStockThreshold: 50, isLoose: false },
  { name: 'Dhoopbatti / Agarbatti', hindiName: 'धूपबत्ती / अगरबत्ती', category: 'rural_special', purchasePrice: 12, sellingPrice: 18, stockQty: 30, unit: 'packet', minStockThreshold: 10, isLoose: false },
  { name: 'Saridon / Paracetamol Strip', hindiName: 'दर्द की गोली (सैरिडॉन)', category: 'rural_special', purchasePrice: 38, sellingPrice: 48, stockQty: 12, unit: 'packet', minStockThreshold: 4, isLoose: false, expiryDate: '2026-12-31' }
];

// Empty arrays for initial customers and spoilage in production
export const INITIAL_CUSTOMERS: Omit<Customer, 'id'>[] = [];
export const INITIAL_SPOILAGE: Omit<SpoilageLog, 'id'>[] = [];

/**
 * Actively purges any residual dummy/seed customers and transactions from local Dexie database
 */
export async function purgeDummySeedData() {
  try {
    const allCustomers = await db.customers.toArray();
    const dummyCusts = allCustomers.filter(
      (c) =>
        c.phone.includes('XXXX') ||
        c.name === 'Ramesh Patel' ||
        c.name === 'Sushila Bai Sahu' ||
        c.name === 'Santosh Yadav' ||
        c.name === 'Dilip Kumar Netam' ||
        c.name === 'Kanhaiya Verma'
    );
    for (const c of dummyCusts) {
      if (c.id) {
        await db.customers.delete(c.id);
        await db.transactions.where('customerId').equals(c.id).delete();
      }
    }
  } catch (err) {
    console.warn('Purge error:', err);
  }
}

export async function initializeDatabaseIfEmpty() {
  // Always purge any lingering dummy/seed customer records from previous test runs
  await purgeDummySeedData();

  // Initialize real retail starter products if product table is completely empty
  const productCount = await db.products.count();
  if (productCount === 0) {
    for (const p of INITIAL_PRODUCTS) {
      await db.products.add({
        ...p,
        id: 'prod_' + Math.random().toString(36).substring(2, 9)
      });
    }
  }
}

export async function seedDemoSandboxData() {
  // No dummy data in production
}

// Backup and Restore
export async function exportDatabaseToJSON(): Promise<string> {
  const products = await db.products.toArray();
  const customers = await db.customers.toArray();
  const transactions = await db.transactions.toArray();
  const sales = await db.sales.toArray();
  const spoilageLogs = await db.spoilageLogs.toArray();

  const backup = {
    appName: 'GraminKirana',
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      products,
      customers,
      transactions,
      sales,
      spoilageLogs
    }
  };

  return JSON.stringify(backup, null, 2);
}

export async function importDatabaseFromJSON(jsonString: string): Promise<boolean> {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.data) return false;

    await db.transaction('rw', [db.products, db.customers, db.transactions, db.sales, db.spoilageLogs], async () => {
      await db.products.clear();
      await db.customers.clear();
      await db.transactions.clear();
      await db.sales.clear();
      await db.spoilageLogs.clear();

      if (backup.data.products?.length) await db.products.bulkAdd(backup.data.products);
      if (backup.data.customers?.length) await db.customers.bulkAdd(backup.data.customers);
      if (backup.data.transactions?.length) await db.transactions.bulkAdd(backup.data.transactions);
      if (backup.data.sales?.length) await db.sales.bulkAdd(backup.data.sales);
      if (backup.data.spoilageLogs?.length) await db.spoilageLogs.bulkAdd(backup.data.spoilageLogs);
    });

    return true;
  } catch (err) {
    console.error('Import failed', err);
    return false;
  }
}

/**
 * Completely purge store-specific tables during tenant switch or safe logout.
 */
export async function clearDatabase(includeProducts: boolean = false) {
  const tables = includeProducts
    ? [db.products, db.customers, db.transactions, db.sales, db.spoilageLogs, db.dailyCashClose, db.archivedSales]
    : [db.customers, db.transactions, db.sales, db.spoilageLogs, db.dailyCashClose, db.archivedSales];

  await db.transaction('rw', tables, async () => {
    if (includeProducts) await db.products.clear();
    await db.customers.clear();
    await db.transactions.clear();
    await db.sales.clear();
    await db.spoilageLogs.clear();
    await db.dailyCashClose.clear();
    await db.archivedSales.clear();
  });
}

/**
 * Archive sales older than retentionDays (default: 180 days / 6 months) into cold archive.
 */
export async function archiveOldSales(retentionDays = 180): Promise<{ archivedCount: number; cutoffDate: string }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  const oldSales = await db.sales.where('timestamp').below(cutoffStr).toArray();
  if (oldSales.length === 0) {
    return { archivedCount: 0, cutoffDate: cutoffStr };
  }

  await db.transaction('rw', db.sales, db.archivedSales, async () => {
    const toArchive = oldSales.map((s) => {
      const d = new Date(s.timestamp);
      const year = d.getFullYear();
      const month = d.getMonth();
      const fiscalYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      return { ...s, fiscalYear };
    });
    await db.archivedSales.bulkPut(toArchive);
    const ids = oldSales.map((s) => s.id!).filter(Boolean);
    await db.sales.bulkDelete(ids);
  });

  return { archivedCount: oldSales.length, cutoffDate: cutoffStr };
}

/**
 * Export cold archive bills into a downloadable JSON file for long-term fiscal backup.
 */
export async function exportFiscalYearArchiveJSON(fiscalYear?: string): Promise<string> {
  const allArchived = await db.archivedSales.toArray();
  const filtered = fiscalYear ? allArchived.filter((s) => s.fiscalYear === fiscalYear) : allArchived;
  return JSON.stringify({
    exportType: 'GRAMIN_KIRANA_SALES_COLD_ARCHIVE',
    fiscalYear: fiscalYear || 'ALL_TIME_COLD_ARCHIVE',
    exportedAt: new Date().toISOString(),
    recordCount: filtered.length,
    sales: filtered,
  }, null, 2);
}

/**
 * Calculate client IndexedDB storage summary and records breakdown.
 */
export async function getStorageStats(): Promise<{
  activeSalesCount: number;
  archivedSalesCount: number;
  customersCount: number;
  productsCount: number;
  transactionsCount: number;
  estimatedSizeKB: number;
}> {
  const [activeSalesCount, archivedSalesCount, customersCount, productsCount, transactionsCount] = await Promise.all([
    db.sales.count(),
    db.archivedSales.count(),
    db.customers.count(),
    db.products.count(),
    db.transactions.count(),
  ]);

  // Rough estimation based on average record sizes
  const estimatedBytes = 
    (activeSalesCount * 800) + 
    (archivedSalesCount * 700) + 
    (customersCount * 300) + 
    (productsCount * 350) + 
    (transactionsCount * 250);

  return {
    activeSalesCount,
    archivedSalesCount,
    customersCount,
    productsCount,
    transactionsCount,
    estimatedSizeKB: Math.round(estimatedBytes / 1024),
  };
}

