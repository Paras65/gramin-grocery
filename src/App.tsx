import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { initializeDatabaseIfEmpty, seedDemoSandboxData } from './db';
import { Header } from './components/Header';
import { QuickBilling } from './components/POS/QuickBilling';
import { KhataLedger } from './components/Khata/KhataLedger';
import { MandiPlanner } from './components/Mandi/MandiPlanner';
import { SpoilageExpiryGuard } from './components/Inventory/SpoilageExpiryGuard';
import { AllStock } from './components/Inventory/AllStock';
import { BackupRestore } from './components/Settings/BackupRestore';
import { VoiceAssistantModal } from './components/Voice/VoiceAssistantModal';
import { StoreAuthModal } from './components/Auth/StoreAuthModal';
import { MunimLoginModal } from './components/Auth/MunimLoginModal';
import { DailyCashClose } from './components/CashClose/DailyCashClose';
import { HaatBazaarMode } from './components/Haat/HaatBazaarMode';
import { WelcomeLandingPage } from './components/Landing/WelcomeLandingPage';
import { LowStockAlertBanner } from './components/Inventory/LowStockAlertBanner';
import { ExpiringSoonAlertBanner } from './components/Inventory/ExpiringSoonAlertBanner';
import { ProfitLossReport } from './components/Reports/ProfitLossReport';
import { UpdateNotificationBanner } from './components/Common/UpdateNotificationBanner';
import { AnnouncementBanner } from './components/Common/AnnouncementBanner';
import { SuperAdminDashboard } from './components/Admin/SuperAdminDashboard';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';
import { StoreSetupWizardModal } from './components/Auth/StoreSetupWizardModal';
import { CustomerPassbookModal } from './components/Khata/CustomerPassbookModal';
import { AppTourGuideModal } from './components/Onboarding/AppTourGuideModal';
import { useLiveQuery } from 'dexie-react-hooks';
import { syncService } from './services/syncService';
import { adminService } from './services/adminService';
import type { Customer, UserRole } from './types';
import { db } from './db';
import { getTodayISODate } from './utils/formatters';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isMunimModalOpen, setIsMunimModalOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [lowStockDismissed, setLowStockDismissed] = useState<boolean>(false);
  const [expiringSoonDismissed, setExpiringSoonDismissed] = useState<boolean>(false);

  // Proactive Evening Cash Close Reminder (after 7 PM / 19:00 if sales exist but cash close is unverified)
  const isEveningCashCloseDue = useLiveQuery(async () => {
    const hour = new Date().getHours();
    if (hour < 19) return false;
    const today = getTodayISODate();
    const alreadyClosed = await db.dailyCashClose.where('date').equals(today).first();
    if (alreadyClosed) return false;
    const startOfDay = `${today}T00:00:00.000Z`;
    const todaySalesCount = await db.sales.where('timestamp').aboveOrEqual(startOfDay).count();
    return todaySalesCount > 0;
  }, []) || false;

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => adminService.isSuperAdmin());
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  const [isStoreWizardOpen, setIsStoreWizardOpen] = useState<boolean>(false);
  const [passbookCustomerId, setPassbookCustomerId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#passbook=')) {
        return hash.replace('#passbook=', '').trim();
      }
    }
    return null;
  });
  const [passbookCustomer, setPassbookCustomer] = useState<Customer | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());
  const [userRole, setUserRole] = useState<UserRole>(syncService.getRole());
  const [isDemoExploring, setIsDemoExploring] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gk_exploring_demo') === 'true';
    }
    return false;
  });

  // First-Time User Onboarding & Guided Practice States
  const [isTourGuideOpen, setIsTourGuideOpen] = useState<boolean>(false);
  const [isGuidedTourActive, setIsGuidedTourActive] = useState<boolean>(false);
  const [hasDismissedWelcomeBanner, setHasDismissedWelcomeBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gk_first_bill_tour_completed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    initializeDatabaseIfEmpty()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Database initialization error:', err);
        setIsDbReady(true);
      });

    const unsub = syncService.subscribeAuth(() => {
      const loggedIn = syncService.isLoggedIn();
      setIsLoggedIn(loggedIn);
      setUserRole(syncService.getRole());
      if (loggedIn) {
        setIsDemoExploring(false);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('gk_exploring_demo');
        }
      }
    });

    const unsubAdmin = adminService.subscribe(() => {
      setIsAdminMode(adminService.isSuperAdmin());
    });

    // Hidden trigger for Super Admin: URL param (?admin=1 or #admin)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('admin') || window.location.hash === '#admin') {
        setIsAdminLoginOpen(true);
      }
    }

    // Secret shortcut trigger for Super Admin: Ctrl+Shift+A or Alt+Shift+A
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminLoginOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Customer Passbook Hash listener (#passbook=CUSTOMER_ID)
    const checkPassbookHash = async () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      if (hash.startsWith('#passbook=')) {
        const custId = hash.replace('#passbook=', '').trim();
        setPassbookCustomerId(custId);
        if (custId) {
          try {
            const cust = await db.customers.get(custId);
            if (cust) {
              setPassbookCustomer(cust);
            }
          } catch (err) {
            console.warn('Passbook customer lookup error:', err);
          }
        }
      } else {
        setPassbookCustomerId(null);
        setPassbookCustomer(null);
      }
    };

    window.addEventListener('hashchange', checkPassbookHash);
    checkPassbookHash();

    return () => {
      unsub();
      unsubAdmin();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hashchange', checkPassbookHash);
    };
  }, []);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-[#fbf9f4] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-black text-stone-900 tracking-tight">ग्रामीण किराना शुरू हो रहा है...</h2>
        <p className="text-xs text-stone-600 mt-1">डेटाबेस व खाता तैयार किया जा रहा है</p>
      </div>
    );
  }

  // Standalone Customer Passbook View (Directly opened via WhatsApp #passbook= link)
  if (passbookCustomerId) {
    if (passbookCustomer) {
      return (
        <CustomerPassbookModal
          customer={passbookCustomer}
          isOpen={true}
          onClose={() => {
            window.location.hash = '';
            setPassbookCustomerId(null);
            setPassbookCustomer(null);
          }}
          isStandalone={true}
        />
      );
    }
    return (
      <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-stone-800 border border-stone-700 p-6 rounded-3xl max-w-sm w-full space-y-3 shadow-2xl">
          <div className="text-3xl">📖</div>
          <h3 className="text-lg font-black">डिजिटल पासबुक लोड हो रहा है...</h3>
          <p className="text-xs text-stone-400">यदि ग्राहक रिकॉर्ड नहीं मिलता है, तो कृपया दुकानदार से नया लिंक भेजने का अनुरोध करें।</p>
          <button
            onClick={() => {
              window.location.hash = '';
              setPassbookCustomerId(null);
            }}
            className="mt-3 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl text-xs font-bold text-stone-200 cursor-pointer"
          >
            मुख्य पेज पर जाएं
          </button>
        </div>
      </div>
    );
  }

  // Super Admin Command Center Mode
  if (isAdminMode) {
    return (
      <SuperAdminDashboard
        onExit={() => {
          setIsAdminMode(false);
        }}
      />
    );
  }

  // Pre-Login Gateway: Show Welcome Landing Page if not authenticated and not exploring demo
  if (!isLoggedIn && !isDemoExploring) {
    return (
      <>
        <WelcomeLandingPage
          onExploreDemo={async () => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('gk_exploring_demo', 'true');
            }
            await seedDemoSandboxData();
            setIsDemoExploring(true);
          }}
          onLoginSuccess={() => {
            setIsLoggedIn(true);
            setIsDemoExploring(false);
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('gk_exploring_demo');
            }
          }}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        />
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => setIsAdminLoginOpen(false)}
          onSuccess={() => setIsAdminMode(true)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f4] flex flex-col text-stone-900 selection:bg-amber-600 selection:text-white">
      {/* PWA Update Prompt Banner (1-Tap Refresh) */}
      <UpdateNotificationBanner />

      {/* Global / Targeted Platform Announcement Banner */}
      <AnnouncementBanner />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenStoreAuth={() => setIsAuthOpen(true)}
        onOpenMunimLogin={() => setIsMunimModalOpen(true)}
        onOpenWizard={() => setIsStoreWizardOpen(true)}
        onBackToLanding={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('gk_exploring_demo');
          }
          setIsDemoExploring(false);
        }}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        isEveningCashCloseDue={isEveningCashCloseDue}
        onOpenTour={() => setIsTourGuideOpen(true)}
      />

      {/* Low Stock Morning Alert Banner — shows once per session when logged in */}
      {!lowStockDismissed && (
        <LowStockAlertBanner onDismiss={() => setLowStockDismissed(true)} />
      )}

      {/* Expiring Goods Morning Counter Alert Banner — shows once per session when logged in */}
      {!expiringSoonDismissed && (
        <ExpiringSoonAlertBanner onDismiss={() => setExpiringSoonDismissed(true)} />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 pb-24 md:pb-8">
        {activeTab === 'pos' && (
          <>
            {/* Non-intrusive First-Time Onboarding Welcome Prompt Banner on POS */}
            {!hasDismissedWelcomeBanner && !isGuidedTourActive && (
              <div className="mb-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-400/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                    ✨
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900 m-0">
                      {(t as any).tour?.welcomePrompt?.title || 'नमस्ते! क्या आप 1 मिनट में पहला बिल बनाना सीखना चाहते हैं?'}
                    </h4>
                    <p className="text-xs text-stone-600 m-0 mt-0.5">
                      बिना किसी डर के अभ्यास बिल बनाएं — असली बही-खाते और स्टॉक में कोई बदलाव नहीं होगा।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setHasDismissedWelcomeBanner(true);
                      localStorage.setItem('gk_first_bill_tour_completed', 'true');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 transition cursor-pointer"
                  >
                    {(t as any).tour?.welcomePrompt?.dismissBtn || 'बाद में'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsGuidedTourActive(true);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{(t as any).tour?.welcomePrompt?.startBtn || '🚀 हाँ, अभ्यास बिल सीखें'}</span>
                  </button>
                </div>
              </div>
            )}

            <QuickBilling 
              initialSearchQuery={posSearchQuery} 
              onSwitchToHaat={() => setActiveTab('haat')}
              isGuidedTourActive={isGuidedTourActive}
              onExitGuidedTour={() => {
                setIsGuidedTourActive(false);
                setHasDismissedWelcomeBanner(true);
              }}
            />
          </>
        )}
        {activeTab === 'haat' && <HaatBazaarMode />}
        {activeTab === 'khata' && <KhataLedger />}
        {/* Munim role: block mandi procurement planning */}
        {activeTab === 'mandi' && userRole === 'munim' && (
          <div className="text-center py-16 text-stone-500">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-base text-stone-700">मंडी खरीदारी योजना — केवल दुकानदार</p>
            <p className="text-xs mt-1">थोक भाव व खरीदारी बजट केवल दुकानदार खाते में उपलब्ध है।</p>
          </div>
        )}
        {activeTab === 'mandi' && userRole === 'owner' && <MandiPlanner />}
        {activeTab === 'spoilage' && <SpoilageExpiryGuard />}
        {activeTab === 'inventory' && <AllStock />}
        {/* Munim role: block profit/loss reports */}
        {activeTab === 'reports' && userRole === 'munim' && (
          <div className="text-center py-16 text-stone-500">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-base text-stone-700">माहवारी लाभ-हानि रिपोर्ट — केवल दुकानदार</p>
            <p className="text-xs mt-1">दुकान का शुद्ध मुनाफ़ा व वित्तीय रिपोर्ट मुनीम लॉगिन में बंद है।</p>
          </div>
        )}
        {activeTab === 'reports' && userRole === 'owner' && <ProfitLossReport />}
        {/* Munim role: block cashClose and settings tabs */}
        {activeTab === 'cashClose' && userRole === 'munim' && (
          <div className="text-center py-16 text-stone-500">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-base text-stone-700">गल्ला हिसाब — केवल दुकानदार</p>
            <p className="text-xs mt-1">यह सुविधा मुनीम लॉगिन में बंद है। दुकानदार PIN से लॉगिन करें।</p>
          </div>
        )}
        {activeTab === 'cashClose' && userRole === 'owner' && <DailyCashClose />}
        {activeTab === 'settings' && userRole === 'munim' && (
          <div className="text-center py-16 text-stone-500">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-bold text-base text-stone-700">सेटिंग्स व बैकअप — केवल दुकानदार</p>
            <p className="text-xs mt-1">यह सुविधा मुनीम लॉगिन में बंद है।</p>
          </div>
        )}
        {activeTab === 'settings' && userRole === 'owner' && <BackupRestore />}
      </main>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onApplySearch={(query) => {
          setPosSearchQuery(query);
          setActiveTab('pos');
        }}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Multi-Tenant Store Login & Cloud Sync Modal */}
      <StoreAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenWizard={() => setIsStoreWizardOpen(true)}
      />

      {/* 1-Click Store Onboarding Wizard */}
      <StoreSetupWizardModal
        isOpen={isStoreWizardOpen}
        onClose={() => setIsStoreWizardOpen(false)}
        onComplete={() => {
          setIsStoreWizardOpen(false);
          setActiveTab('pos');
        }}
      />

      {/* Munim / Counter Staff Login Modal */}
      <MunimLoginModal
        isOpen={isMunimModalOpen}
        onClose={() => setIsMunimModalOpen(false)}
        onSuccess={() => {
          setIsMunimModalOpen(false);
          setUserRole('munim');
        }}
      />

      {/* Platform Super Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => setIsAdminMode(true)}
      />

      {/* Village Premium Mobile Bottom Navigation Bar (Ultra-Ergonomic: ~52px) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-amber-200/60 px-1 py-1 flex justify-around items-center shadow-lg"
      >
        <button
          onClick={() => { setActiveTab('pos'); setIsMoreMenuOpen(false); }}
          className={`flex-1 py-1 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'pos' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base leading-none">⚡</span>
          <span className="truncate max-w-[65px] leading-tight">{t.tabs.pos}</span>
        </button>

        <button
          onClick={() => { setActiveTab('haat'); setIsMoreMenuOpen(false); }}
          className={`flex-1 py-1 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'haat' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base leading-none">🎪</span>
          <span className="truncate max-w-[65px] leading-tight">{t.tabs.haat}</span>
        </button>

        <button
          onClick={() => { setActiveTab('khata'); setIsMoreMenuOpen(false); }}
          className={`flex-1 py-1 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'khata' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base leading-none">📒</span>
          <span className="truncate max-w-[65px] leading-tight">{t.tabs.khata}</span>
        </button>

        <button
          onClick={() => { setActiveTab('cashClose'); setIsMoreMenuOpen(false); }}
          className={`flex-1 py-1 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors relative ${
            activeTab === 'cashClose' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
          title={isEveningCashCloseDue ? 'शाम का गल्ला मिलान बाकी है' : undefined}
        >
          <span className="text-base leading-none relative">
            🏦
            {isEveningCashCloseDue && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
          </span>
          <span className="truncate max-w-[65px] leading-tight">{t.tabs.cashClose}</span>
        </button>

        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex-1 py-1 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            ['mandi', 'spoilage', 'inventory', 'reports', 'settings'].includes(activeTab) || isMoreMenuOpen
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base leading-none">☰</span>
          <span className="truncate max-w-[65px] leading-tight">{t.tabs.more || 'मेनू'}</span>
        </button>
      </nav>

      {/* Mobile More Navigation Sheet */}
      {isMoreMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs md:hidden animate-fade-in">
          <div className="w-full bg-[#fbf9f4] border-t border-amber-400/60 rounded-t-3xl p-5 text-stone-900 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-black text-stone-900 m-0 flex items-center gap-2">
                <span>☰ अतिरिक्त सुविधाएं (More)</span>
              </h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center cursor-pointer font-bold active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => { setActiveTab('mandi'); setIsMoreMenuOpen(false); }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] ${
                  activeTab === 'mandi' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <span className="text-2xl">🛒</span>
                <span className="text-xs font-bold">{t.tabs.mandi}</span>
                <span className="text-[10px] text-stone-500 font-medium">थोक खरीदारी व मंडी लिस्ट</span>
              </button>

              <button
                onClick={() => { setActiveTab('spoilage'); setIsMoreMenuOpen(false); }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] ${
                  activeTab === 'spoilage' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <span className="text-2xl">⚠️</span>
                <span className="text-xs font-bold">{t.tabs.spoilage}</span>
                <span className="text-[10px] text-stone-500 font-medium">खराबी व एक्सपायरी गार्ड</span>
              </button>

              <button
                onClick={() => { setActiveTab('inventory'); setIsMoreMenuOpen(false); }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] ${
                  activeTab === 'inventory' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <span className="text-2xl">📦</span>
                <span className="text-xs font-bold">{t.tabs.inventory}</span>
                <span className="text-[10px] text-stone-500 font-medium">स्टॉक, भाव व बारकोड</span>
              </button>

              {userRole === 'owner' && (
                <button
                  onClick={() => { setActiveTab('reports'); setIsMoreMenuOpen(false); }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] ${
                    activeTab === 'reports' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-white border-stone-200 text-stone-800'
                  }`}
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-xs font-bold">माहवारी P&L रिपोर्ट</span>
                  <span className="text-[10px] text-stone-500 font-medium">शुद्ध नफ़ा व बिक्री PDF</span>
                </button>
              )}

              <button
                onClick={() => { setActiveTab('settings'); setIsMoreMenuOpen(false); }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] ${
                  activeTab === 'settings' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-white border-stone-200 text-stone-800'
                }`}
              >
                <span className="text-2xl">⚙️</span>
                <span className="text-xs font-bold">{t.tabs.settings}</span>
                <span className="text-[10px] text-stone-500 font-medium">डेटा बैकअप, प्रिंटर व UPI</span>
              </button>

              <button
                onClick={() => { setIsStoreWizardOpen(true); setIsMoreMenuOpen(false); }}
                className="p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-300 text-stone-800"
              >
                <span className="text-2xl">🚀</span>
                <span className="text-xs font-black text-amber-950">दुकान सेटअप विज़ार्ड</span>
                <span className="text-[10px] text-amber-800 font-medium">52 किराना सामान व UPI लोड</span>
              </button>

              <button
                onClick={() => { setIsTourGuideOpen(true); setIsMoreMenuOpen(false); }}
                className="p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition cursor-pointer active:scale-[0.98] bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400 text-stone-800"
              >
                <span className="text-2xl">❓</span>
                <span className="text-xs font-black text-amber-950">1 मिनट में ऐप सीखें</span>
                <span className="text-[10px] text-amber-800 font-medium">सचित्र गाइड व अभ्यास बिल</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Minute Visual Tour & Guided Practice Modal */}
      <AppTourGuideModal
        isOpen={isTourGuideOpen}
        onClose={() => setIsTourGuideOpen(false)}
        onStartPracticeBill={() => {
          setIsTourGuideOpen(false);
          setActiveTab('pos');
          setIsGuidedTourActive(true);
        }}
        userRole={userRole}
      />

    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ConfirmProvider>
        <MainApp />
      </ConfirmProvider>
    </LanguageProvider>
  );
}
