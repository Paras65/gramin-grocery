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
  archivedTransactions!: Table<Transaction & { fiscalYear?: string }, string>;

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
    this.version(5).stores({
      products: 'id, name, hindiName, category, stockQty, expiryDate, barcode, updatedAt',
      customers: 'id, name, phone, para, balanceDue, dueDate, updatedAt',
      transactions: 'id, customerId, type, timestamp',
      sales: 'id, timestamp, paymentMode, customerId',
      spoilageLogs: 'id, reason, timestamp',
      dailyCashClose: 'id, date, closedAt',
      archivedSales: 'id, timestamp, paymentMode, customerId, fiscalYear',
      archivedTransactions: 'id, customerId, type, timestamp, fiscalYear'
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
  { name: 'Moong Daal (Dhuli)', hindiName: 'मूंग दाल (धुली)', category: 'pulses', purchasePrice: 105, sellingPrice: 125, stockQty: 25, unit: 'kg', minStockThreshold: 8, isLoose: true },
  { name: 'Masoor Daal', hindiName: 'लाल मसूर दाल', category: 'pulses', purchasePrice: 85, sellingPrice: 100, stockQty: 25, unit: 'kg', minStockThreshold: 10, isLoose: true },
  { name: 'Kala Chana', hindiName: 'देसी काला चना', category: 'pulses', purchasePrice: 65, sellingPrice: 80, stockQty: 30, unit: 'kg', minStockThreshold: 10, isLoose: true },
  { name: 'Safed Chhole Chana', hindiName: 'सफेद छोले (काबुली चना)', category: 'pulses', purchasePrice: 120, sellingPrice: 145, stockQty: 20, unit: 'kg', minStockThreshold: 8, isLoose: true },
  { name: 'Soyabean Badi (Chunks 200g)', hindiName: 'सोयाबीन बड़ी पाउच', category: 'pulses', purchasePrice: 22, sellingPrice: 30, stockQty: 30, unit: 'packet', minStockThreshold: 10, isLoose: false, barcode: '8906001239991' },
  { name: 'Sabudana (Loose)', hindiName: 'साबूदाना (खुला)', category: 'staples', purchasePrice: 62, sellingPrice: 75, stockQty: 15, unit: 'kg', minStockThreshold: 5, isLoose: true },

  // Oils & Ghee
  { name: 'Sarson Tel (Mustard Loose)', hindiName: 'सरसों तेल (खुला)', category: 'oils', purchasePrice: 125, sellingPrice: 145, stockQty: 45, unit: 'liter', minStockThreshold: 15, isLoose: true },
  { name: 'Soyabean Tel (Pouch 1L)', hindiName: 'सोयाबीन तेल (पाउच)', category: 'oils', purchasePrice: 108, sellingPrice: 122, stockQty: 24, unit: 'packet', minStockThreshold: 10, isLoose: false },
  { name: 'Fortune Sarson Tel (1L Pouch)', hindiName: 'फॉर्च्यून सरसों तेल (1L)', category: 'oils', purchasePrice: 135, sellingPrice: 152, stockQty: 24, unit: 'packet', minStockThreshold: 8, isLoose: false, barcode: '8906007280111' },
  { name: 'Desi Ghee (Pouch 200ml)', hindiName: 'देसी घी पाउच', category: 'oils', purchasePrice: 110, sellingPrice: 130, stockQty: 12, unit: 'pouch', minStockThreshold: 5, isLoose: false },

  // Spices & Sugar
  { name: 'Shakkhar (Sugar)', hindiName: 'शक्कर / चीनी', category: 'spices', purchasePrice: 41, sellingPrice: 46, stockQty: 90, unit: 'kg', minStockThreshold: 25, isLoose: true },
  { name: 'Gud (Jaggery Bheli)', hindiName: 'देसी गुड़ भेली', category: 'spices', purchasePrice: 44, sellingPrice: 55, stockQty: 40, unit: 'kg', minStockThreshold: 15, isLoose: true },
  { name: 'Tata Namak (1kg)', hindiName: 'टाटा नमक', category: 'spices', purchasePrice: 24, sellingPrice: 28, stockQty: 32, unit: 'packet', minStockThreshold: 12, isLoose: false, barcode: '8901030383921' },
  { name: 'Loose Namak (Sada Khula)', hindiName: 'सादा खुला नमक', category: 'spices', purchasePrice: 10, sellingPrice: 15, stockQty: 50, unit: 'kg', minStockThreshold: 20, isLoose: true },
  { name: 'Mirch Powder (200g)', hindiName: 'लाल मिर्च पाउडर', category: 'spices', purchasePrice: 60, sellingPrice: 75, stockQty: 16, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010111' },
  { name: 'Haldi Powder (200g)', hindiName: 'हल्दी पाउडर', category: 'spices', purchasePrice: 48, sellingPrice: 60, stockQty: 18, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010222' },
  { name: 'Dhaniya Powder (200g)', hindiName: 'धनिया पाउडर', category: 'spices', purchasePrice: 42, sellingPrice: 55, stockQty: 15, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010333' },
  { name: 'Garam Masala (50g)', hindiName: 'गरम मसाला पाउच', category: 'spices', purchasePrice: 25, sellingPrice: 35, stockQty: 20, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901262010444' },
  { name: 'Jeera (Loose)', hindiName: 'जीरा (खुला)', category: 'spices', purchasePrice: 320, sellingPrice: 390, stockQty: 6, unit: 'kg', minStockThreshold: 2, isLoose: true },
  { name: 'Rai / Sarson Dana', hindiName: 'राई / सरसों दाना', category: 'spices', purchasePrice: 85, sellingPrice: 110, stockQty: 8, unit: 'kg', minStockThreshold: 3, isLoose: true },
  { name: 'Methi Dana (Loose)', hindiName: 'मेथी दाना (खुला)', category: 'spices', purchasePrice: 90, sellingPrice: 115, stockQty: 6, unit: 'kg', minStockThreshold: 2, isLoose: true },
  { name: 'Ajwain (Loose)', hindiName: 'देसी अजवाइन (खुला)', category: 'spices', purchasePrice: 240, sellingPrice: 300, stockQty: 5, unit: 'kg', minStockThreshold: 2, isLoose: true },
  { name: 'Hing Powder (25g)', hindiName: 'हींग डिब्बी (25g)', category: 'spices', purchasePrice: 42, sellingPrice: 55, stockQty: 15, unit: 'piece', minStockThreshold: 5, isLoose: false, barcode: '8901262010555' },

  // Tea & Snacks
  { name: 'Chai Patti (Red Label 250g)', hindiName: 'चाय पत्ती (रेड लेबल)', category: 'snacks', purchasePrice: 115, sellingPrice: 130, stockQty: 14, unit: 'packet', minStockThreshold: 5, isLoose: false, barcode: '8901030381234' },
  { name: 'Khuli Chai Patti (Loose)', hindiName: 'खुली चाय पत्ती', category: 'snacks', purchasePrice: 220, sellingPrice: 280, stockQty: 10, unit: 'kg', minStockThreshold: 3, isLoose: true },
  { name: 'Parle-G Biscuit (₹5)', hindiName: 'पारले-जी बिस्कुट', category: 'snacks', purchasePrice: 4.15, sellingPrice: 5, stockQty: 120, unit: 'packet', minStockThreshold: 40, isLoose: false, barcode: '8901719101052' },
  { name: 'Tiger Glucose (₹5)', hindiName: 'टाइगर बिस्कुट', category: 'snacks', purchasePrice: 4.2, sellingPrice: 5, stockQty: 60, unit: 'packet', minStockThreshold: 20, isLoose: false, barcode: '8901063012019' },
  { name: 'Maggi Noodles (₹14)', hindiName: 'मैगी नूडल्स', category: 'snacks', purchasePrice: 12.2, sellingPrice: 14, stockQty: 48, unit: 'packet', minStockThreshold: 15, isLoose: false, barcode: '8901058852309' },
  { name: 'Ratlami Sev / Mixture', hindiName: 'रतलामी सेव / मिक्सचर', category: 'snacks', purchasePrice: 36, sellingPrice: 45, stockQty: 25, unit: 'packet', minStockThreshold: 8, isLoose: false, barcode: '8906001234567' },

  // Hygiene & Cleaning
  { name: 'Ghari Detergent Powder (1kg)', hindiName: 'घड़ी डिटर्जेंट पाउडर', category: 'hygiene', purchasePrice: 62, sellingPrice: 72, stockQty: 30, unit: 'packet', minStockThreshold: 10, isLoose: false, barcode: '8906010500010' },
  { name: 'Wheel Soap Bar (₹10)', hindiName: 'व्हील कपड़ा साबुन', category: 'hygiene', purchasePrice: 8.5, sellingPrice: 10, stockQty: 60, unit: 'piece', minStockThreshold: 20, isLoose: false, barcode: '8901030018038' },
  { name: 'Rin Soap Bar (₹10)', hindiName: 'रिन साबुन टिकी', category: 'hygiene', purchasePrice: 8.5, sellingPrice: 10, stockQty: 50, unit: 'piece', minStockThreshold: 15, isLoose: false, barcode: '8901030018021' },
  { name: 'Vim Dishwash Bar (₹10)', hindiName: 'विम बर्तन साबुन', category: 'hygiene', purchasePrice: 8.4, sellingPrice: 10, stockQty: 40, unit: 'piece', minStockThreshold: 15, isLoose: false, barcode: '8901030018045' },
  { name: 'Surf Excel Quick Wash (500g)', hindiName: 'सर्फ एक्सेल (500g)', category: 'hygiene', purchasePrice: 65, sellingPrice: 75, stockQty: 18, unit: 'packet', minStockThreshold: 6, isLoose: false, barcode: '8901030018052' },
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
  { name: 'Good Knight Mosquito Coil', hindiName: 'मच्छर कॉइल / अगरबत्ती', category: 'rural_special', purchasePrice: 32, sellingPrice: 40, stockQty: 25, unit: 'packet', minStockThreshold: 8, isLoose: false, barcode: '8901117002012' },
  { name: 'Dhoopbatti / Agarbatti', hindiName: 'धूपबत्ती / अगरबत्ती', category: 'rural_special', purchasePrice: 12, sellingPrice: 18, stockQty: 30, unit: 'packet', minStockThreshold: 10, isLoose: false },
  { name: 'Sukha Nariyal / Khopra Gola', hindiName: 'सूखा नारियल (गोला)', category: 'rural_special', purchasePrice: 180, sellingPrice: 220, stockQty: 10, unit: 'kg', minStockThreshold: 3, isLoose: true },
  { name: 'Saridon / Paracetamol Strip', hindiName: 'दर्द की गोली (सैरिडॉन)', category: 'rural_special', purchasePrice: 38, sellingPrice: 48, stockQty: 12, unit: 'packet', minStockThreshold: 4, isLoose: false, expiryDate: '2026-12-31' }
];

// Re-export as RURAL_ESSENTIALS_50 for onboarding wizard
export const RURAL_ESSENTIALS_50 = INITIAL_PRODUCTS;

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

/**
 * Automatically merges local duplicate products in Dexie (by barcode or normalized name+unit)
 * and records any removed duplicate IDs so they can be deleted on the cloud server.
 */
export async function deduplicateLocalProducts(): Promise<number> {
  try {
    const allProducts = await db.products.toArray();
    const seenMap = new Map<string, Product>();
    const duplicateIdsToDelete: string[] = [];

    for (const p of allProducts) {
      if (!p.id) continue;
      const bc = (p.barcode || '').trim();
      const normName = (p.name || '').trim().toLowerCase();
      const normHindi = (p.hindiName || '').trim().toLowerCase();
      const unit = (p.unit || '').trim().toLowerCase();

      const key = bc ? `bc_${bc}` : `name_${normName || normHindi}_${unit}`;

      if (seenMap.has(key)) {
        const primary = seenMap.get(key)!;
        primary.stockQty = (primary.stockQty || 0) + (p.stockQty || 0);
        duplicateIdsToDelete.push(p.id);
      } else {
        seenMap.set(key, { ...p });
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      await db.transaction('rw', db.products, async () => {
        for (const primary of seenMap.values()) {
          if (primary.id) {
            await db.products.update(primary.id, {
              stockQty: primary.stockQty,
              updatedAt: new Date().toISOString()
            });
          }
        }
        for (const id of duplicateIdsToDelete) {
          await db.products.delete(id);
        }
      });

      // Record deleted IDs for sync deletion on server
      if (typeof window !== 'undefined') {
        try {
          const existing = JSON.parse(localStorage.getItem('gk_deleted_product_uuids') || '[]');
          const merged = Array.from(new Set([...existing, ...duplicateIdsToDelete]));
          localStorage.setItem('gk_deleted_product_uuids', JSON.stringify(merged));
        } catch (_) {}
      }
    }

    return duplicateIdsToDelete.length;
  } catch (err) {
    console.error('deduplicateLocalProducts error:', err);
    return 0;
  }
}

export async function initializeDatabaseIfEmpty() {
  // Always purge any lingering dummy/seed customer records from previous test runs
  await purgeDummySeedData();
  // Ensure no duplicate product rows exist locally
  await deduplicateLocalProducts();
}

/**
 * 1-Click Store Onboarding: Seed standard 52 rural essentials into the store catalog.
 * Skips items that already exist by name to prevent duplication.
 */
export async function seedStandardRuralEssentials(): Promise<{ added: number; total: number }> {
  let added = 0;
  const allExisting = await db.products.toArray();

  for (const p of INITIAL_PRODUCTS) {
    const cleanBc = (p.barcode || '').trim();
    const normName = p.name.trim().toLowerCase();
    const normHindi = p.hindiName.trim().toLowerCase();
    const unit = p.unit.trim().toLowerCase();

    const existing = allExisting.find(item => {
      if (cleanBc && item.barcode && item.barcode.trim() === cleanBc) return true;
      const itemN = (item.name || '').trim().toLowerCase();
      const itemH = (item.hindiName || '').trim().toLowerCase();
      const itemU = (item.unit || '').trim().toLowerCase();
      return (itemN === normName || itemH === normHindi || itemN === normHindi) && itemU === unit;
    });

    if (!existing) {
      const slug = (cleanBc || normName).replace(/[^a-z0-9]/g, '_').substring(0, 24);
      const newProd: Product = {
        ...p,
        id: `prod_seed_${slug}`,
        updatedAt: new Date().toISOString()
      };
      await db.products.add(newProd);
      allExisting.push(newProd);
      added++;
    }
  }
  await deduplicateLocalProducts();
  const total = await db.products.count();
  return { added, total };
}

export async function seedDemoSandboxData() {
  const count = await db.products.count();
  if (count === 0) {
    for (const p of INITIAL_PRODUCTS) {
      const cleanBc = (p.barcode || '').trim();
      const normName = p.name.trim().toLowerCase();
      const slug = (cleanBc || normName).replace(/[^a-z0-9]/g, '_').substring(0, 24);
      await db.products.add({
        ...p,
        id: `prod_seed_${slug}`
      });
    }
  }
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
    ? [db.products, db.customers, db.transactions, db.sales, db.spoilageLogs, db.dailyCashClose, db.archivedSales, db.archivedTransactions]
    : [db.customers, db.transactions, db.sales, db.spoilageLogs, db.dailyCashClose, db.archivedSales, db.archivedTransactions];

  await db.transaction('rw', tables, async () => {
    if (includeProducts) await db.products.clear();
    await db.customers.clear();
    await db.transactions.clear();
    await db.sales.clear();
    await db.spoilageLogs.clear();
    await db.dailyCashClose.clear();
    await db.archivedSales.clear();
    await db.archivedTransactions.clear();
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
 * Silent background maintenance: check if rolling sales archive is due (> 30 days since last check).
 */
export async function autoArchiveIfDue(): Promise<{ ran: boolean; archivedCount?: number }> {
  try {
    const lastArchiveStr = localStorage.getItem('gk_last_auto_archive');
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    if (lastArchiveStr && (now - parseInt(lastArchiveStr, 10) < thirtyDaysMs)) {
      return { ran: false };
    }
    const res = await archiveOldSales(180);
    localStorage.setItem('gk_last_auto_archive', now.toString());
    return { ran: true, archivedCount: res.archivedCount };
  } catch (err) {
    console.warn('Auto-archive check encountered error:', err);
    return { ran: false };
  }
}

/**
 * Archive settled customer transactions (balanceDue === 0, older than retentionDays) into cold archive.
 * Protects ledger integrity: active debt is never touched, only fully cleared historical transactions are moved.
 */
export async function archiveSettledKhata(retentionDays = 180): Promise<{ archivedCount: number; affectedCustomers: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  // Find customers whose balance is fully paid up / 0
  const settledCustomers = await db.customers.filter((c) => (c.balanceDue || 0) === 0).toArray();
  if (settledCustomers.length === 0) {
    return { archivedCount: 0, affectedCustomers: 0 };
  }

  const settledCustomerIds = new Set(settledCustomers.map((c) => c.id).filter(Boolean) as string[]);
  
  // Find transactions belonging to settled customers older than cutoff
  const candidateTxns = await db.transactions
    .where('timestamp')
    .below(cutoffStr)
    .filter((t) => settledCustomerIds.has(t.customerId))
    .toArray();

  if (candidateTxns.length === 0) {
    return { archivedCount: 0, affectedCustomers: 0 };
  }

  await db.transaction('rw', db.transactions, db.archivedTransactions, async () => {
    const toArchive = candidateTxns.map((t) => {
      const d = new Date(t.timestamp);
      const year = d.getFullYear();
      const month = d.getMonth();
      const fiscalYear = month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      return { ...t, fiscalYear };
    });
    await db.archivedTransactions.bulkPut(toArchive);
    const ids = candidateTxns.map((t) => t.id!).filter(Boolean);
    await db.transactions.bulkDelete(ids);
  });

  const uniqueAffectedCustomers = new Set(candidateTxns.map((t) => t.customerId)).size;
  return { archivedCount: candidateTxns.length, affectedCustomers: uniqueAffectedCustomers };
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
 * Export cold archive Khata ledger into a downloadable JSON file.
 */
export async function exportArchivedKhataJSON(fiscalYear?: string): Promise<string> {
  const allArchived = await db.archivedTransactions.toArray();
  const filtered = fiscalYear ? allArchived.filter((t) => t.fiscalYear === fiscalYear) : allArchived;
  return JSON.stringify({
    exportType: 'GRAMIN_KIRANA_KHATA_COLD_ARCHIVE',
    fiscalYear: fiscalYear || 'ALL_TIME_COLD_ARCHIVE',
    exportedAt: new Date().toISOString(),
    recordCount: filtered.length,
    transactions: filtered,
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
  archivedTransactionsCount: number;
  estimatedSizeKB: number;
}> {
  const [activeSalesCount, archivedSalesCount, customersCount, productsCount, transactionsCount, archivedTransactionsCount] = await Promise.all([
    db.sales.count(),
    db.archivedSales.count(),
    db.customers.count(),
    db.products.count(),
    db.transactions.count(),
    db.archivedTransactions.count(),
  ]);

  // Rough estimation based on average record sizes
  const estimatedBytes = 
    (activeSalesCount * 800) + 
    (archivedSalesCount * 700) + 
    (customersCount * 300) + 
    (productsCount * 350) + 
    (transactionsCount * 250) +
    (archivedTransactionsCount * 250);

  return {
    activeSalesCount,
    archivedSalesCount,
    customersCount,
    productsCount,
    transactionsCount,
    archivedTransactionsCount,
    estimatedSizeKB: Math.round(estimatedBytes / 1024),
  };
}

