import React, { useState } from 'react';
import { 
  Sparkles, CheckCircle2, ShoppingBag, Store, 
  ArrowRight, QrCode, X, RefreshCw, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { seedStandardRuralEssentials, INITIAL_PRODUCTS } from '../../db';
import { syncService } from '../../services/syncService';

interface StoreSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  staples: { label: 'अनाज व आटा', icon: '🌾' },
  pulses: { label: 'दालें व दलहन', icon: '🍲' },
  oils: { label: 'तेल व घी', icon: '🪔' },
  spices: { label: 'मसाले व चीनी', icon: '🌶️' },
  snacks: { label: 'चाय व बिस्कुट', icon: '🍪' },
  hygiene: { label: 'साबुन व सर्फ', icon: '🧼' },
  dairy: { label: 'डेयरी व दूध', icon: '🥛' },
  rural_special: { label: 'ग्रामीण दैनिक', icon: '🌿' },
};

export const StoreSetupWizardModal: React.FC<StoreSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const storeInfo = syncService.getStoreInfo();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeName, setStoreName] = useState(storeInfo?.storeName || '');
  const [villageName, setVillageName] = useState(storeInfo?.village || '');
  const [upiId, setUpiId] = useState(() => localStorage.getItem('gk_store_upi_id') || '');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ added: number; total: number } | null>(null);

  // Step 2 Customization State
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => new Set(INITIAL_PRODUCTS.map(p => p.name)));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [zeroInitialStock, setZeroInitialStock] = useState<boolean>(false);

  if (!isOpen) return null;

  const toggleItem = (name: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    const catItems = INITIAL_PRODUCTS.filter(p => p.category === cat).map(p => p.name);
    const allSelected = catItems.every(name => selectedItems.has(name));
    setSelectedItems(prev => {
      const next = new Set(prev);
      catItems.forEach(name => {
        if (allSelected) {
          next.delete(name);
        } else {
          next.add(name);
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(INITIAL_PRODUCTS.map(p => p.name)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const displayedItems = INITIAL_PRODUCTS.filter(p => {
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch = !searchQuery.trim() || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.hindiName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
    if (selectedItems.size === 0) return;
    setIsSeeding(true);
    try {
      const res = await seedStandardRuralEssentials(Array.from(selectedItems), zeroInitialStock);
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
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
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
            <div className="space-y-3.5">
              <div className="text-center mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  चरण 2: सामान कस्टमाइज़ करें
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1.5">
                  अपनी दुकान के सामान चुनें (Customize Catalog)
                </h3>
                <p className="text-xs text-stone-600">
                  जो सामान आप अपनी दुकान में रखते हैं केवल उन्हें चुनें। श्रेणी या सामान को 1-टैप में अनचेक कर सकते हैं।
                </p>
              </div>

              {/* Quick Actions & Counter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-100/80 p-2.5 rounded-2xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-700">
                    चयनित सामान:
                  </span>
                  <span className="px-2 py-0.5 rounded-full font-black bg-emerald-600 text-white text-xs">
                    {selectedItems.size} / {INITIAL_PRODUCTS.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg font-bold text-stone-700 transition cursor-pointer"
                  >
                    सब चुनें ({INITIAL_PRODUCTS.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="px-2.5 py-1 bg-white hover:bg-stone-50 border border-stone-300 rounded-lg font-bold text-stone-700 transition cursor-pointer"
                  >
                    सब हटाएं
                  </button>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                    filterCategory === 'all'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  सभी ({INITIAL_PRODUCTS.length})
                </button>
                {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                  const catCount = INITIAL_PRODUCTS.filter(p => p.category === catKey).length;
                  const catSelectedCount = INITIAL_PRODUCTS.filter(p => p.category === catKey && selectedItems.has(p.name)).length;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setFilterCategory(catKey)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                        filterCategory === catKey
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        catSelectedCount === catCount ? 'bg-emerald-700 text-white' : 'bg-stone-300 text-stone-800'
                      }`}>
                        {catSelectedCount}/{catCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search & Category Toggle Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="सामान खोजें (उदा. शक्कर, पारले, तेल)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {filterCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(filterCategory)}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs whitespace-nowrap border border-stone-200 transition cursor-pointer"
                  >
                    इस श्रेणी को ऑन/ऑफ करें
                  </button>
                )}
              </div>

              {/* Scrollable Item Checklist */}
              <div className="max-h-52 sm:max-h-60 overflow-y-auto divide-y divide-stone-100 bg-white rounded-2xl border border-stone-200 shadow-inner">
                {displayedItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500">
                    कोई सामान नहीं मिला। खोज शब्द बदलें।
                  </div>
                ) : (
                  displayedItems.map((p) => {
                    const isSelected = selectedItems.has(p.name);
                    const catMeta = CATEGORY_META[p.category] || { label: p.category, icon: '📦' };
                    return (
                      <div
                        key={p.name}
                        onClick={() => toggleItem(p.name)}
                        className={`flex items-center justify-between p-2.5 sm:px-3.5 transition cursor-pointer select-none ${
                          isSelected ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'bg-stone-50/40 hover:bg-stone-100 text-stone-400'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300 pointer-events-none"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isSelected ? 'text-stone-900' : 'text-stone-500 line-through'}`}>
                                {p.hindiName}
                              </span>
                              <span className="text-[10px] text-stone-400 truncate hidden sm:inline">
                                ({p.name})
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-500 flex items-center gap-2 mt-0.5">
                              <span>{catMeta.icon} {catMeta.label}</span>
                              <span>•</span>
                              <span>बिक्री दर: <strong className="text-stone-800">₹{p.sellingPrice}</strong>/{p.unit}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'
                          }`}>
                            {isSelected ? 'जुड़ेगा' : 'हटाया'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Zero Initial Stock Option Card */}
              <div 
                onClick={() => setZeroInitialStock(prev => !prev)}
                className="bg-amber-50/60 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 cursor-pointer select-none transition hover:bg-amber-50"
              >
                <input
                  type="checkbox"
                  checked={zeroInitialStock}
                  onChange={() => {}}
                  className="w-4 h-4 mt-0.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 pointer-events-none"
                />
                <div>
                  <div className="text-xs font-bold text-amber-950">
                    📦 शुरुआत में सबका स्टॉक 0 रखें (शून्य स्टॉक मोड)
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    यदि टिक करेंगे तो सामान के नाम और भाव जुड़ेंगे, लेकिन स्टॉक 0 रहेगा ताकि आप अपनी दुकान का वास्तविक स्टॉक बाद में भर सकें।
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSeedCatalog}
                  disabled={isSeeding || selectedItems.size === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSeeding ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      सामान लोड हो रहे हैं...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-emerald-200" />
                      🌾 चयनित ({selectedItems.size}) सामान दुकान में जोड़ें
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-full mt-2 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-700 text-center cursor-pointer"
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

