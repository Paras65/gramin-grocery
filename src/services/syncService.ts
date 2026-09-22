import { db, clearDatabase, initializeDatabaseIfEmpty } from '../db';
import type { Customer, Sale, SpoilageLog, Transaction, TenantInfo, UserRole } from '../types';

const API_BASE = 'http://localhost:5000/api/v1';

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

  public getSubscriptionStatus(): { plan: 'FREE' | 'PRO'; planExpiryDate?: string; isPro: boolean } {
    const store = this.getStoreInfo();
    const plan = store?.plan || 'FREE';
    return {
      plan,
      planExpiryDate: store?.planExpiryDate,
      isPro: plan === 'PRO',
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
   * Attempt Munim / Counter-Staff login with 4-digit PIN.
   * PIN is stored as a simple obfuscated string locally (no crypto dependency).
   */
  public munimLogin(enteredPin: string): boolean {
    const store = this.getStoreInfo();
    if (!store?.munimPin) return false;
    const ok = store.munimPin === enteredPin;
    if (ok) {
      sessionStorage.setItem('gk_munim_session', 'true');
      this.notifyAuth();
    }
    return ok;
  }

  /** Save / update the Munim PIN in localStorage store info */
  public setMunimPin(pin: string) {
    const store = this.getStoreInfo();
    if (!store) return;
    const updated: TenantInfo = { ...store, munimPin: pin };
    localStorage.setItem('gk_store_info', JSON.stringify(updated));
  }

  /** Clear Munim session (owner takes over) */
  public clearMunimSession() {
    sessionStorage.removeItem('gk_munim_session');
    this.notifyAuth();
  }


  /**
   * Count how many sales/transactions are waiting to be pushed to cloud
   */
  public async getPendingSyncCount(): Promise<number> {
    try {
      const lastSync = localStorage.getItem('gk_last_sync');
      if (!lastSync) {
        const salesCount = await db.sales.count();
        const txnCount = await db.transactions.count();
        return salesCount + txnCount;
      }
      const pendingSales = await db.sales.where('timestamp').above(lastSync).count();
      const pendingTxns = await db.transactions.where('timestamp').above(lastSync).count();
      return pendingSales + pendingTxns;
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

    // Tenant Isolation Safeguard: If switching to a different store, purge previous store data!
    const oldStore = this.getStoreInfo();
    if (oldStore && oldStore._id !== data.tenant._id) {
      console.warn('Switching store accounts: purges previous tenant records to prevent data bleeding.');
      await clearDatabase(false);
    }

    localStorage.setItem('gk_auth_token', data.token);
    localStorage.setItem('gk_store_info', JSON.stringify(data.tenant));
    localStorage.setItem('gk_user_info', JSON.stringify(data.user));

    this.notifyAuth();

    // Initial sync upon login
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

    localStorage.setItem('gk_auth_token', data.token);
    localStorage.setItem('gk_store_info', JSON.stringify(data.tenant));
    localStorage.setItem('gk_user_info', JSON.stringify(data.user));

    this.notifyAuth();

    // Upload local offline records to initialize cloud state
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
    localStorage.removeItem('gk_last_sync');

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

      // 1. Gather all local records
      const customers = await db.customers.toArray();
      const transactions = await db.transactions.toArray();
      const sales = await db.sales.toArray();
      const spoilageLogs = await db.spoilageLogs.toArray();

      const payload = {
        lastSyncTimestamp,
        mutations: {
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

      // 2. Save new sync timestamp
      if (syncResult.serverTimestamp) {
        localStorage.setItem('gk_last_sync', syncResult.serverTimestamp);
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
}

export const syncService = new SyncService();

