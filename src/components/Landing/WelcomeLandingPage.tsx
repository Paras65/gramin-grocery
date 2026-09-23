import React, { useState } from 'react';
import {
  Store,
  WifiOff,
  Printer,
  Smartphone,
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Phone,
  Building,
  Flame,
  Layers,
  Clock,
  MapPin,
  RefreshCw,
  Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import { lookupPincode } from '../../utils/pincodeService';

interface WelcomeLandingPageProps {
  onExploreDemo: () => void;
  onLoginSuccess: () => void;
}

export const WelcomeLandingPage: React.FC<WelcomeLandingPageProps> = ({
  onExploreDemo,
  onLoginSuccess,
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginMobile, setLoginMobile] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Register form state
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPincode, setRegPincode] = useState('493441');
  const [village, setVillage] = useState('आरंग');
  const [block, setBlock] = useState('आरंग');
  const [district, setDistrict] = useState('रायपुर (Raipur)');
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [detectedVillages, setDetectedVillages] = useState<string[]>(['आरंग', 'भानसोज', 'लखोली', 'गुल्लू', 'रसनी']);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePincodeChange = async (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 6);
    setRegPincode(clean);
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
        console.warn('Pincode fetch error:', err);
      } finally {
        setIsLookingUpPin(false);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await syncService.login(loginMobile, loginPin);
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'लॉगिन विफल रहा। कृपया मोबाइल व पिन जांचें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const cleanStore = storeName.trim();
      const derivedOwner = ownerName.trim() || 
        cleanStore.replace(/(किराना|स्टोर|दुकान|जनरल|डेली नीड्स|daily needs)/gi, '').trim() || 
        cleanStore;

      await syncService.registerStore({
        storeName: cleanStore,
        ownerName: derivedOwner,
        phone: regMobile.trim(),
        pin: regPin.trim(),
        village: village.trim() || 'गाँव',
        block: block.trim() || village.trim() || 'ब्लॉक',
        district: district.trim() || 'रायपुर',
      });
      onLoginSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'पंजीकरण विफल रहा। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f3] text-stone-900 flex flex-col selection:bg-amber-600 selection:text-white">
      {/* Top Navbar */}
      <header className="village-header-gradient text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-700/90 ring-1 ring-amber-400/40 p-2 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Store className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-stone-50 m-0">
                  {t.appName}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded-full">
                  छत्तीसगढ़ स्पेशल
                </span>
              </div>
              <p className="text-[11px] text-stone-400 m-0 hidden sm:block">
                100% ऑफ़लाइन डिजिटल बिलिंग व बही-खाता
              </p>
            </div>
          </div>

          {/* Right Actions: Language + Try Demo */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 hover:border-amber-500/60 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 transition cursor-pointer"
              title="भाषा बदलें"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'hi' ? 'हिन्दी' : language === 'cg' ? 'छत्तीसगढ़ी' : 'English'}</span>
            </button>

            <button
              onClick={onExploreDemo}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
            >
              <span>🎪 डेमो चलाएं</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Gateway */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Hero Copy & Value Props */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>गाँव के किराना, जनरल स्टोर व दैनिक बाज़ार के लिए समर्पित</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-stone-950 tracking-tight leading-[1.15]">
              बिना इंटरनेट के चलाएं अपनी दुकान का{' '}
              <span className="text-amber-700 underline decoration-amber-400/80 decoration-wavy">
                डिजिटल बही-खाता
              </span>{' '}
              व तुरंत बिलिंग
            </h1>

            <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-medium max-w-2xl">
              गाँव में बिजली कटे या मोबाइल नेटवर्क न मिले, आपकी दुकान का काम <strong>1 सेकंड भी नहीं रुकेगा</strong>।
              ग्राहकों का उधार हिसाब, ब्लूटूथ 58mm पर्ची प्रिंटिंग, कैमरा बारकोड स्कैनर और हाट-बाज़ार 1-टैप नकद काउंटर — सब कुछ 100% सुरक्षित।
            </p>

            {/* Pillar Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs text-center">
                <WifiOff className="w-5 h-5 text-emerald-700 mx-auto mb-1" />
                <span className="block text-xs font-black text-stone-900">100% ऑफ़लाइन</span>
                <span className="text-[10px] text-stone-500 font-medium">बिना नेट चलेगा</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs text-center">
                <Printer className="w-5 h-5 text-blue-700 mx-auto mb-1" />
                <span className="block text-xs font-black text-stone-900">ब्लूटूथ प्रिंटर</span>
                <span className="text-[10px] text-stone-500 font-medium">58mm सस्ती पर्ची</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs text-center">
                <Smartphone className="w-5 h-5 text-purple-700 mx-auto mb-1" />
                <span className="block text-xs font-black text-stone-900">कैमरा स्कैनर</span>
                <span className="text-[10px] text-stone-500 font-medium">1 सेकंड बिलिंग</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs text-center">
                <ShieldCheck className="w-5 h-5 text-amber-700 mx-auto mb-1" />
                <span className="block text-xs font-black text-stone-900">₹0 आजीवन</span>
                <span className="text-[10px] text-stone-500 font-medium">मुफ़्त गाँव प्लान</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login & Register Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border-2 border-amber-300/80 relative">
              <div className="flex rounded-2xl bg-stone-100 p-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-xl transition cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-stone-900 text-amber-400 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  📲 दुकानदार लॉगिन
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs sm:text-sm font-black rounded-xl transition cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-stone-900 text-amber-400 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  🏪 + नई दुकान जोड़ें
                </button>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold leading-tight">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Login Form */}
              {authMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">
                      मोबाइल नंबर (Registered Phone)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={loginMobile}
                        onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm font-bold text-stone-900 bg-stone-50/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">
                      4-अंकों का गुप्त पिन (4-Digit PIN)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={loginPin}
                        onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none text-sm font-bold text-stone-900 tracking-widest bg-stone-50/50"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-stone-500">
                        4 अंकों का गुप्त पासवर्ड
                      </span>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `नमस्ते Gramin Kirana टीम, मैं अपना स्टोर लॉगिन पिन भूल गया हूँ। मेरा रजिस्टर्ड मोबाइल नंबर ${loginMobile || '_____'} है। कृपया पिन रीसेट करने में सहायता करें।`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-900 underline decoration-amber-500/60"
                      >
                        पिन भूल गए? (Forgot PIN)
                      </a>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || loginMobile.length < 10 || loginPin.length < 4}
                    className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
                  >
                    {isSubmitting ? 'जांच हो रही है...' : 'दुकान खोलें (काउंटर चालू करें) ➔'}
                  </button>
                </form>
              ) : (
                /* Register Form — Super-Easy 4-Field Onboarding with Dynamic Pincode Detection */
                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  {/* Field 1: Mobile Number */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-black text-stone-700">
                        📱 मोबाइल नंबर (10 अंक): *
                      </label>
                      {regMobile.length === 10 && (
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
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="उदा. 98261XXXXX"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none text-xs font-bold text-stone-900 bg-stone-50/50"
                      />
                    </div>
                  </div>

                  {/* Field 2: Dynamic Postal Pincode & Village Picker */}
                  <div className="bg-amber-50/60 p-2.5 rounded-2xl border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-700" />
                        डाक पिनकोड (Pincode - 6 अंक): *
                      </label>
                      {isLookingUpPin && (
                        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1 animate-pulse">
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
                        value={regPincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        placeholder="उदा. 493441"
                        className="w-28 px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-xs font-black text-stone-900 tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <div className="text-[11px] text-stone-600 font-medium truncate flex-1">
                        📍 <span className="font-bold text-stone-900">{district}</span> • {block}
                      </div>
                    </div>

                    {/* Quick Village Chips from Pincode Directory */}
                    <div>
                      <span className="text-[10px] font-bold text-amber-900 block mb-1">
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
                                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                : 'bg-white hover:bg-amber-100 text-stone-800 border-amber-200'
                            }`}
                          >
                            {village === v && <Check className="w-2.5 h-2.5 text-white" />}
                            <span>{v}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Village text if needed */}
                    <div className="pt-1 border-t border-amber-200/50">
                      <input
                        type="text"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        placeholder="या अपने गाँव का नाम यहाँ लिखें"
                        className="w-full px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-stone-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Field 3: Store Name */}
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 mb-0.5">
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
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none text-xs font-bold text-stone-900 bg-stone-50/50"
                      />
                    </div>
                  </div>

                  {/* Field 4: 4-digit PIN */}
                  <div>
                    <label className="block text-[11px] font-black text-stone-700 mb-0.5">
                      🔒 नया 4-अंकों का गुप्त पिन (Secret PIN): *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-400 pointer-events-none" />
                      <input
                        type="password"
                        inputMode="numeric"
                        required
                        maxLength={4}
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:border-amber-500 outline-none text-xs font-bold text-stone-900 tracking-widest bg-stone-50/50"
                      />
                    </div>
                    <span className="text-[10px] text-stone-500 mt-0.5 block">
                      रोज़ाना दुकान खोलने के लिए 4 अंकों का पिन
                    </span>
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
                      <div className="mt-2 p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-left animate-in fade-in duration-200">
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
                    disabled={isSubmitting || !storeName || regMobile.length < 10 || regPin.length < 4}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-700/20 active:scale-98 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        पंजीकरण हो रहा है...
                      </>
                    ) : (
                      <>
                        <span>🚀 15 सेकंड में दुकान बनाएं व चालू करें</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Try Demo Direct Link */}
              <div className="mt-4 pt-4 border-t border-stone-200 text-center">
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                >
                  <span>🎪 बिना खाता बनाए 36+ सामानों का लाइव डेमो देखें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Breakdown Section */}
      <section className="py-12 px-4 sm:px-6 bg-stone-900 text-white border-y border-stone-800">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              दुकानदार की सुविधा
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight m-0">
              गाँव की दुकान के हर काम का पक्का समाधान
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 font-medium">
              किराना बिलिंग से लेकर उधारी बही-खाता और शाम के गल्ले तक — सब कुछ आपकी उंगलियों पर।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                100% ऑफ़लाइन (Offline-First)
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                गाँव में नेटवर्क चला जाए या बिजली गुल हो, बिलिंग कभी नहीं रुकेगी। सारा डेटा आपके फोन में हमेशा सुरक्षित रहता है।
              </p>
            </div>

            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                ब्लूटूथ 58mm थर्मल पर्ची
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                किसी भी सस्ते वायरलेस ब्लूटूथ प्रिंटर से ग्राहकों को पक्की बिल पर्ची या ग्राहक का पूरा बही-खाता स्टेटमेंट पर्ची थमाएं।
              </p>
            </div>

            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                साप्ताहिक हाट-बाज़ार मोड
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                बाज़ार के दिन 12 बड़ी टच बटन, छुट्टे पैसे कैलकुलेटर और 1-टैप नकद से 2 सेकंड में बिक्री दर्ज करें।
              </p>
            </div>

            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                कैमरा बारकोड स्कैनर
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                महंगे स्कैनर गन की ज़रूरत नहीं। अपने साधारण मोबाइल कैमरा से पारले-जी, साबुन, तेल के पैकेट 1 सेकंड में स्कैन करें।
              </p>
            </div>

            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                उधारी खाता व WhatsApp तकादा
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                धान खरीदी व महतारी वंदन योजना के अनुसार उधारी की तारीख तय करें और 1-क्लिक में ग्राहक को व्हाट्सएप संदेश भेजें।
              </p>
            </div>

            <div className="bg-stone-800/80 p-5 sm:p-6 rounded-3xl border border-stone-700 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-black text-base text-stone-100 m-0">
                दैनिक गल्ला हिसाब (Cash Drawer)
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                शाम को गल्ले में रखे नकद का मिलान करें, दिन के खर्चे घटाएं और 1-क्लिक में दिन का पूरा हिसाब सुरक्षित करें।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Section */}
      <section className="py-12 px-4 sm:px-6 bg-[#faf8f3]">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-amber-700 text-xs font-black uppercase tracking-wider">
              पारदर्शी ग्रामीण दरें
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-950 tracking-tight m-0">
              गाँव की हर दुकान के लिए साफ़ और मुफ़्त विकल्प
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              कोई छिपा हुआ चार्ज नहीं, कोई अचानक सर्विस बंद होने का डर नहीं।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Free Starter */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-emerald-500 shadow-sm flex flex-col justify-between">
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                  आजीवन मुफ़्त (Free Forever)
                </span>
                <h3 className="text-xl font-black text-stone-950 mt-3 m-0">
                  🌾 गाँव स्टार्टर प्लान
                </h3>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-4xl font-black text-stone-950">₹0</span>
                  <span className="text-xs text-stone-500 font-bold">/ हमेशा के लिए मुफ़्त</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  गाँव की हर एकल दुकान के लिए सम्पूर्ण ऑफ़लाइन डिजिटल बिलिंग व बही-खाता।
                </p>

                <ul className="space-y-2 text-xs text-stone-700 font-medium border-t border-stone-200 pt-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% ऑफ़लाइन बिलिंग (बिना इंटरनेट)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>असीमित ग्राहक बही-खाता व उधारी हिसाब</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>कैमरा बारकोड स्कैनर व पाव/आधा किलो वजन</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>साप्ताहिक हाट-बाज़ार 1-टैप नकद मोड</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>ब्लूटूथ प्रिंटर व शाम का गल्ला हिसाब</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setAuthMode('register');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full mt-6 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
              >
                + मुफ़्त में दुकान शुरू करें
              </button>
            </div>

            {/* Pro Tier */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-amber-400 shadow-md flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-amber-500 text-stone-950 px-3 py-0.5 rounded-full text-[10px] font-black">
                क्लाउड सुरक्षा
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                  प्रीमियम बैकअप
                </span>
                <h3 className="text-xl font-black text-stone-950 mt-3 m-0">
                  🚀 ग्रामिन प्रो प्लान
                </h3>
                <div className="flex items-baseline gap-1 my-3">
                  <span className="text-4xl font-black text-stone-950">₹49</span>
                  <span className="text-xs text-stone-500 font-bold">/ प्रति माह (या ₹499/साल)</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  क्लाउड ऑटो-सिंक, अलग मुनीम/स्टाफ खाता और 24×7 प्राथमिकता सहायता।
                </p>

                <ul className="space-y-2 text-xs text-stone-700 font-medium border-t border-stone-200 pt-4">
                  <li className="flex items-center gap-2 font-bold text-stone-900">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>मुफ़्त प्लान की सब खूबियाँ शामिल</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ऑटो क्लाउड सिंक (फ़ोन टूटने पर भी 0 नुकसान)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>मुनीम खाता (थोक भाव व मुनाफ़ा गुप्त)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>एक से अधिक फ़ोन/टैबलेट पर डेटा शेयरिंग</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>24×7 प्राथमिकता तकनीकी सहयोग</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  window.open(
                    `https://wa.me/919876543210?text=${encodeURIComponent(
                      'नमस्ते Gramin Kirana टीम, मुझे ग्रामिन प्रो प्लान की जानकारी चाहिए।'
                    )}`,
                    '_blank'
                  );
                }}
                className="w-full mt-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-bold text-xs transition cursor-pointer shadow-sm"
              >
                प्रो प्लान की जानकारी लें (WhatsApp) ➔
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-6 px-4 sm:px-6 text-center text-xs border-t border-stone-800 space-y-2">
        <p className="m-0 font-medium">
          © 2026 <strong>ग्रामीण किराना (Gramin Kirana)</strong> — भारत के ग्रामीण खुदरा व्यापारियों के लिए समर्पित।
        </p>
        <p className="text-[11px] text-stone-500 mt-1 m-0">
          100% ऑफ़लाइन डेटा गारंटी • सुरक्षित मल्टी-टेनेंट क्लाउड आर्किटेक्चर
        </p>
      </footer>
    </div>
  );
};

