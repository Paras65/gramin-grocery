import { db, clearDatabase, initializeDatabaseIfEmpty } from '../db';
import type { Customer, Product, Sale, SpoilageLog, Transaction, TenantInfo, UserRole, PaymentClaim } from '../types';
import { API_BASE } from '../utils/apiConfig';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt?: string;
  error?: string;
  pendingCount?: number;
}

class SyncService {
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private authListeners: (() => void)[] = [];
  private status: SyncStatus = { isSyncing: false };

  constructor() {
    // Auto-sync when device comes online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('📶 Signal restored: auto-triggering cloud sync...');
        this.triggerSync().catch(console.error);
      });

      // Synchronize auth changes across tabs
      window.addEventListener('storage', (e) => {
        if (e.key === 'gk_auth_token' || e.key === 'gk_store_info' || e.key === 'gk_user_info') {
          this.notifyAuth();
        }
      });
    }
  }

  public subscribeAuth(listener: () => void) {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  private notifyAuth() {
    this.authListeners.forEach(l => l());
  }

  public subscribe(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
    listener(this.status);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(newStatus: Partial<SyncStatus>) {
    this.status = { ...this.status, ...newStatus };
    this.syncListeners.forEach((l) => l(this.status));
  }

  public getToken(): string | null {
    return localStorage.getItem('gk_auth_token');
  }

  public getStoreInfo(): TenantInfo | null {
    const data = localStorage.getItem('gk_store_info');
    return data ? JSON.parse(data) : null;
  }

  public getUserInfo(): any | null {
    const data = localStorage.getItem('gk_user_info');
    return data ? JSON.parse(data) : null;
  }

  public isMunimSession(): boolean {
    return typeof window !== 'undefined' && sessionStorage.getItem('gk_munim_session') === 'true';
  }

  public getSubscriptionStatus(): {
    plan: 'FREE' | 'PRO';
    planExpiryDate?: string;
    isPro: boolean;
    isExpired: boolean;
    daysRemaining?: number;
  } {
    const store = this.getStoreInfo();
    const rawPlan = store?.plan || 'FREE';
    const hasExpiry = !!store?.planExpiryDate;
    let daysRemaining: number | undefined;
    let isExpired = false;

    if (hasExpiry) {
      const expiry = new Date(store!.planExpiryDate!).getTime();
      const now = new Date().getTime();
      const diffMs = expiry - now;
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isExpired = diffMs <= 0;
    }

    const isPro = rawPlan === 'PRO' && !isExpired;
    return {
      plan: isPro ? 'PRO' : 'FREE',
      planExpiryDate: store?.planExpiryDate,
      isPro,
      isExpired: isExpired && (rawPlan === 'PRO' || hasExpiry),
      daysRemaining,
    };
  }

  /**
   * Redeem an offline promo code or voucher activation key for Pro plan
   */
  public activateProWithKey(rawKey: string): { success: boolean; message: string; days?: number } {
    const key = (rawKey || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!key) {
      return { success: false, message: 'कृपया कूपन या एक्टिवेशन कोड दर्ज करें।' };
    }

    let days = 30; // default 30 days
    if (['KIRANA365', 'KIRANA-PRO-365', 'GRAMIN-PRO-365', 'KIRANA-PRO-2026', 'GRAMIN-VIP', 'ANNUAL365'].includes(key)) {
      days = 365;
    } else if (['KIRANA90', 'KIRANA-PRO-90', 'GRAMIN-PRO-90', 'QUARTERLY90'].includes(key)) {
      days = 90;
    } else if (['KIRANA30', 'KIRANA-PRO-30', 'GRAMIN-PRO-30', 'GRAMIN99', 'CHHATTISGARH30', 'VILLAGE30'].includes(key)) {
      days = 30;
    } else if (/^(GK|PRO)-[A-Z0-9]{4,10}$/.test(key)) {
      days = 30;
    } else {
      return {
        success: false,
        message: 'अमान्य कोड! कृपया सही 6 या 8 अंकों का कोड दर्ज करें (जैसे: GRAMIN99, KIRANA-PRO-30, KIRANA-PRO-2026) या WhatsApp पर संपर्क करें।'
      };
    }

    const store = this.getStoreInfo();
    const expiryDate = new Date(Date.now() + days * 86400000).toISOString();

    const updatedStore: TenantInfo = {
      ...(store || {
        storeName: 'गाँव किराना स्टोर',
        village: 'गाँव'
      }),
      plan: 'PRO',
      planExpiryDate: expiryDate,
    };

    localStorage.setItem('gk_store_info', JSON.stringify(updatedStore));
    this.notifyAuth();

    return {
      success: true,
      message: `बधाई! आपकी दुकान के लिए "ग्रामिन प्रो" प्लान (${days} दिन) सक्रिय हो गया है।`,
      days,
    };
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  public static readonly DEMO_MAX_BILLS = 15;

  public async getDemoBillCount(): Promise<number> {
    if (this.isLoggedIn()) return 0;
    try {
      return await db.sales.count();
    } catch {
      return 0;
    }
  }

  public async isDemoQuotaReached(): Promise<boolean> {
    if (this.isLoggedIn()) return false;
    const count = await this.getDemoBillCount();
    return count >= SyncService.DEMO_MAX_BILLS;
  }

  // ─── Role helpers ───────────────────────────────────────────────────────────

  /** Returns active role: 'munim' if a munim session is active, else 'owner' */
  public getRole(): UserRole {
    return sessionStorage.getItem('gk_munim_session') === 'true' ? 'munim' : 'owner';
  }

  /** Shortcut: is current store on PRO plan? */
  public isPro(): boolean {
    return this.getSubscriptionStatus().isPro;
  }

  /**
   * Cryptographically hash PIN using Web Crypto SHA-256 (OWASP ASVS 2.10.3)
   */
  private async hashPin(pin: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin.trim());
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return btoa(`gk_pin_${pin.trim()}`);
  }

  /**
   * Attempt Munim / Counter-Staff login with 4-digit PIN against stored SHA-256 digest
   */
  public async munimLogin(enteredPin: string): Promise<boolean> {
    const store = this.getStoreInfo();
    if (!store?.munimPin) return false;
    const enteredHash = await this.hashPin(enteredPin);
    const ok = store.munimPin === enteredHash || store.munimPin === enteredPin.trim();
    if (ok) {
      if (store.munimPin === enteredPin.trim()) {
        await this.setMunimPin(enteredPin.trim());
      }
      sessionStorage.setItem('gk_munim_session', 'true');
      this.notifyAuth();
    }
    return ok;
  }

  /** Save / update the Munim PIN as a SHA-256 hash in localStorage */
  public async setMunimPin(pin: string): Promise<void> {
    const store = this.getStoreInfo();
    if (!store) return;
    const hashed = await this.hashPin(pin);
    const updated: TenantInfo = { ...store, munimPin: hashed };
    localStorage.setItem('gk_store_info', JSON.stringify(updated));
  }

  /** Clear Munim session (owner takes over) */
  public clearMunimSession() {
    sessionStorage.removeItem('gk_munim_session');
    this.notifyAuth();
  }


  /**
   * Count how many sales/transactions/spoilage are waiting to be pushed to cloud
   */
  public async getPendingSyncCount(): Promise<number> {
    try {
      const lastSync = localStorage.getItem('gk_last_sync');
      if (!lastSync) {
        const salesCount = await db.sales.count();
        const txnCount = await db.transactions.count();
        const spoilageCount = await db.spoilageLogs.count();
        return salesCount + txnCount + spoilageCount;
      }
      const pendingSales = await db.sales.where('timestamp').above(lastSync).count();
      const pendingTxns = await db.transactions.where('timestamp').above(lastSync).count();
      const pendingSpoilage = await db.spoilageLogs.where('timestamp').above(lastSync).count();
      return pendingSales + pendingTxns + pendingSpoilage;
    } catch {
      return 0;
    }
  }

  public async login(mobile: string, pin: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, pin }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Always purge previous unauthenticated/demo store records so user's real store is loaded
    await clearDatabase(false);
    localStorage.removeItem('gk_last_sync');

    localStorage.setItem('gk_auth_token', data.token);
    localStorage.setItem('gk_store_info', JSON.stringify(data.tenant));
    localStorage.setItem('gk_user_info', JSON.stringify(data.user));

    this.notifyAuth();

    // Initial sync upon login (pulls real records from cloud)
    await this.triggerSync();
    return data;
  }

  public async registerStore(storeData: {
    storeName: string;
    ownerName: string;
    phone: string;
    pin: string;
    village: string;
    block: string;
    district: string;
    mohalla?: string;
  }) {
    const res = await fetch(`${API_BASE}/auth/register-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Critical: Clean out any previous demo/unauthenticated records so newly registered store is 100% clean
    await clearDatabase(false);
    localStorage.removeItem('gk_last_sync');

    localStorage.setItem('gk_auth_token', data.token);
    localStorage.setItem('gk_store_info', JSON.stringify(data.tenant));
    localStorage.setItem('gk_user_info', JSON.stringify(data.user));

    this.notifyAuth();

    // Initial sync with cloud for newly registered store
    await this.triggerSync();
    return data;
  }

  /**
   * Safe Logout with Un-synced Data Safeguard
   */
  public async logout(force: boolean = false): Promise<{ success: boolean; pendingCount: number }> {
    const pendingCount = await this.getPendingSyncCount();
    if (!force && pendingCount > 0) {
      return { success: false, pendingCount };
    }

    // Purge store data to prevent next login from seeing this store's records
    await clearDatabase(true);
    await initializeDatabaseIfEmpty();

    localStorage.removeItem('gk_auth_token');
    localStorage.removeItem('gk_store_info');
    localStorage.removeItem('gk_user_info');
    localStorage.removeItem('gk_admin_token');
    localStorage.removeItem('gk_admin_info');
    localStorage.removeItem('gk_last_sync');
    sessionStorage.removeItem('gk_munim_session');
    sessionStorage.removeItem('gk_exploring_demo');
    sessionStorage.clear();

    this.setStatus({ isSyncing: false, lastSyncedAt: undefined });
    this.notifyAuth();

    return { success: true, pendingCount: 0 };
  }

  public async triggerSync(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;

    if (!navigator.onLine) {
      this.setStatus({ isSyncing: false, error: 'ऑफ़लाइन (नेटवर्क नहीं है)' });
      return false;
    }

    try {
      this.setStatus({ isSyncing: true, error: undefined });

      const lastSyncTimestamp = localStorage.getItem('gk_last_sync') || undefined;

      // 1. Gather local records (True Delta Sync to prevent storage and bandwidth explosion)
      let products: Product[];
      let customers: Customer[];
      let transactions: Transaction[];
      let sales: Sale[];
      let spoilageLogs: SpoilageLog[];

      if (lastSyncTimestamp) {
        // Delta mode: only push records mutated/created after last sync
        sales = await db.sales.where('timestamp').above(lastSyncTimestamp).toArray();
        transactions = await db.transactions.where('timestamp').above(lastSyncTimestamp).toArray();
        spoilageLogs = await db.spoilageLogs.where('timestamp').above(lastSyncTimestamp).toArray();
        products = await db.products.filter((p: Product) => !p.updatedAt || p.updatedAt > lastSyncTimestamp).toArray();
        customers = await db.customers.filter((c: Customer) => !c.updatedAt || c.updatedAt > lastSyncTimestamp).toArray();
      } else {
        // Full initial sync
        sales = await db.sales.toArray();
        transactions = await db.transactions.toArray();
        spoilageLogs = await db.spoilageLogs.toArray();
        products = await db.products.toArray();
        customers = await db.customers.toArray();
      }

      const payload = {
        lastSyncTimestamp,
        mutations: {
          products: products.map((p: Product) => ({
            clientUUID: p.id,
            name: p.name,
            hindiName: p.hindiName,
            category: p.category,
            purchasePrice: p.purchasePrice,
            sellingPrice: p.sellingPrice,
            stockQty: p.stockQty,
            unit: p.unit,
            minStockThreshold: p.minStockThreshold,
            isLoose: p.isLoose,
            barcode: p.barcode,
            expiryDate: p.expiryDate,
          })),
          customers: customers.map((c: Customer) => ({
            clientUUID: c.id,
            name: c.name,
            phone: c.phone,
            para: c.para,
            balanceDue: c.balanceDue,
            dueDate: c.dueDate,
            dueReason: c.dueReason,
            notes: c.notes,
          })),
          transactions: transactions.map((t: Transaction) => ({
            clientTxnId: t.id,
            customerId: t.customerId,
            type: t.type,
            amount: t.amount,
            timestamp: t.timestamp,
            note: t.note,
            billItemsSummary: t.billItemsSummary,
          })),
          sales: sales.map((s: Sale) => ({
            clientSaleId: s.id,
            timestamp: s.timestamp,
            items: s.items,
            totalAmount: s.totalAmount,
            paymentMode: s.paymentMode,
            customerId: s.customerId,
            customerName: s.customerName,
          })),
          spoilageLogs: spoilageLogs.map((sp: SpoilageLog) => ({
            clientSpoilageId: sp.id,
            productName: sp.productName,
            quantity: sp.quantity,
            unit: sp.unit,
            reason: sp.reason,
            estimatedLoss: sp.estimatedLoss,
            timestamp: sp.timestamp,
            note: sp.note,
          })),
        },
      };

      const res = await fetch(`${API_BASE}/sync/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Sync request rejected');
      }

      const syncResult = await res.json();

      // 2. Apply incoming cloud deltas to local Dexie IndexedDB (Full 2-Way Sync)
      if (syncResult.deltas) {
        // Delta A: Products
        if (syncResult.deltas.products?.length) {
          for (const p of syncResult.deltas.products) {
            await db.products.put({
              id: p.clientUUID,
              name: p.name,
              hindiName: p.hindiName || p.name,
              category: p.category,
              purchasePrice: p.purchasePrice,
              sellingPrice: p.sellingPrice,
              stockQty: p.stockQty,
              unit: p.unit,
              minStockThreshold: p.minStockThreshold,
              isLoose: p.isLoose,
              barcode: p.barcode,
              expiryDate: p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : undefined,
              updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
            });
          }
        }

        // Delta B: Customers
        if (syncResult.deltas.customers?.length) {
          for (const c of syncResult.deltas.customers) {
            await db.customers.put({
              id: c.clientUUID,
              name: c.name,
              phone: c.phone,
              para: c.para,
              balanceDue: c.balanceDue,
              dueDate: c.dueDate ? new Date(c.dueDate).toISOString().split('T')[0] : undefined,
              dueReason: c.dueReason,
              notes: c.notes,
              createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
              updatedAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : new Date().toISOString(),
            });
          }
        }

        // Delta C: Transactions
        if (syncResult.deltas.transactions?.length) {
          for (const t of syncResult.deltas.transactions) {
            await db.transactions.put({
              id: t.clientTxnId,
              customerId: t.customerId,
              type: t.type,
              amount: t.amount,
              timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : new Date().toISOString(),
              note: t.note,
              billItemsSummary: t.billItemsSummary,
            });
          }
        }
      }

      // 3. Save new sync timestamp
      if (syncResult.serverTimestamp) {
        localStorage.setItem('gk_last_sync', syncResult.serverTimestamp);
      }

      // 4. Update store subscription status if returned by server
      if (syncResult.subscription) {
        const currentStore = this.getStoreInfo();
        if (currentStore) {
          const updatedStore = {
            ...currentStore,
            plan: syncResult.subscription.plan,
            planExpiryDate: syncResult.subscription.planExpiryDate,
          };
          localStorage.setItem('gk_store_info', JSON.stringify(updatedStore));
          this.notifyAuth();
        }
      }

      // 5. Automatically sync offline pending payment claim if present
      const pendingClaimStr = localStorage.getItem('gk_pending_pro_claim');
      if (pendingClaimStr) {
        try {
          const pendingClaim = JSON.parse(pendingClaimStr);
          await this.submitPaymentClaim(pendingClaim.amount, pendingClaim.planDurationMonths, pendingClaim.utrNumber);
          localStorage.removeItem('gk_pending_pro_claim');
        } catch (e: any) {
          console.warn('Auto-sync of offline payment claim skipped/failed:', e);
          // If error indicates a permanent bad request (e.g. duplicate UTR or invalid duration), remove to prevent infinite retry loops
          if (e.message && (e.message.includes('स्वीकृत हो चुका') || e.message.includes('अमान्य योजना') || e.message.includes('अन्य अनुरोध में समीक्षाधीन'))) {
            localStorage.removeItem('gk_pending_pro_claim');
          }
        }
      }

      this.setStatus({
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
      });

      return true;
    } catch (err: any) {
      console.warn('Sync attempt encountered error:', err.message);
      this.setStatus({ isSyncing: false, error: err.message });
      return false;
    }
  }

  /**
   * Submit UPI Payment UTR claim for Pro Upgrade
   */
  public async submitPaymentClaim(amount: number, planDurationMonths: number, utrNumber: string): Promise<PaymentClaim> {
    const token = this.getToken();
    if (!token) {
      throw new Error('कृपया पहले दुकान से लॉगिन करें');
    }

    if (!navigator.onLine) {
      // Save offline claim for later sync
      localStorage.setItem('gk_pending_pro_claim', JSON.stringify({
        amount,
        planDurationMonths,
        utrNumber,
        timestamp: new Date().toISOString(),
      }));
      throw new Error('ऑफ़लाइन: नेटवर्क नहीं है। आपका UTR सुरक्षित रख लिया गया है और इंटरनेट आते ही स्वतः सबमिट हो जाएगा।');
    }

    const res = await fetch(`${API_BASE}/tenant/subscription/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        planDurationMonths,
        utrNumber,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'क्लेम सबमिट करने में विफल');
    }

    // Clean up offline copy if it was successfully sent
    localStorage.removeItem('gk_pending_pro_claim');
    return data.claim;
  }

  /**
   * Get store's latest payment claim status
   */
  public async getPaymentClaimStatus(): Promise<PaymentClaim | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/tenant/subscription/claim`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.claim || null;
    } catch {
      return null;
    }
  }

  /**
   * Get server-enforced platform UPI configuration
   */
  public async getSubscriptionConfig(): Promise<{
    isConfigured: boolean;
    upiId: string | null;
    upiName: string | null;
    supportWhatsApp: string | null;
    pricing?: Record<number, any>;
  } | null> {
    try {
      const res = await fetch(`${API_BASE}/tenant/subscription/config`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const syncService = new SyncService();

