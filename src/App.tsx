import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
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
import { ProfitLossReport } from './components/Reports/ProfitLossReport';
import { UpdateNotificationBanner } from './components/Common/UpdateNotificationBanner';
import { SuperAdminDashboard } from './components/Admin/SuperAdminDashboard';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';
import { syncService } from './services/syncService';
import { adminService } from './services/adminService';
import type { UserRole } from './types';

const MainApp: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isMunimModalOpen, setIsMunimModalOpen] = useState<boolean>(false);
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [lowStockDismissed, setLowStockDismissed] = useState<boolean>(false);

  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => adminService.isSuperAdmin());
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());
  const [userRole, setUserRole] = useState<UserRole>(syncService.getRole());
  const [isDemoExploring, setIsDemoExploring] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('gk_exploring_demo') === 'true';
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

    return () => {
      unsub();
      unsubAdmin();
      window.removeEventListener('keydown', handleKeyDown);
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

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenVoice={() => setIsVoiceOpen(true)}
        onOpenStoreAuth={() => setIsAuthOpen(true)}
        onOpenMunimLogin={() => setIsMunimModalOpen(true)}
        onBackToLanding={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('gk_exploring_demo');
          }
          setIsDemoExploring(false);
        }}
      />

      {/* Low Stock Morning Alert Banner — shows once per session when logged in */}
      {!lowStockDismissed && (
        <LowStockAlertBanner onDismiss={() => setLowStockDismissed(true)} />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 pb-24 md:pb-8">
        {activeTab === 'pos' && (
          <QuickBilling initialSearchQuery={posSearchQuery} onSwitchToHaat={() => setActiveTab('haat')} />
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

      {/* Village Premium Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-amber-200/60 px-1 py-1.5 flex justify-around items-center shadow-lg"
      >
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'pos' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base">⚡</span>
          <span className="truncate max-w-[65px]">{t.tabs.pos}</span>
        </button>

        <button
          onClick={() => setActiveTab('khata')}
          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'khata' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base">📒</span>
          <span className="truncate max-w-[65px]">{t.tabs.khata}</span>
        </button>

        <button
          onClick={() => setActiveTab('cashClose')}
          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'cashClose' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base">🏦</span>
          <span className="truncate max-w-[65px]">{t.tabs.cashClose}</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'inventory' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base">📦</span>
          <span className="truncate max-w-[65px]">{t.tabs.inventory}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-1.5 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-0.5 cursor-pointer transition-colors ${
            activeTab === 'settings' 
              ? 'text-amber-950 bg-amber-100 ring-1 ring-amber-400/60' 
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <span className="text-base">⚙️</span>
          <span className="truncate max-w-[65px]">{t.tabs.settings}</span>
        </button>
      </nav>

    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
}
