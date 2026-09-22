type UpdateCallback = (hasUpdate: boolean) => void;

class PWAService {
  private waitingWorker: ServiceWorker | null = null;
  private updateListeners: UpdateCallback[] = [];

  public register(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        // 1. If an updated worker is already waiting
        if (registration.waiting) {
          this.waitingWorker = registration.waiting;
          this.notifyListeners(true);
        }

        // 2. Listen for new incoming updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.waitingWorker = newWorker;
              this.notifyListeners(true);
            }
          });
        });

        // 3. Reload automatically when controller changes after skipWaiting
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        // Periodic update check every 30 minutes
        setInterval(() => {
          registration.update().catch(() => {});
        }, 30 * 60 * 1000);
      } catch (err) {
        console.warn('PWA registration error:', err);
      }
    });
  }

  public subscribeUpdate(callback: UpdateCallback): () => void {
    this.updateListeners.push(callback);
    return () => {
      this.updateListeners = this.updateListeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(hasUpdate: boolean): void {
    this.updateListeners.forEach((l) => l(hasUpdate));
  }

  public applyUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }
}

export const pwaService = new PWAService();

