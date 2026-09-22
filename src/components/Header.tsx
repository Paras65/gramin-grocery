import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, Globe, Mic, Store, Cloud, RefreshCw, ArrowRight, Sparkles, LogOut, Download, Printer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { syncService } from '../services/syncService';
import { SubscriptionModal } from './Subscription/SubscriptionModal';
import { pwaService } from '../services/pwaService';
import { 
  subscribePrinterStatus, connectBluetoothPrinter, disconnectBluetoothPrinter, 
  isBluetoothPrinterConnected, getConnectedPrinterName 
} from '../utils/thermalPrint';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenVoice: () => void;
  onOpenStoreAuth: () => void;
  onOpenMunimLogin?: () => void;
  onBackToLanding?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenVoice, onOpenStoreAuth, onOpenMunimLogin, onBackToLanding }) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storeInfo, setStoreInfo] = useState(syncService.getStoreInfo());
  const [userInfo, setUserInfo] = useState(syncService.getUserInfo());
  const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [demoBillsCount, setDemoBillsCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    const ls = localStorage.getItem('gk_last_sync');
    return ls ? new Date(ls).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  });
  const [canInstallPWA, setCanInstallPWA] = useState<boolean>(pwaService.canInstall());
  const [isPrinterConnected, setIsPrinterConnected] = useState<boolean>(isBluetoothPrinterConnected());
  const [connectedPrinterName, setConnectedPrinterName] = useState<string | undefined>(getConnectedPrinterName());
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [subStatus, setSubStatus] = useState(() => syncService.getSubscriptionStatus());

  const refreshAuthState = useCallback(async () => {
    setStoreInfo(syncService.getStoreInfo());
    setUserInfo(syncService.getUserInfo());
    setSubStatus(syncService.getSubscriptionStatus());
    const loggedIn = syncService.isLoggedIn();
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      const count = await syncService.getPendingSyncCount();
      setPendingCount(count);
      const ls = localStorage.getItem('gk_last_sync');
      if (ls) {
        setLastSyncTime(new Date(ls).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } else {
      const demoCount = await syncService.getDemoBillCount();
      setDemoBillsCount(demoCount);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshAuthState();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubAuth = syncService.subscribeAuth(() => {
      refreshAuthState();
    });

    const unsubSync = syncService.subscribe((status) => {
      setIsSyncing(status.isSyncing);
      if (status.lastSyncedAt) {
        setLastSyncTime(status.lastSyncedAt);
      }
      refreshAuthState();
    });

    const unsubInstall = pwaService.subscribeInstall((canInstall) => {
      setCanInstallPWA(canInstall);
    });

    const unsubPrinter = subscribePrinterStatus((connected, name) => {
      setIsPrinterConnected(connected);
      setConnectedPrinterName(name);
    });

    refreshAuthState();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubAuth();
      unsubSync();
      unsubInstall();
      unsubPrinter();
    };
  }, [refreshAuthState]);

  const handleStoreLogout = async () => {
    const pending = await syncService.getPendingSyncCount();
    if (pending > 0) {
      const ok = window.confirm(
        `⚠️ चेतावनी: आपके ${pending} बिल/खाता रिकॉर्ड्स अभी क्लाउड पर सुरक्षित नहीं हुए हैं!\n\nयदि आप अभी लॉगआउट करेंगे तो ऑफ़लाइन डेटा नष्ट हो सकता है।\n\nक्या आप सच में लॉगआउट करना चाहते हैं?`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm('क्या आप सच में अपनी दुकान से लॉगआउट करना चाहते हैं?');
      if (!ok) return;
    }
    await syncService.logout(true);
    refreshAuthState();
    if (onBackToLanding) {
      onBackToLanding();
    }
  };

  const tabs = [
    { id: 'pos', label: t.tabs.pos, icon: '⚡' },
    { id: 'haat', label: t.tabs.haat, icon: '🎪' },
    { id: 'khata', label: t.tabs.khata, icon: '📒' },
    { id: 'mandi', label: t.tabs.mandi, icon: '🛒' },
    { id: 'spoilage', label: t.tabs.spoilage, icon: '⚠️' },
    { id: 'inventory', label: t.tabs.inventory, icon: '📦' },
    { id: 'cashClose', label: t.tabs.cashClose, icon: '🏦' },
    { id: 'settings', label: t.tabs.settings, icon: '⚙️' },
  ];

  return (
    <header className="village-header-gradient text-white shadow-md sticky top-0 z-40">
      {/* Top Banner: Store Branding & Rural Counter Controls */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Store Branding with Auspicious Motif */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="bg-emerald-700/90 ring-1 ring-amber-400/40 p-2 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
            <Store className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-stone-50 m-0 truncate">
                {t.appName}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full shrink-0">
                छत्तीसगढ़ स्पेशल
              </span>
            </div>
            <p className="text-[11px] text-stone-400 m-0 hidden md:block truncate">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right Controls: Online Status, Cloud Sync, Voice, Language Toggle */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Offline/Online Status Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80'
                : 'bg-amber-950/90 text-amber-300 border-amber-600 animate-pulse'
            }`}
            title={isOnline ? t.online : t.offline}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden lg:inline">{isOnline ? t.online : t.offline}</span>
          </div>

          {/* Cloud Sync & Store Login Button */}
          <button
            onClick={onOpenStoreAuth}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer border ${
              syncService.isLoggedIn()
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                : 'bg-stone-800/90 text-stone-200 border-stone-700 hover:bg-stone-700 hover:border-amber-500/50'
            }`}
            title="दुकानदार खाता व क्लाउड सिंक"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-bold">
              {syncService.isLoggedIn() ? (syncService.getStoreInfo()?.storeName || 'क्लाउड सिंक') : 'दुकान लॉगिन'}
            </span>
          </button>

          {/* Munim / Counter Staff Login or Quick Exit */}
          {syncService.isLoggedIn() && syncService.getRole() === 'munim' ? (
            <button
              onClick={() => {
                syncService.clearMunimSession();
                refreshAuthState();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-950/90 text-amber-300 border border-amber-500/70 hover:bg-amber-900 transition cursor-pointer"
              title="मुनीम काउंटर बंद करें और मुख्य दुकानदार मोड में लौटें"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span>मुनीम बंद</span>
            </button>
          ) : syncService.isLoggedIn() && syncService.getStoreInfo()?.munimPin && onOpenMunimLogin ? (
            <button
              onClick={onOpenMunimLogin}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-800/90 text-amber-300 border border-stone-700 hover:bg-stone-700 transition cursor-pointer"
              title="मुनीम / काउंटर स्टाफ लॉगिन"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">मुनीम</span>
            </button>
          ) : null}

          {/* Voice Search / Mic Button */}
          <button
            onClick={onOpenVoice}
            className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
            title="बोलकर खोजें / Voice Assistant"
          >
            <Mic className="w-3.5 h-3.5 text-stone-950" />
            <span className="hidden md:inline">बोलकर खोजें</span>
          </button>


          {/* Trilingual Language Toggle (Hindi -> Chhattisgarhi -> English) */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-stone-100 transition-colors cursor-pointer"
            title="भाषा बदलव / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300">
              {language === 'hi' ? 'हिन्दी' : language === 'cg' ? 'छत्तीसगढ़ी' : 'English'}
            </span>
          </button>
        </div>
      </div>

      {/* Active Multi-Tenant Store Identity & Live Sync Strip */}
      <div className="bg-stone-950/80 border-t border-stone-800/90 px-3 sm:px-6 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {isLoggedIn && storeInfo ? (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="flex items-center gap-1.5 font-black text-amber-300">
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">{storeInfo.storeName}</span>
              </span>
              {storeInfo.village && (
                <span className="text-stone-400 text-[11px] font-medium truncate">
                  📍 {storeInfo.village}, {storeInfo.district}
                </span>
              )}
              {/* Role badge */}
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                userInfo?.role === 'OWNER'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
              }`}>
                {userInfo?.role === 'OWNER' ? '👑 दुकानदार' : '💼 मुनीम'}
              </span>

              {/* Subscription Plan Badge */}
              <button
                onClick={() => setIsSubModalOpen(true)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer flex items-center gap-1 ${
                  subStatus.isPro
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 hover:bg-amber-400/30'
                    : subStatus.isExpired
                    ? 'bg-amber-500/25 text-amber-300 border-amber-400/60 hover:bg-amber-500/35'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                }`}
                title="प्लान व सुविधाएं देखें"
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>{subStatus.isPro ? 'प्रो' : subStatus.isExpired ? 'योजना समाप्त' : 'मुफ़्त प्लान'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <button
                onClick={onOpenStoreAuth}
                className="flex items-center gap-1.5 text-[11px] text-amber-300/90 hover:text-amber-200 cursor-pointer font-medium"
              >
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-md font-bold text-[10px]">
                  डेमो ({Math.max(0, 15 - demoBillsCount)}/15 बिल बाकी)
                </span>
                <span className="truncate">अपनी दुकान जोड़ें</span>
                <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
              </button>

              <button
                onClick={() => setIsSubModalOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-200 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 px-2 py-0.5 rounded-md transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>सुविधाएं व प्लान</span>
              </button>
            </div>
          )}

          {/* Right side of strip: Live Sync status, Printer, PWA install OR Exit Demo */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
            {/* PWA In-App Install Prompt Button */}
            {canInstallPWA && (
              <button
                onClick={() => pwaService.triggerInstall()}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-300 px-2 py-0.5 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                title="ग्रामीण किराना ऐप फोन या कंप्यूटर में इंस्टॉल करें"
              >
                <Download className="w-3 h-3 text-amber-950" />
                <span className="hidden sm:inline">ऐप इंस्टॉल करें</span>
                <span className="sm:hidden">इंस्टॉल</span>
              </button>
            )}

            {/* Bluetooth Thermal Printer Quick Status Badge */}
            <button
              onClick={async () => {
                if (!isPrinterConnected) {
                  await connectBluetoothPrinter();
                } else {
                  disconnectBluetoothPrinter();
                }
              }}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                isPrinterConnected
                  ? 'bg-emerald-900/70 text-emerald-200 border-emerald-500 hover:bg-emerald-800'
                  : 'bg-stone-800/80 text-stone-300 border-stone-600 hover:bg-stone-700'
              }`}
              title={isPrinterConnected ? `${connectedPrinterName || 'प्रिंटर'} कनेक्टेड (क्लिक कर डिस्कनेक्ट करें)` : 'ब्लूटूथ 58mm प्रिंटर जोड़ें'}
            >
              <Printer className={`w-3 h-3 ${isPrinterConnected ? 'text-emerald-400' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">
                {isPrinterConnected ? 'प्रिंटर कनेक्टेड' : 'प्रिंटर जोड़ें'}
              </span>
            </button>

            {!isLoggedIn && onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 text-xs font-black text-rose-200 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 px-2.5 py-1 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                title="लाइव डेमो बंद करें और लॉगिन / वेलकम पेज पर जाएं"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>डेमो से बाहर निकलें (Exit Demo)</span>
              </button>
            )}

            {isLoggedIn && (
              <div className="flex items-center gap-2">
                {lastSyncTime && (
                  <span className="hidden sm:inline-block text-[10px] text-stone-400 font-medium">
                    अंतिम सिंक: {lastSyncTime}
                  </span>
                )}
                <button
                  onClick={async () => {
                    await syncService.triggerSync();
                    refreshAuthState();
                  }}
                  disabled={isSyncing || !isOnline}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 ${
                    pendingCount > 0
                      ? 'bg-amber-900/70 text-amber-200 border-amber-500 hover:bg-amber-800'
                      : 'bg-emerald-950/70 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                  }`}
                  title={isOnline ? 'क्लाउड बैकअप सुरक्षित करें (1-क्लिक सिंक)' : 'इंटरनेट बंद है (ऑफ़लाइन)'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-300' : 'text-emerald-400'}`} />
                  <span>
                    {isSyncing
                      ? 'सिंक चालू है...'
                      : pendingCount > 0
                      ? `${pendingCount} बाकी • अभी सिंक करें`
                      : '🟢 बैकअप सुरक्षित • सिंक करें'}
                  </span>
                </button>

                {/* Direct 1-Tap Store Logout Button */}
                <button
                  onClick={handleStoreLogout}
                  className="flex items-center gap-1 text-[11px] font-bold text-rose-200 hover:text-white bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 px-2.5 py-1 rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                  title="दुकान खाते से सुरक्षित लॉगआउट करें"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>लॉगआउट</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Non-intrusive Graceful Downgrade Reminder Banner */}
      {isLoggedIn && subStatus.isExpired && (
        <div className="bg-amber-950/90 border-t border-b border-amber-500/40 px-3 sm:px-6 py-1.5 text-xs text-amber-200">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>सूचना:</strong> प्रो योजना समाप्त हो गई है। दुकान की ऑफ़लाइन बिलिंग, बही-खाता व प्रिंटिंग सामान्य रूप से चालू है।
              </span>
            </div>
            <button
              onClick={() => setIsSubModalOpen(true)}
              className="text-[11px] font-bold text-amber-300 hover:text-white underline shrink-0 cursor-pointer"
            >
              नवीनीकरण करें &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Bar for Desktop & Tablet */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 border-t border-stone-800/80">
        <nav className="flex flex-wrap gap-1.5 py-1.5">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                    : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Subscription & Features Showcase Modal */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        onOpenStoreAuth={onOpenStoreAuth}
      />
    </header>
  );
};
