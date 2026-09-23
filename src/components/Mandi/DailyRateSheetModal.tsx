import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Search, Check, Share2, Sparkles, AlertTriangle, RotateCcw, Package } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { openWhatsApp } from '../../utils/whatsapp';
import { syncService } from '../../services/syncService';

interface DailyRateSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCashier?: boolean;
}

export const DailyRateSheetModal: React.FC<DailyRateSheetModalProps> = ({
  isOpen,
  onClose,
  isCashier = false
}) => {
  const { language, t } = useLanguage();
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [filterMode, setFilterMode] = useState<'staples' | 'all'>('staples');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modifiedRates, setModifiedRates] = useState<Record<string, number>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Auto-detect fluctuating staple commodities (loose items, grains, pulses, oils, spices)
  const isStapleCommodity = (p: Product) => {
    return (
      p.isLoose ||
      ['staples', 'pulses', 'oils', 'spices', 'rural_special'].includes(p.category) ||
      ['kg', 'liter', 'pouch'].includes(p.unit)
    );
  };

  const displayedProducts = useMemo(() => {
    return products.filter((p: Product) => {
      const matchesFilter = filterMode === 'all' ? true : isStapleCommodity(p);
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.hindiName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [products, filterMode, searchQuery]);

  if (!isOpen) return null;

  const modifiedCount = Object.keys(modifiedRates).filter(id => {
    const prod = products.find(p => p.id === id);
    return prod && modifiedRates[id] !== prod.sellingPrice;
  }).length;

  const handleDeltaChange = (prodId: string, currentSellPrice: number, delta: number) => {
    const currentRate = modifiedRates[prodId] !== undefined ? modifiedRates[prodId] : currentSellPrice;
    const newRate = Math.max(0.5, Math.round((currentRate + delta) * 10) / 10);
    setModifiedRates(prev => ({
      ...prev,
      [prodId]: newRate
    }));
  };

  const handleDirectRateInput = (prodId: string, valueStr: string) => {
    const parsed = parseFloat(valueStr);
    if (!isNaN(parsed) && parsed >= 0) {
      setModifiedRates(prev => ({
        ...prev,
        [prodId]: parsed
      }));
    } else if (valueStr === '') {
      setModifiedRates(prev => ({
        ...prev,
        [prodId]: 0
      }));
    }
  };

  const handleResetItem = (prodId: string) => {
    setModifiedRates(prev => {
      const copy = { ...prev };
      delete copy[prodId];
      return copy;
    });
  };

  // Apply all modified rates atomically into IndexedDB
  const handleSaveAllRates = async () => {
    const toUpdate = Object.entries(modifiedRates).filter(([id, newRate]) => {
      const prod = products.find(p => p.id === id);
      return prod && newRate > 0 && newRate !== prod.sellingPrice;
    });

    if (toUpdate.length === 0) {
      alert(language === 'hi' ? 'कोई नया भाव नहीं बदला गया है।' : 'No price changes to apply.');
      return;
    }

    try {
      await db.transaction('rw', db.products, async () => {
        const timestamp = new Date().toISOString();
        for (const [id, newRate] of toUpdate) {
          await db.products.update(id, {
            sellingPrice: newRate,
            updatedAt: timestamp
          });
        }
      });

      setSaveSuccessMsg(`✅ ${toUpdate.length} सामानों के आज के नए भाव पूरी दुकान व काउंटर पर लागू हो गए!`);
      setModifiedRates({});
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (err) {
      console.error('Failed to save daily rate sheet:', err);
      alert('भाव अपडेट करने में त्रुटि हुई।');
    }
  };

  // 1-Click WhatsApp Morning Rate Board Broadcast
  const handleShareWhatsAppRateBoard = () => {
    const storeInfo = syncService.getStoreInfo();
    const storeName = storeInfo?.storeName || 'ग्रामीण किराना स्टोर';
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let text = `🌾 *${storeName} - आज का ताज़ा मंडी भाव बोर्ड* 🌾\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    text += `---------------------------\n`;

    const targetList = displayedProducts.slice(0, 30);
    targetList.forEach(p => {
      const effectiveRate = modifiedRates[p.id!] !== undefined ? modifiedRates[p.id!] : p.sellingPrice;
      text += `• *${p.hindiName || p.name}*: ₹${effectiveRate} /${p.unit}\n`;
    });

    text += `---------------------------\n`;
    text += `🛒 *सस्ता, शुद्ध व ताज़ा राशन! आज ही दुकान पधारें।*\n`;
    const userPhone = syncService.getUserInfo()?.phone;
    if (userPhone) {
      text += `📞 संपर्क / होम डिलीवरी: ${userPhone}\n`;
    }

    openWhatsApp(undefined, text);
  };

  const deltaChips = [-5, -2, -1, 1, 2, 5];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-amber-300 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/15 via-[#faf8f3] to-amber-500/10 border-b border-amber-200/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-950 m-0">
                  {t.mandi?.dailyRateSheet || '🌅 आज का मंडी भाव (दैनिक शीट)'}
                </h2>
                {modifiedCount > 0 && (
                  <span className="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                    {modifiedCount} नए भाव
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-stone-600 font-medium m-0 mt-0.5">
                {t.mandi?.dailyRateSheetSubtitle || 'सुबह 1-क्लिक में मुख्य सामान के आज के खुदरा भाव अपडेट करें'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer transition-colors"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-300 text-xs font-black text-emerald-900 flex items-center gap-2 shrink-0 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="p-3 sm:p-4 bg-[#faf8f3] border-b border-amber-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          {/* Toggle Staples vs All */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterMode('staples')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'staples'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-amber-50'
              }`}
            >
              {t.mandi?.staplesOnly || '🌾 दैनिक मुख्य वस्तुएं'}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-amber-50'
              }`}
            >
              {t.mandi?.allItems || '📦 सभी सामान'}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="दैनिक सामान खोजें (उदा. चीनी, तेल, आलू)..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-200/80 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500 shadow-2xs"
            />
          </div>
        </div>

        {/* Products Rate Grid / Cards */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {displayedProducts.length === 0 ? (
            <div className="p-10 text-center text-stone-400">
              <Package className="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-stone-600">कोई सामान नहीं मिला।</p>
              <p className="text-xs text-stone-400 mt-0.5">फ़िल्टर बदलकर 'सभी सामान' देखें।</p>
            </div>
          ) : (
            displayedProducts.map(prod => {
              const currentRate = prod.sellingPrice;
              const hasDraftRate = prod.id && modifiedRates[prod.id] !== undefined;
              const effectiveRate = hasDraftRate ? modifiedRates[prod.id!] : currentRate;
              const isChanged = effectiveRate !== currentRate;
              const rateDiff = Math.round((effectiveRate - currentRate) * 10) / 10;

              // Cost & Margin (for owners only)
              const purchasePrice = prod.purchasePrice || 0;
              const margin = Math.round((effectiveRate - purchasePrice) * 10) / 10;
              const marginPct = purchasePrice > 0 ? Math.round((margin / purchasePrice) * 100) : 0;
              const isBelowCost = !isCashier && purchasePrice > 0 && effectiveRate < purchasePrice;

              return (
                <div
                  key={prod.id}
                  className={`p-3 rounded-2xl border transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isChanged
                      ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400/40'
                      : 'bg-[#faf8f3] border-amber-200/60 hover:bg-white'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-stone-950 text-sm truncate">
                        {language === 'hi' ? prod.hindiName || prod.name : prod.name}
                      </span>
                      {prod.isLoose && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-stone-200/80 text-stone-700">
                          खुला
                        </span>
                      )}
                      {isChanged && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.2 rounded-md shadow-2xs ${
                            rateDiff > 0
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {rateDiff > 0 ? `+₹${rateDiff}` : `-₹${Math.abs(rateDiff)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-stone-600 mt-1 font-medium flex-wrap">
                      <span>
                        कल का भाव: <b className="text-stone-900">₹{currentRate}</b> /{prod.unit}
                      </span>
                      {!isCashier && purchasePrice > 0 && (
                        <span className="text-stone-500">
                          थोक खरीद: ₹{purchasePrice}
                        </span>
                      )}
                      {!isCashier && (
                        <span
                          className={`font-bold ${
                            isBelowCost ? 'text-rose-700 flex items-center gap-0.5' : 'text-emerald-700'
                          }`}
                        >
                          {isBelowCost ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              <span>लागत से ₹{Math.abs(margin)} कम!</span>
                            </>
                          ) : (
                            <span>मुनाफ़ा: ₹{margin} ({marginPct}%)</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Chips & Today's Rate Input */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between md:justify-end">
                    {/* Delta Chips */}
                    <div className="flex items-center gap-1">
                      {deltaChips.map(delta => (
                        <button
                          key={delta}
                          type="button"
                          onClick={() => handleDeltaChange(prod.id!, currentRate, delta)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center border cursor-pointer active:scale-90 transition-all ${
                            delta > 0
                              ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                          }`}
                          title={`${delta > 0 ? '+' : ''}${delta} रुपया`}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>

                    {/* Numeric Input */}
                    <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300 shadow-2xs">
                      <span className="text-xs font-black text-stone-600 ml-1">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={effectiveRate}
                        onChange={e => handleDirectRateInput(prod.id!, e.target.value)}
                        className="w-16 p-1 text-sm font-black text-amber-950 text-right outline-hidden bg-transparent"
                      />
                      <span className="text-[11px] font-bold text-stone-500 mr-1.5">/{prod.unit}</span>
                    </div>

                    {/* Reset Button */}
                    {isChanged && (
                      <button
                        type="button"
                        onClick={() => handleResetItem(prod.id!)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg cursor-pointer"
                        title="कल के भाव पर वापस लाएं"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer / Batch Actions */}
        <div className="p-3.5 sm:p-4 bg-[#faf8f3] border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-stone-700 font-bold flex items-center gap-2">
            <span>कुल प्रदर्शित: <b>{displayedProducts.length}</b></span>
            <span>•</span>
            <span className={modifiedCount > 0 ? 'text-amber-900 font-black' : 'text-stone-500'}>
              बदले गए: <b>{modifiedCount}</b>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsAppRateBoard}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-900 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
              title="गाँव के ग्राहकों को आज का ताज़ा भाव व्हाट्सएप पर भेजें"
            >
              <Share2 className="w-4 h-4 text-emerald-400" />
              <span>{t.mandi?.shareRateBoard || '📲 आज का रेट बोर्ड भेजें'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAllRates}
              disabled={modifiedCount === 0}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer ${
                modifiedCount === 0
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white ring-1 ring-emerald-400/40'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{t.mandi?.applyAllRates || '💾 सभी नए भाव लागू करें'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

