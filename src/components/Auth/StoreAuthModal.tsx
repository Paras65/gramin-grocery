import React, { useState, useEffect } from 'react';
import { Lock, Phone, Cloud, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { syncService, type SyncStatus } from '../../services/syncService';

interface StoreAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreAuthModal: React.FC<StoreAuthModalProps> = ({ isOpen, onClose }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(syncService.isLoggedIn());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isSyncing: false });
  const [storeInfo, setStoreInfo] = useState(syncService.getStoreInfo());
  const [userInfo, setUserInfo] = useState(syncService.getUserInfo());

  // Form states
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [village, setVillage] = useState('आरंग (Arang)');
  const [district, setDistrict] = useState('रायपुर (Raipur)');
  const [block, setBlock] = useState('आरंग');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe((status) => setSyncStatus(status));
    return () => unsub();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await syncService.login(mobile, pin);
      setIsLoggedIn(true);
      setStoreInfo(syncService.getStoreInfo());
      setUserInfo(syncService.getUserInfo());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'लॉगिन विफल रहा');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await syncService.registerStore({
        storeName,
        ownerName,
        phone: mobile,
        pin,
        village,
        block,
        district,
      });
      setIsLoggedIn(true);
      setStoreInfo(syncService.getStoreInfo());
      setUserInfo(syncService.getUserInfo());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'दुकान पंजीकरण विफल रहा');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSync = async () => {
    await syncService.triggerSync();
  };

  const handleLogout = async () => {
    const pending = await syncService.getPendingSyncCount();
    if (pending > 0) {
      const ok = window.confirm(
        `चेतावनी: आपके ${pending} बिल/खाता रिकॉर्ड्स अभी क्लाउड पर सुरक्षित नहीं हुए हैं!\n\nयदि आप अभी लॉगआउट करेंगे तो डेटा नष्ट हो सकता है।\n\nक्या आप सच में लॉगआउट करना चाहते हैं?`
      );
      if (!ok) return;
    }
    await syncService.logout(true);
    setIsLoggedIn(false);
    setStoreInfo(null);
    setUserInfo(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-base m-0">
              {isLoggedIn ? 'क्लाउड सिंक व दुकान खाता' : 'दुकानदार लॉगिन व क्लाउड बैकअप'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="my-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoggedIn ? (
          /* Logged In View */
          <div className="py-4 space-y-4">
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">दुकान (Store):</span>
                <span className="font-bold text-stone-900 text-sm">{storeInfo?.storeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">स्थान:</span>
                <span className="font-semibold text-stone-700 text-xs">
                  {storeInfo?.village}, {storeInfo?.district}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">लॉगिन उपयोगकर्ता:</span>
                <span className="font-semibold text-stone-700 text-xs flex items-center gap-1">
                  <span>{userInfo?.name}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                    {userInfo?.role === 'OWNER' ? 'दुकानदार (Owner)' : 'मुनीम (Cashier)'}
                  </span>
                </span>
              </div>
            </div>

            {/* Sync Card */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-950 block">मल्टी-टेनेंट क्लाउड सिंक</span>
                <span className="text-[11px] text-emerald-800">
                  {syncStatus.isSyncing
                    ? 'सिंक हो रहा है...'
                    : syncStatus.lastSyncedAt
                    ? `अंतिम सिंक: आज ${syncStatus.lastSyncedAt}`
                    : 'सिंक के लिए तैयार'}
                </span>
              </div>

              <button
                onClick={handleManualSync}
                disabled={syncStatus.isSyncing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
                <span>सिंक करें</span>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-500" />
              <span>लॉगआउट करें</span>
            </button>
          </div>
        ) : (
          /* Login or Register Tabs */
          <div className="pt-3">
            <div className="flex rounded-xl bg-stone-100 p-1 mb-4">
              <button
                onClick={() => setIsLoginView(true)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isLoginView ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                }`}
              >
                लॉगिन (Login)
              </button>
              <button
                onClick={() => setIsLoginView(false)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !isLoginView ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                }`}
              >
                + नई दुकान जोड़ें
              </button>
            </div>

            {isLoginView ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    मोबाइल नंबर (Mobile Number): *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="9826123456"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 outline-hidden focus:border-emerald-600 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    4-अंकों का गुप्त पिन (4-Digit PIN): *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-lg tracking-widest text-stone-900 outline-hidden focus:border-emerald-600 font-bold"
                    />
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `नमस्ते Gramin Kirana टीम, मैं अपना स्टोर लॉगिन पिन भूल गया हूँ। मेरा रजिस्टर्ड मोबाइल नंबर ${mobile || '_____'} है। कृपया पिन रीसेट करने में सहायता करें।`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 underline decoration-emerald-500/60"
                    >
                      पिन भूल गए? (Forgot PIN)
                    </a>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'प्रमाणित हो रहा है...' : 'सुरक्षित लॉगिन करें'}
                </button>
              </form>
            ) : (
              /* Register Form */
              <form onSubmit={handleRegister} className="space-y-2.5 text-left">
                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">दुकान का नाम: *</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="उदा. रमेश किराना एवं डेली नीड्स"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">दुकानदार का नाम: *</label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="उदा. रमेश साहू"
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">मोबाइल नंबर: *</label>
                    <input
                      type="text"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="98261XXXXX"
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">गाँव: *</label>
                    <input
                      type="text"
                      required
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">ब्लॉक/तहसील: *</label>
                    <input
                      type="text"
                      required
                      value={block}
                      onChange={(e) => setBlock(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">जिला: *</label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-stone-700 block mb-0.5">नया 4-अंकों का पिन (PIN): *</label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="उदा. 1234"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs outline-hidden font-bold tracking-widest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'पंजीकरण हो रहा है...' : 'दुकान खाता बनाएं व चालू करें'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
