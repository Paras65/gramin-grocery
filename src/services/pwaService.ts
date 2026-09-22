export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type UpdateCallback = (hasUpdate: boolean) => void;
type InstallCallback = (canInstall: boolean) => void;

class PWAService {
  private waitingWorker: ServiceWorker | null = null;
  private updateListeners: UpdateCallback[] = [];
  private installPrompt: BeforeInstallPromptEvent | null = null;
  private installListeners: InstallCallback[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.installPrompt = e as BeforeInstallPromptEvent;
        this.notifyInstallListeners(true);
      });

      window.addEventListener('appinstalled', () => {
        this.installPrompt = null;
        this.notifyInstallListeners(false);
      });
    }
  }

  public subscribeInstall(callback: InstallCallback): () => void {
    this.installListeners.push(callback);
    callback(!!this.installPrompt);
    return () => {
      this.installListeners = this.installListeners.filter((l) => l !== callback);
    };
  }

  private notifyInstallListeners(canInstall: boolean): void {
    this.installListeners.forEach((l) => l(canInstall));
  }

  public canInstall(): boolean {
    return !!this.installPrompt;
  }

  public async triggerInstall(): Promise<boolean> {
    if (!this.installPrompt) return false;
    try {
      await this.installPrompt.prompt();
      const choice = await this.installPrompt.userChoice;
      this.installPrompt = null;
      this.notifyInstallListeners(false);
      return choice.outcome === 'accepted';
    } catch {
      return false;
    }
  }

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

