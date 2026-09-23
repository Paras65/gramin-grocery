import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  AlertOctagon, ZapOff, SunMedium, Bug, Clock, Plus, 
  Trash2, X, Share2, Tag
} from 'lucide-react';
import { db } from '../../db';
import type { Product, SpoilageLog, SpoilageReason } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import { openWhatsApp } from '../../utils/whatsapp';

export const SpoilageExpiryGuard: React.FC = () => {
  const { language, t } = useLanguage();
  const spoilageLogs = useLiveQuery(() => db.spoilageLogs.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logProdName, setLogProdName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [deductFromStock, setDeductFromStock] = useState<boolean>(true);
  const [logQty, setLogQty] = useState('');
  const [logUnit, setLogUnit] = useState('pouch');
  const [logReason, setLogReason] = useState<SpoilageReason>('POWER_CUT');
  const [logLoss, setLogLoss] = useState('');
  const [logNote, setLogNote] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string>('all');

  // Find products expiring soon (within next 30 days)
  const today = new Date();
  const expiringProducts = products.filter((p: Product) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= -1 && diffDays <= 30;
  });

  const totalLossAmount = spoilageLogs.reduce((sum: number, s: SpoilageLog) => sum + (s.estimatedLoss || 0), 0);
  const powerCutLoss = spoilageLogs
    .filter((s: SpoilageLog) => s.reason === 'POWER_CUT')
    .reduce((sum: number, s: SpoilageLog) => sum + (s.estimatedLoss || 0), 0);
  const heatLoss = spoilageLogs
    .filter((s: SpoilageLog) => s.reason === 'HEAT_DAMAGE')
    .reduce((sum: number, s: SpoilageLog) => sum + (s.estimatedLoss || 0), 0);
  const pestLoss = spoilageLogs
    .filter((s: SpoilageLog) => s.reason === 'RODENT_PEST')
    .reduce((sum: number, s: SpoilageLog) => sum + (s.estimatedLoss || 0), 0);
  const expiredLoss = spoilageLogs
    .filter((s: SpoilageLog) => s.reason === 'EXPIRED')
    .reduce((sum: number, s: SpoilageLog) => sum + (s.estimatedLoss || 0), 0);

  const filteredSpoilageLogs = spoilageLogs.filter(log => {
    if (selectedReasonFilter === 'all') return true;
    return log.reason === selectedReasonFilter;
  });

  const handleProductSelect = (nameVal: string) => {
    setLogProdName(nameVal);
    const matched = products.find(p => 
      p.name.toLowerCase() === nameVal.trim().toLowerCase() ||
      (p.hindiName && p.hindiName.toLowerCase() === nameVal.trim().toLowerCase()) ||
      `${p.name} (${p.hindiName || ''})`.toLowerCase() === nameVal.trim().toLowerCase()
    );

    if (matched) {
      setSelectedProductId(matched.id || '');
      setLogUnit(matched.unit || 'pouch');
      const qtyNum = parseFloat(logQty) || 1;
      setLogLoss(String(Math.round(matched.purchasePrice * qtyNum)));
    } else {
      setSelectedProductId('');
    }
  };

  const handleQtyChange = (qtyVal: string) => {
    setLogQty(qtyVal);
    const matched = products.find(p => p.id === selectedProductId);
    if (matched) {
      const qtyNum = parseFloat(qtyVal) || 0;
      setLogLoss(String(Math.round(matched.purchasePrice * qtyNum)));
    }
  };

  const handleSaveSpoilage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logProdName.trim() || !logLoss) return;

    const qty = Math.max(1, parseFloat(logQty) || 1);
    const loss = Math.max(0, parseFloat(logLoss) || 0);

    const targetProduct = selectedProductId 
      ? products.find(p => p.id === selectedProductId)
      : products.find(p => p.name.toLowerCase() === logProdName.trim().toLowerCase());

    const didDeduct = Boolean(deductFromStock && targetProduct && targetProduct.id);

    await db.spoilageLogs.add({
      id: 'spoil_' + Math.random().toString(36).substring(2, 9),
      productName: logProdName.trim(),
      quantity: qty,
      unit: logUnit,
      reason: logReason,
      estimatedLoss: loss,
      timestamp: new Date().toISOString(),
      note: logNote.trim(),
      deductedProductId: didDeduct ? targetProduct?.id : undefined,
      deductedQty: didDeduct ? qty : undefined
    });

    if (didDeduct && targetProduct && targetProduct.id) {
      const updatedStock = Math.max(0, (targetProduct.stockQty || 0) - qty);
      await db.products.update(targetProduct.id, { 
        stockQty: Math.round(updatedStock * 100) / 100,
        updatedAt: new Date().toISOString()
      });
    }

    setIsLogModalOpen(false);
    setLogProdName('');
    setSelectedProductId('');
    setLogQty('');
    setLogLoss('');
    setLogNote('');
  };

  const handleDeleteLog = async (log: SpoilageLog) => {
    if (!log.id) return;

    if (log.deductedProductId && log.deductedQty && log.deductedQty > 0) {
      const prod = products.find(p => p.id === log.deductedProductId);
      const prodName = prod ? (prod.hindiName || prod.name) : log.productName;
      const restore = window.confirm(
        `क्या आप खराब दर्ज किया गया स्टॉक (+${log.deductedQty} ${log.unit}) वापस दुकान इन्वेंटरी में जोड़ना चाहते हैं?\n\n` +
        `सामान: ${prodName}\n` +
        `'OK' = रिकॉर्ड हटाएं और स्टॉक +${log.deductedQty} वापस जोड़ें\n` +
        `'Cancel' = केवल रिकॉर्ड हटाएं (स्टॉक न जोड़ें)`
      );

      if (restore && prod && prod.id) {
        await db.products.update(prod.id, {
          stockQty: Math.round(((prod.stockQty || 0) + log.deductedQty) * 100) / 100,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      if (!confirm(`क्या आप इस खराबी रिकॉर्ड को हटाना चाहते हैं?`)) return;
    }

    await db.spoilageLogs.delete(log.id);
  };

  // Quick Action: Clearance Discount Rate on Expiring Product
  const handleUpdateClearancePrice = async (p: Product) => {
    if (!p.id) return;
    const currentRate = p.sellingPrice;
    const suggestedDiscountRate = Math.max(p.purchasePrice, Math.round(currentRate * 0.8));
    const input = window.prompt(
      `सामान: "${p.hindiName || p.name}" (वर्तमान दर: ₹${currentRate})\n` +
      `थोक लागत: ₹${p.purchasePrice} | शेष दिन: एक्सपायरी निकट\n\n` +
      `एक्सपायरी से पहले तेजी से बेचने हेतु नई रियायती/क्लीयरेंस बिक्री दर (₹) दर्ज करें:`,
      String(suggestedDiscountRate)
    );
    if (input === null) return;
    const parsed = parseFloat(input);
    if (isNaN(parsed) || parsed <= 0) {
      alert('कृपया सही दर दर्ज करें!');
      return;
    }
    await db.products.update(p.id, {
      sellingPrice: parsed,
      updatedAt: new Date().toISOString()
    });
  };

  // Quick Action: Spoilage Log on Expiring Product
  const handleQuickSpoilLog = (p: Product) => {
    setSelectedProductId(p.id || '');
    setLogProdName(p.hindiName || p.name);
    setLogUnit(p.unit || 'piece');
    setLogQty(String(p.stockQty || 1));
    setLogLoss(String(Math.round((p.purchasePrice || 0) * (p.stockQty || 1))));
    setLogReason('EXPIRED');
    setLogNote('एक्सपायरी तारीख समाप्त होने पर हटाया गया');
    setDeductFromStock(true);
    setIsLogModalOpen(true);
  };

  // WhatsApp Distributor Return Claim
  const shareDistributorReturnWhatsApp = () => {
    if (expiringProducts.length === 0) {
      alert('वर्तमान में कोई निकट-एक्सपायरी सामान नहीं है।');
      return;
    }

    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'ग्रामीण किराना स्टोर';
    const village = store?.village ? `(${store.village})` : '';
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let text = `📦 *एक्सपायरी / डैमेज वापसी क्लेम - ${shopName}*\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    text += `आदरणीय डिस्ट्रीब्यूटर जी / एजेंसी,\n`;
    text += `हमारी दुकान पर निम्नलिखित सामान एक्सपायर होने को हैं। कृपया आगामी डिलीवरी में इन्हें वापस लेकर क्रेडिट नोट या बदला माल जारी करें:\n`;
    text += `------------------------------------\n`;

    expiringProducts.forEach((p, idx) => {
      const exp = new Date(p.expiryDate!);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const statusText = diffDays <= 0 ? '⚠️ आज एक्सपायर' : `⏱️ ${diffDays} दिन शेष (${p.expiryDate})`;
      text += `${idx + 1}. *${p.hindiName || p.name}* - *${p.stockQty} ${p.unit}* [${statusText}] (लागत: ₹${p.purchasePrice}/इकाई)\n`;
    });

    const totalClaimVal = expiringProducts.reduce((sum, p) => sum + (p.stockQty * p.purchasePrice), 0);
    text += `------------------------------------\n`;
    text += `💰 *कुल अनुमानित वापसी क्लेम: ₹${Math.round(totalClaimVal).toLocaleString('en-IN')}*\n`;
    text += `दुकान: ${shopName} ${village}\n`;
    text += `सहयोग हेतु धन्यवाद! 🙏`;

    openWhatsApp('', text);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Summary Cards with Village Premium Styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="village-card p-4 rounded-3xl bg-gradient-to-br from-white to-rose-50/40 border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 uppercase tracking-wider">{t.spoilage.totalLoss}</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
            ₹{totalLossAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-500 mt-1 m-0 font-medium">
            खराबी, बिजली लोड-शेडिंग व चूहों से हुआ कुल नुकसान
          </p>
        </div>

        <div className="village-card p-4 rounded-3xl bg-gradient-to-br from-white to-amber-50/50 border border-amber-300/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">⚡ बिजली गुल (लोड शेडिंग)</span>
            <ZapOff className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">
            ₹{powerCutLoss.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-500 mt-1 m-0 font-medium">
            दूध, दही, पनीर व कोल्ड ड्रिंक खराबी
          </p>
        </div>

        <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-sm border border-rose-500/40 flex flex-col justify-between">
          <div>
            <span className="text-xs text-amber-400 font-bold">त्वरित सुरक्षा कार्रवाई</span>
            <div className="text-sm font-black mt-1 text-stone-100">नुकसान का तुरंत लेखा-जोखा रखें</div>
          </div>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="mt-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white py-2 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.spoilage.logLossBtn}</span>
          </button>
        </div>
      </div>

      {/* Cause-wise Breakdown Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="village-card p-3 rounded-2xl bg-white border border-stone-200">
          <span className="text-stone-500 flex items-center gap-1 text-[11px] font-bold">
            <span>⚡</span>
            <span>बिजली कटौती</span>
          </span>
          <span className="text-base font-black text-amber-900 block mt-1">₹{powerCutLoss.toLocaleString('en-IN')}</span>
        </div>
        <div className="village-card p-3 rounded-2xl bg-white border border-stone-200">
          <span className="text-stone-500 flex items-center gap-1 text-[11px] font-bold">
            <span>☀️</span>
            <span>गर्मी व धूप</span>
          </span>
          <span className="text-base font-black text-amber-900 block mt-1">₹{heatLoss.toLocaleString('en-IN')}</span>
        </div>
        <div className="village-card p-3 rounded-2xl bg-white border border-stone-200">
          <span className="text-stone-500 flex items-center gap-1 text-[11px] font-bold">
            <span>🐀</span>
            <span>चूहे व कीट</span>
          </span>
          <span className="text-base font-black text-rose-700 block mt-1">₹{pestLoss.toLocaleString('en-IN')}</span>
        </div>
        <div className="village-card p-3 rounded-2xl bg-white border border-stone-200">
          <span className="text-stone-500 flex items-center gap-1 text-[11px] font-bold">
            <span>⏳</span>
            <span>तारीख समाप्त</span>
          </span>
          <span className="text-base font-black text-rose-700 block mt-1">₹{expiredLoss.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Expiring Soon Radar */}
      <div className="village-card rounded-3xl p-4 sm:p-5 bg-white shadow-2xs border border-amber-300/70">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-950 m-0">
                {t.spoilage.expiringSoon} ({expiringProducts.length})
              </h3>
              <p className="text-[11px] text-stone-500 font-medium m-0">
                अगले 30 दिनों में समाप्त होने वाले सामानों का रडार
              </p>
            </div>
          </div>

          {expiringProducts.length > 0 && (
            <button
              type="button"
              onClick={shareDistributorReturnWhatsApp}
              className="py-2 px-3 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="सभी निकट-एक्सपायरी सामानों की वापसी लिस्ट व्हाट्सएप पर डिस्ट्रीब्यूटर को भेजें"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>📲 डिस्ट्रीब्यूटर वापसी लिस्ट</span>
            </button>
          )}
        </div>

        {expiringProducts.length === 0 ? (
          <p className="text-xs text-stone-500 m-0 py-2 font-medium">
            {t.spoilage.noExpiring}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mt-2">
            {expiringProducts.map((p: Product) => {
              const exp = new Date(p.expiryDate!);
              const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isUrgent = diffDays <= 5;

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 ${
                    isUrgent ? 'bg-rose-50/80 border-rose-300' : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-stone-950">
                      {language === 'hi' ? p.hindiName : p.name}
                    </div>
                    <div className="text-[11px] text-stone-600 font-medium mt-0.5">
                      स्टॉक: <span className="font-bold">{p.stockQty} {p.unit}</span> • लागत: ₹{p.purchasePrice}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 font-medium">एक्सपायरी:</span>
                    <span className={`font-black ${isUrgent ? 'text-rose-700' : 'text-amber-900'}`}>
                      {p.expiryDate} ({diffDays <= 0 ? 'आज समाप्त' : `${diffDays} दिन शेष`})
                    </span>
                  </div>

                  {/* Quick Action Shortcuts */}
                  <div className="pt-1.5 border-t border-stone-200/60 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateClearancePrice(p)}
                      className="flex-1 py-1 px-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[10px] rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors"
                      title="एक्सपायरी से पहले तेजी से बेचने हेतु रियायती भाव सेट करें"
                    >
                      <Tag className="w-3 h-3 text-amber-700 shrink-0" />
                      <span>🏷️ रियायती दर (₹{p.sellingPrice})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSpoilLog(p)}
                      className="py-1 px-2.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[10px] rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-colors shrink-0"
                      title="खराब या एक्सपायर हो चुके सामान का नुकसान दर्ज करें"
                    >
                      <ZapOff className="w-3 h-3 text-rose-700 shrink-0" />
                      <span>खराबी दर्ज</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spoilage Log History */}
      <div className="village-card rounded-3xl overflow-hidden bg-white shadow-2xs">
        <div className="p-3.5 bg-[#faf8f3] border-b border-amber-200/60 flex items-center justify-between">
          <h3 className="font-black text-xs sm:text-sm text-stone-900 m-0">
            खराबी रिकॉर्ड इतिहास (Spoilage & Loss Log)
          </h3>
          <span className="text-[11px] font-bold text-stone-500">
            {filteredSpoilageLogs.length} प्रविष्टियां
          </span>
        </div>

        {/* Cause Filter Chips */}
        <div className="p-2.5 bg-[#faf8f3] border-b border-amber-200/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'सभी नुकसान' },
            { id: 'POWER_CUT', label: '⚡ बिजली कटौती' },
            { id: 'HEAT_DAMAGE', label: '☀️ गर्मी व धूप' },
            { id: 'RODENT_PEST', label: '🐀 चूहे व कीट' },
            { id: 'EXPIRED', label: '⏳ तारीख समाप्त' },
            { id: 'OTHER', label: 'अन्य' }
          ].map(f => {
            const count = f.id === 'all' 
              ? spoilageLogs.length 
              : spoilageLogs.filter(s => s.reason === f.id).length;
            if (count === 0 && f.id !== 'all') return null;
            const isSelected = selectedReasonFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedReasonFilter(f.id)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-rose-50'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {filteredSpoilageLogs.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs font-medium">
            {spoilageLogs.length === 0 ? 'कोई खराबी दर्ज नहीं की गई है।' : 'इस श्रेणी में कोई रिकॉर्ड नहीं मिला।'}
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on md+, visible on mobile) */}
            <div className="block md:hidden divide-y divide-stone-100 p-2 space-y-2">
              {filteredSpoilageLogs.map((log: SpoilageLog) => (
                <div key={log.id} className="p-3 bg-[#faf8f3] rounded-2xl border border-rose-200/60 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-stone-950 text-sm">{log.productName}</div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        {new Date(log.timestamp).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })} • {log.quantity} {log.unit}
                        {log.deductedProductId && <span className="text-emerald-700 font-bold ml-1">• स्टॉक घटा</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-stone-500 font-medium">नुकसान</div>
                      <div className="font-black text-rose-700 text-base">₹{log.estimatedLoss}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {log.reason === 'POWER_CUT' && <ZapOff className="w-3 h-3 text-amber-600" />}
                      {log.reason === 'HEAT_DAMAGE' && <SunMedium className="w-3 h-3 text-amber-600" />}
                      {log.reason === 'RODENT_PEST' && <Bug className="w-3 h-3 text-stone-600" />}
                      {log.reason === 'EXPIRED' && <Clock className="w-3 h-3 text-rose-600" />}
                      <span>
                        {log.reason === 'POWER_CUT' ? 'बिजली कटौती' :
                         log.reason === 'HEAT_DAMAGE' ? 'गर्मी/नमी' :
                         log.reason === 'RODENT_PEST' ? 'चूहे / कीट' :
                         log.reason === 'EXPIRED' ? 'एक्सपायर' : 'अन्य'}
                      </span>
                    </span>

                    <button
                      onClick={() => handleDeleteLog(log)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600 cursor-pointer"
                      title="हटाएं व ज़रूरत पड़ने पर स्टॉक वापस जोड़ें"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Tablet & Desktop Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf8f3] text-stone-700 border-b border-stone-200 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">तारीख</th>
                    <th className="p-3.5">खराब सामान</th>
                    <th className="p-3.5">कारण</th>
                    <th className="p-3.5">मात्रा</th>
                    <th className="p-3.5 text-right">अनुमानित नुकसान</th>
                    <th className="p-3.5">टिप्पणी</th>
                    <th className="p-3.5 text-center">हटाएं</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {filteredSpoilageLogs.map((log: SpoilageLog) => (
                    <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-3.5 text-stone-500 font-medium whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="p-3.5 font-bold text-stone-950">
                        <div>{log.productName}</div>
                        {log.deductedProductId && (
                          <span className="text-[10px] text-emerald-700 font-semibold">स्टॉक से घटाया गया</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {log.reason === 'POWER_CUT' && <ZapOff className="w-3 h-3 text-amber-600" />}
                          {log.reason === 'HEAT_DAMAGE' && <SunMedium className="w-3 h-3 text-amber-600" />}
                          {log.reason === 'RODENT_PEST' && <Bug className="w-3 h-3 text-stone-600" />}
                          {log.reason === 'EXPIRED' && <Clock className="w-3 h-3 text-rose-600" />}
                          <span>
                            {log.reason === 'POWER_CUT' ? 'बिजली कटौती (Power Cut)' :
                             log.reason === 'HEAT_DAMAGE' ? 'गर्मी/नमी' :
                             log.reason === 'RODENT_PEST' ? 'चूहे / कीट' :
                             log.reason === 'EXPIRED' ? 'एक्सपायर' : 'अन्य'}
                          </span>
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-stone-800">
                        {log.quantity} {log.unit}
                      </td>
                      <td className="p-3.5 text-right font-black text-rose-700 text-sm">
                        ₹{log.estimatedLoss}
                      </td>
                      <td className="p-3.5 text-stone-500 italic max-w-xs truncate">
                        {log.note || '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDeleteLog(log)}
                          className="text-stone-400 hover:text-rose-600 cursor-pointer p-1"
                          title="हटाएं व ज़रूरत पड़ने पर स्टॉक वापस जोड़ें"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Log Spoilage Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                खराबी या नुकसान दर्ज करें (Log Loss)
              </h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSpoilage} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  खराब सामान का नाम: *
                </label>
                <input
                  type="text"
                  required
                  list="spoilage-inventory-list"
                  value={logProdName}
                  onChange={e => handleProductSelect(e.target.value)}
                  placeholder="उदा. अमुल दूध या रहर दाल"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                />
                <datalist id="spoilage-inventory-list">
                  {products.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.hindiName ? `${p.hindiName} • स्टॉक: ${p.stockQty} ${p.unit}` : `स्टॉक: ${p.stockQty} ${p.unit}`}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    खराब मात्रा: *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.1"
                    value={logQty}
                    onChange={e => handleQtyChange(e.target.value)}
                    placeholder="4"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    इकाई (Unit):
                  </label>
                  <select
                    value={logUnit}
                    onChange={e => setLogUnit(e.target.value)}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  >
                    <option value="pouch">pouch (पाउच)</option>
                    <option value="kg">kg (किलो)</option>
                    <option value="packet">packet (पैकेट)</option>
                    <option value="piece">piece (नग)</option>
                    <option value="liter">liter (लीटर)</option>
                  </select>
                </div>
              </div>

              {/* Stock Auto-Deduct Option */}
              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={deductFromStock}
                    onChange={e => setDeductFromStock(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-amber-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>दुकान स्टॉक में से भी घटाएं (Auto-deduct from stock)</span>
                </label>
                {selectedProductId && (
                  <p className="text-[11px] text-amber-900 font-medium pl-6 m-0">
                    {(() => {
                      const p = products.find(x => x.id === selectedProductId);
                      if (!p) return null;
                      const q = parseFloat(logQty) || 1;
                      const after = Math.max(0, p.stockQty - q);
                      return `वर्तमान स्टॉक: ${p.stockQty} ${p.unit} ➔ नया स्टॉक: ${after} ${p.unit}`;
                    })()}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  खराबी का कारण (Reason): *
                </label>
                <select
                  value={logReason}
                  onChange={e => setLogReason(e.target.value as SpoilageReason)}
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                >
                  <option value="POWER_CUT">⚡ बिजली कटौती / लोड शेडिंग (दूध/दही/कोल्ड ड्रिंक)</option>
                  <option value="HEAT_DAMAGE">☀️ गर्मी व नमी से खराबी</option>
                  <option value="EXPIRED">⌛ एक्सपायरी खत्म (थोक व्यापारी ने नहीं बदला)</option>
                  <option value="RODENT_PEST">🐀 चूहा या घुन/कीड़ा लगना</option>
                  <option value="OTHER">अन्य कारण</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  अनुमानित रुपये का नुकसान (₹): *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={logLoss}
                  onChange={e => setLogLoss(e.target.value)}
                  placeholder="उदा. 120"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  टिप्पणी (नोट):
                </label>
                <input
                  type="text"
                  value={logNote}
                  onChange={e => setLogNote(e.target.value)}
                  placeholder="उदा. रात भर लाइट बंद रही"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-rose-700 hover:bg-rose-600 text-white cursor-pointer shadow-xs"
                >
                  नुकसान दर्ज करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
