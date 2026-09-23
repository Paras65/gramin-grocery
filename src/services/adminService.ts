import type { PlatformMetrics, DistrictStat, AdminStoreSummary, TenantPlan, PlatformAnnouncement, MandiBenchmarkRate } from '../types';
import { API_BASE } from '../utils/apiConfig';

export interface AdminUser {
  id: string;
  name: string;
  role: 'SUPER_ADMIN';
  mobile?: string;
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

  private async parseResponse(res: Response, fallbackError: string): Promise<any> {
    const contentType = res.headers.get('content-type') || '';
    let data: any = null;

    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    }

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('सर्वर पर एडमिन सर्विस अभी उपलब्ध नहीं है (404 Not Found)। Render बैकएंड डिप्लॉय हो रहा हो सकता है, कृपया 1-2 मिनट बाद पुनः प्रयास करें।');
      }
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('क्लाउड सर्वर अभी शुरू (Wake up) हो रहा है। कृपया कुछ सेकंड प्रतीक्षा कर पुनः प्रयास करें।');
      }
      const errMsg = data?.error || data?.message || (typeof data === 'string' ? data : fallbackError);
      throw new Error(errMsg);
    }

    if (!data) {
      throw new Error('अमान्य सर्वर प्रतिक्रिया (Invalid JSON response)');
    }

    return data;
  }

  public async login(password: string): Promise<AdminUser> {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.trim() }),
    });

    const data = await this.parseResponse(res, 'सुपर एडमिन प्रमाणीकरण विफल');

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

    try {
      const data = await this.parseResponse(res, 'Failed to load platform metrics');
      return data;
    } catch (err: any) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw err;
    }
  }

  public async getStores(search = '', plan = 'ALL', district = 'ALL'): Promise<AdminStoreSummary[]> {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (plan !== 'ALL') params.append('plan', plan);
    if (district !== 'ALL') params.append('district', district);

    const res = await fetch(`${API_BASE}/admin/stores?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    try {
      const data = await this.parseResponse(res, 'Failed to fetch stores');
      return data.stores || [];
    } catch (err: any) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw err;
    }
  }

  public async updateStoreSubscription(
    storeId: string, 
    plan: TenantPlan, 
    status: 'ACTIVE' | 'EXPIRED' = 'ACTIVE',
    durationMonths?: number
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}/subscription`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ plan, status, durationMonths }),
    });

    await this.parseResponse(res, 'Failed to update store subscription');
  }

  public async toggleStoreStatus(storeId: string, isActive: boolean): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ isActive }),
    });

    await this.parseResponse(res, 'Failed to toggle store status');
  }

  public async resetStorePin(storeId: string, newPin: string): Promise<string> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}/reset-pin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ newPin: newPin.trim() }),
    });

    const data = await this.parseResponse(res, 'Failed to reset store PIN');
    return data.message || 'PIN रीसेट सफल';
  }

  public async deleteStore(storeId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/admin/stores/${storeId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    const data = await this.parseResponse(res, 'Failed to delete store');
    return data.message || 'Store deleted successfully';
  }

  public async getAnnouncements(): Promise<PlatformAnnouncement[]> {
    const res = await fetch(`${API_BASE}/admin/announcements`, {
      headers: this.getAuthHeaders(),
    });

    try {
      const data = await this.parseResponse(res, 'Failed to fetch announcements');
      return data.announcements || [];
    } catch (err: any) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw err;
    }
  }

  public async createAnnouncement(payload: {
    title: string;
    message: string;
    type: string;
    targetMode: string;
    targetStoreIds?: string[];
    targetPlan?: string;
    targetDistrict?: string;
    durationDays?: number;
  }): Promise<PlatformAnnouncement> {
    const res = await fetch(`${API_BASE}/admin/announcements`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await this.parseResponse(res, 'Failed to create announcement');
    return data.announcement;
  }

  public async toggleAnnouncement(id: string): Promise<PlatformAnnouncement> {
    const res = await fetch(`${API_BASE}/admin/announcements/${id}/toggle`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });

    const data = await this.parseResponse(res, 'Failed to toggle announcement');
    return data.announcement;
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/announcements/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.parseResponse(res, 'Failed to delete announcement');
  }

  public async getActiveAnnouncement(): Promise<PlatformAnnouncement | null> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gk_auth_token') : null;
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE}/tenant/announcement/active`, {
        headers,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.announcement || null;
    } catch {
      return null;
    }
  }

  public async getAdminMandiRates(district = 'ALL', category = 'ALL'): Promise<MandiBenchmarkRate[]> {
    const params = new URLSearchParams();
    if (district !== 'ALL') params.append('district', district);
    if (category !== 'ALL') params.append('category', category);

    const res = await fetch(`${API_BASE}/admin/mandi-rates?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });

    try {
      const data = await this.parseResponse(res, 'Failed to fetch mandi rates');
      return data.rates || [];
    } catch (err: any) {
      if (res.status === 401 || res.status === 403) {
        this.logout();
      }
      throw err;
    }
  }

  public async createMandiRate(payload: Partial<MandiBenchmarkRate>): Promise<MandiBenchmarkRate> {
    const res = await fetch(`${API_BASE}/admin/mandi-rates`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await this.parseResponse(res, 'Failed to create mandi rate');
    return data.rate;
  }

  public async updateMandiRate(id: string, payload: Partial<MandiBenchmarkRate>): Promise<MandiBenchmarkRate> {
    const res = await fetch(`${API_BASE}/admin/mandi-rates/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await this.parseResponse(res, 'Failed to update mandi rate');
    return data.rate;
  }

  public async seedMandiRates(): Promise<MandiBenchmarkRate[]> {
    const res = await fetch(`${API_BASE}/admin/mandi-rates/seed`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    const data = await this.parseResponse(res, 'Failed to seed default mandi rates');
    return data.rates || [];
  }

  public async deleteMandiRate(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/mandi-rates/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    await this.parseResponse(res, 'Failed to delete mandi rate');
  }
}

export const adminService = new AdminService();

