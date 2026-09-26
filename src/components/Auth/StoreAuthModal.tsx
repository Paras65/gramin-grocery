import React, { useState, useEffect } from 'react';
import { Lock, Phone, Cloud, RefreshCw, LogOut, ShieldAlert, MapPin, Check, Building, ArrowRight, Gift } from 'lucide-react';
import { syncService, type SyncStatus } from '../../services/syncService';
import { lookupPincode } from '../../utils/pincodeService';

interface StoreAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWizard?: () => void;
}

export const StoreAuthModal: React.FC<StoreAuthModalProps> = ({ isOpen, onClose, onOpenWizard }) => {
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
  const [pincode, setPincode] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [detectedVillages, setDetectedVillages] = useState<string[]>([]);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe((status) => setSyncStatus(status));
    return () => unsub();
  }, []);

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setPincode(clean);
    if (clean.length === 6) {
      setIsLookingUpPin(true);
      try {
        const res = await lookupPincode(clean);
        if (res) {
          if (res.district) setDistrict(res.district);
          if (res.block) setBlock(res.block);
          if (res.villages && res.villages.length > 0) {
            setDetectedVillages(res.villages);
            setVillage(res.villages[0]);
          }
        }
      } catch (err) {
        console.warn('Pincode fetch error in modal:', err);
      } finally {
        setIsLookingUpPin(false);
      }
    }
  };

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
      const cleanStore = storeName.trim();
      const derivedOwner = ownerName.trim() || 
        cleanStore.replace(/(किराना|स्टोर|दुकान|जनरल|डेली नीड्स|daily needs)/gi, '').trim() || 
        cleanStore;

      await syncService.registerStore({
        storeName: cleanStore,
        ownerName: derivedOwner,
        phone: mobile.trim(),
        pin: pin.trim(),
        village: village.trim() || 'गाँव',
        block: block.trim() || village.trim() || 'ब्लॉक',
        district: district.trim() || 'रायपुर',
        referralCode: referralCode.trim() || undefined,
      });
      setIsLoggedIn(true);
      setStoreInfo(syncService.getStoreInfo());
      setUserInfo(syncService.getUserInfo());
      onClose();
      if (onOpenWizard) {
        onOpenWizard();
      }
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
              /* Register Form — Super-Easy 4-Field Onboarding with Dynamic Pincode Detection */
              <form onSubmit={handleRegister} className="space-y-2.5 text-left">
                {/* Field 1: Mobile Number */}
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] font-bold text-stone-700">📱 मोबाइल नंबर (10 अंक): *</label>
                    {mobile.length === 10 && (
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> सही नंबर
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="उदा. 98261XXXXX"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-emerald-600 bg-stone-50/50"
                    />
                  </div>
                </div>

                {/* Field 2: Dynamic Postal Pincode & Village Picker */}
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      डाक पिनकोड (Pincode - 6 अंक): *
                    </label>
                    {isLookingUpPin && (
                      <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> खोज रहे हैं...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="उदा. 493441"
                      className="w-28 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-black text-stone-900 tracking-wider text-center focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="text-[11px] text-stone-600 font-medium truncate flex-1">
                      📍 <span className="font-bold text-stone-900">{district}</span> • {block}
                    </div>
                  </div>

                  {/* Quick Village Chips from Pincode Directory */}
                  <div>
                    <span className="text-[10px] font-bold text-emerald-900 block mb-1">
                      गाँव चुनें (1-टैप चयन):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5">
                      {detectedVillages.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setVillage(v)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 border ${
                            village === v
                              ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                              : 'bg-white hover:bg-emerald-100 text-stone-800 border-emerald-200'
                          }`}
                        >
                          {village === v && <Check className="w-2.5 h-2.5 text-white" />}
                          <span>{v}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Village text if needed */}
                  <div className="pt-1 border-t border-emerald-200/50">
                    <input
                      type="text"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      placeholder="या अपने गाँव का नाम यहाँ लिखें"
                      className="w-full px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-xs font-semibold text-stone-900 outline-hidden"
                    />
                  </div>
                </div>

                {/* Field 3: Store Name */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                    🏪 दुकान का नाम (Store Name): *
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="जैसे: जय माँ बम्लेश्वरी किराना स्टोर"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-emerald-600 bg-stone-50/50"
                    />
                  </div>
                </div>

                {/* Field 4: 4-digit PIN */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                    🔒 नया 4-अंकों का गुप्त पिन (Secret PIN): *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
                    <input
                      type="password"
                      inputMode="numeric"
                      required
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 tracking-widest outline-hidden focus:border-emerald-600 bg-stone-50/50"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    रोज़ाना दुकान खोलने के लिए 4 अंकों का पिन
                  </span>
                </div>

                {/* Field 5: Optional Referral Code for +15 Extra Days */}
                <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-300/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-amber-950 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-600" />
                      <span>रेफरल कोड (Referral Code):</span>
                    </label>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-200/90 px-1.5 py-0.5 rounded-md">
                      +15 दिन अतिरिक्त प्रो
                    </span>
                  </div>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="उदा: REF-XXXX (वैकल्पिक)"
                    className="w-full px-3 py-1.5 border border-amber-300 rounded-xl text-xs font-black uppercase text-amber-950 tracking-wider bg-white outline-hidden focus:border-amber-600"
                  />
                  <p className="text-[10px] text-amber-900 m-0 font-medium">
                    💡 किसी साथी दुकानदार का कोड डालने पर 14 दिन की जगह पूरे <strong>29 दिन का प्रो मुफ़्त</strong> मिलेगा!
                  </p>
                </div>

                {/* Optional Advanced Details Expander */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                    className="text-[10px] font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAdvancedFields ? '▲ कम विवरण दिखाएं' : '▼ दुकानदार का नाम या ब्लॉक बदलें (वैकल्पिक)'}</span>
                  </button>

                  {showAdvancedFields && (
                    <div className="mt-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-left">
                      <div>
                        <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                          दुकानदार का नाम (Owner Name):
                        </label>
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="खाली छोड़ने पर दुकान के नाम से स्वतः सेट होगा"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                            ब्लॉक/तहसील:
                          </label>
                          <input
                            type="text"
                            value={block}
                            onChange={(e) => setBlock(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                            ज़िला:
                          </label>
                          <input
                            type="text"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || mobile.length < 10 || pin.length < 4 || !storeName.trim()}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    'पंजीकरण हो रहा है...'
                  ) : (
                    <>
                      <span>दुकान खाता बनाएं व चालू करें</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
