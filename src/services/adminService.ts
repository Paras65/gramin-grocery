import type { PlatformMetrics, DistrictStat, AdminStoreSummary, TenantPlan } from '../types';

const API_BASE = 
  import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api/v1' 
    : '/api/v1');

export interface AdminUser {
  id: string;
  name: string;
  role: 'SUPER_ADMIN';
  mobile: string;
}

export interface PlatformOverviewResponse {
  metrics: PlatformMetrics;
  districtBreakdown: DistrictStat[];
  recentStores: any[];
}

class AdminService {
  private adminListeners: (() => void)[] = [];

  public subscribe(listener: () => void): () => void {
    this.adminListeners.push(listener);
    return () => {
      this.adminListeners = this.adminListeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.adminListeners.forEach(l => l());
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('gk_admin_token');
  }

  public getAdminInfo(): AdminUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('gk_admin_info');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public isSuperAdmin(): boolean {
    return Boolean(this.getToken() && this.getAdminInfo()?.role === 'SUPER_ADMIN');
  }

  public async login(mobile: string, pin: string): Promise<AdminUser> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: mobile.trim(), pin: pin.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'सुपर एडमिन प्रमाणीकरण विफल');
    }

    localStorage.setItem('gk_admin_token', data.token);
    localStorage.setItem('gk_admin_info', JSON.stringify(data.user));
    this.notify();
    return data.user;
  }

  public logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('gk_admin_token');
    localStorage.removeItem('gk_admin_info');
    this.notify();
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
    };
  }

  public async getOverview(): Promise<PlatformOverviewResponse> {
    const res = await fetch(`${API_BASE}/admin/overview`, {
      headers: this.getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw new Error(data.error || 'Failed to load platform metrics');
    }
    return data;
  }

  public async getStores(search = '', plan = 'ALL', district = 'ALL'): Promise<AdminStoreSummary[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (plan !== 'ALL') params.append('plan', plan);
    if (district !== 'ALL') params.append('district', district);

    const res = await fetch(`${API_BASE}/admin/stores?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw new Error(data.error || 'Failed to fetch stores');
    }
    return data.stores || [];
  }

  public async updateStoreSubscription(
    storeId: string, 
    plan: TenantPlan, 
    status: 'ACTIVE' | 'EXPIRED' = 'ACTIVE'
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}/subscription`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ plan, status }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update store subscription');
    }
  }

  public async toggleStoreStatus(storeId: string, isActive: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle store status');
    }
  }
}

export const adminService = new AdminService();

