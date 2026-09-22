import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId?: string;
  userId?: string;
  role?: 'OWNER' | 'CASHIER' | 'SUPER_ADMIN';
}

const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function runWithTenantContext<T>(store: TenantStore, callback: () => T): T {
  return tenantStorage.run(store, callback);
}

export function getTenantContext(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function getTenantId(): string {
  const context = tenantStorage.getStore();
  if (!context?.tenantId) {
    throw new Error('SECURITY VIOLATION: Operation attempted without active tenantId context');
  }
  return context.tenantId;
}
