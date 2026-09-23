import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle2, ShoppingBag, Store, 
  ArrowRight, QrCode, X, RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { seedStandardRuralEssentials } from '../../db';
import { syncService } from '../../services/syncService';

interface StoreSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const StoreSetupWizardModal: React.FC<StoreSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const storeInfo = syncService.getStoreInfo();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeName, setStoreName] = useState(storeInfo?.storeName || 'जय माँ बम्लेश्वरी किराना स्टोर');
  const [villageName, setVillageName] = useState(storeInfo?.village || 'आरंग (Arang)');
  const [upiId, setUpiId] = useState(() => localStorage.getItem('gk_store_upi_id') || '');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ added: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = () => {
    if (upiId.trim()) {
      localStorage.setItem('gk_store_upi_id', upiId.trim());
    }
    // Update store info in localStorage if available
    const existingStore = syncService.getStoreInfo();
    if (existingStore) {
      const updated = {
        ...existingStore,
        storeName: storeName.trim() || existingStore.storeName,
        village: villageName.trim() || existingStore.village,
      };
      localStorage.setItem('gk_store_info', JSON.stringify(updated));
    }
    setStep(2);
  };

  const handleSeedCatalog = async () => {
    setIsSeeding(true);
    try {
      const res = await seedStandardRuralEssentials();
      setSeedResult(res);
      setStep(3);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // Confetti fallback
      }
    } catch (err) {
      console.error('Failed to seed rural catalog:', err);
      alert('सामान जोड़ने में समस्या आई, कृपया पुनः प्रयास करें।');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Wizard Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-orange-600 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-xs">
              <Sparkles className="w-7 h-7 text-amber-200" />
            </div>
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-400/30 text-amber-100 mb-1 border border-amber-300/30">
                1-क्लिक ऑनबोर्डिंग विज़ार्ड
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                दुकान सेटअप विज़ार्ड (Store Setup)
              </h2>
              <p className="text-xs sm:text-sm text-amber-100 mt-0.5">
                30 सेकंड में अपनी आधुनिक ग्रामीण दुकान तैयार करें
              </p>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 mt-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === s ? 'w-8 bg-white' : step > s ? 'w-4 bg-amber-300/80' : 'w-2 bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="p-5 sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  चरण 1: दुकान व UPI विवरण
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-2">
                  अपनी दुकान और बैंक खाता जोड़ें
                </h3>
                <p className="text-xs text-stone-600">
                  यह विवरण आपके बिल, रसीद और डिजिटल पासबुक पर दिखाई देगा।
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  दुकान का नाम (Store Name)
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="उदा. जय किराना स्टोर"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  गाँव / मोहल्ला (Village / Location)
                </label>
                <input
                  type="text"
                  value={villageName}
                  onChange={(e) => setVillageName(e.target.value)}
                  placeholder="उदा. आरंग, रायपुर"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4">
                <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-700" />
                  दुकान का UPI ID (GooglePay / PhonePe / Paytm / BHIM)
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="उदा. 9876543210@okaxis या store@upi"
                  className="w-full px-3 py-2.5 rounded-xl border border-amber-300 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
                <p className="text-[11px] text-amber-800 mt-1.5 leading-relaxed">
                  💡 इस UPI ID से काउंटर और ग्राहक पासबुक में डायनामिक QR कोड बनेगा, जिससे ग्राहक सीधे आपके खाते में भुगतान कर सकेंगे।
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                >
                  अगला: किराना सूची लोड करें
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  चरण 2: 1-क्लिक सामान सूची
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-2">
                  52 आवश्यक ग्रामीण किराना सामान जोड़ें
                </h3>
                <p className="text-xs text-stone-600">
                  एक-एक सामान टाइप करने की ज़रूरत नहीं! छत्तीसगढ़ व ग्रामीण भारत के 52 सबसे लोकप्रिय सामान असली थोक व फुटकर रेट के साथ तुरंत लोड करें।
                </p>
              </div>

              {/* Category preview pills */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="text-xs font-black text-stone-700 uppercase tracking-wider">
                  शामिल प्रमुख श्रेणियां:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🌾</span>
                    <div>
                      <div className="font-bold text-stone-800">अनाज व आटा</div>
                      <div className="text-[10px] text-stone-500">चावल, गेहूं आटा, बेसन, सूजी, मैदा, पोहा</div>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🍲</span>
                    <div>
                      <div className="font-bold text-stone-800">दालें व दलहन</div>
                      <div className="text-[10px] text-stone-500">रहर, चना, उड़द, मूंग, मसूर, छोले</div>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🪔</span>
                    <div>
                      <div className="font-bold text-stone-800">तेल व घी</div>
                      <div className="text-[10px] text-stone-500">सरसों तेल, सोयाबीन, देसी घी</div>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🌶️</span>
                    <div>
                      <div className="font-bold text-stone-800">मसाले व चीनी</div>
                      <div className="text-[10px] text-stone-500">शक्कर, गुड़, नमक, हल्दी, मिर्च, जीरा</div>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🧼</span>
                    <div>
                      <div className="font-bold text-stone-800">साबुन व सर्फ</div>
                      <div className="text-[10px] text-stone-500">घड़ी, व्हील, रिन, विम, लाइफबॉय</div>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center gap-2">
                    <span className="text-base">🌿</span>
                    <div>
                      <div className="font-bold text-stone-800">ग्रामीण दैनिक</div>
                      <div className="text-[10px] text-stone-500">बीड़ी 502, माचिस, अगरबत्ती, कॉइल</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSeedCatalog}
                  disabled={isSeeding}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSeeding ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      सामान लोड हो रहे हैं...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-emerald-200" />
                      🌾 52 आवश्यक सामानों के साथ दुकान लोड करें
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full mt-2 py-2 text-xs font-bold text-stone-500 hover:text-stone-700 text-center cursor-pointer"
                >
                  मैं अपने सामान खुद एक-एक करके दर्ज करूँगा (Skip)
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  सेटअप पूरा हुआ!
                </span>
                <h3 className="text-xl font-black text-stone-900 mt-2">
                  बधाई हो! आपकी दुकान तैयार है
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-md mx-auto">
                  {seedResult?.added 
                    ? `आपकी दुकान में ${seedResult.added} आवश्यक ग्रामीण किराना सामान सफलतापूर्वक जोड़ दिए गए हैं। कुल स्टॉक: ${seedResult.total} सामान।`
                    : 'आपकी दुकान की सेटिंग्स सुरक्षित कर ली गई हैं।'}
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">दुकान का नाम:</span>
                  <span className="font-bold text-stone-900">{storeName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">गाँव / स्थान:</span>
                  <span className="font-bold text-stone-900">{villageName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">दुकान UPI ID:</span>
                  <span className="font-bold text-stone-900 font-mono">{upiId || 'सेट नहीं (बाद में जोड़ें)'}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-stone-500 font-medium">तैयार स्टॉक सामान:</span>
                  <span className="font-black text-emerald-700">
                    {seedResult?.total ? `${seedResult.total} सामान` : 'तैयार'}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onComplete();
                    onClose();
                  }}
                  className="w-full py-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-amber-600/30 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5" />
                  काउंटर पर बिलिंग शुरू करें (Start Billing)
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

