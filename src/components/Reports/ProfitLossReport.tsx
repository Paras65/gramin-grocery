import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, TrendingDown, Minus, Download, Share2, Lock, Sparkles } from 'lucide-react';
import { db } from '../../db';
import type { Sale, SpoilageLog, Product } from '../../types';
import { syncService } from '../../services/syncService';
import { formatINR } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/whatsapp';

const MONTHS_HI = [
  'जनवरी','फरवरी','मार्च','अप्रैल','मई','जून',
  'जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'
];

export const ProfitLossReport: React.FC = () => {
  const isPro = syncService.isPro();
  const isLoggedIn = syncService.isLoggedIn();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const allSales = useLiveQuery(() => db.sales.toArray()) || [];
  const allSpoilage = useLiveQuery(() => db.spoilageLogs.toArray()) || [];
  const allProducts = useLiveQuery(() => db.products.toArray()) || [];

  // Build a product lookup map for purchase prices
  const productMap = useMemo(() => {
    const m: Record<string, Product> = {};
    allProducts.forEach((p: Product) => { if (p.id) m[p.id] = p; });
    return m;
  }, [allProducts]);

  // Filter sales and spoilage to selected month/year
  const monthlySales = useMemo(() => {
    return (allSales as Sale[]).filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allSales, selectedMonth, selectedYear]);

  const monthlySpoilage = useMemo(() => {
    return (allSpoilage as SpoilageLog[]).filter((s) => {
      const d = new Date(s.timestamp);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allSpoilage, selectedMonth, selectedYear]);

  // Compute P&L
  const totalRevenue = monthlySales.reduce((sum, s) => sum + s.totalAmount, 0);

  const totalCOGS = useMemo(() => {
    return monthlySales.reduce((sum, s) => {
      const itemCost = s.items.reduce((iSum, item) => {
        // Try to find purchase price from product catalog
        const prod = item.productId ? productMap[item.productId] : undefined;
        const purchasePrice = prod ? prod.purchasePrice : item.unitPrice * 0.75; // fallback: 75% of selling
        return iSum + purchasePrice * item.quantity;
      }, 0);
      return sum + itemCost;
    }, 0);
  }, [monthlySales, productMap]);

  const grossProfit = totalRevenue - totalCOGS;
  const totalSpoilageLoss = monthlySpoilage.reduce((sum, s) => sum + s.estimatedLoss, 0);
  const netProfit = grossProfit - totalSpoilageLoss;
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const billCount = monthlySales.length;
  const cashSales = monthlySales.filter(s => s.paymentMode === 'CASH').reduce((sum, s) => sum + s.totalAmount, 0);
  const upiSales = monthlySales.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.totalAmount, 0);
  const udhaarSales = monthlySales.filter(s => s.paymentMode === 'UDHAAR').reduce((sum, s) => sum + s.totalAmount, 0);

  const fmt = (n: number) => formatINR(n, { round: true });

  const handleWhatsAppShare = () => {
    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'दुकान';
    const monthLabel = `${MONTHS_HI[selectedMonth]} ${selectedYear}`;
    const msg = 
      `📊 *${shopName}* — ${monthLabel} लाभ-हानि रिपोर्ट\n\n` +
      `💰 कुल बिक्री: ${fmt(totalRevenue)}\n` +
      `📦 माल की लागत: ${fmt(totalCOGS)}\n` +
      `✅ सकल लाभ: ${fmt(grossProfit)}\n` +
      `🍂 खराबी हानि: ${fmt(totalSpoilageLoss)}\n` +
      `─────────────────\n` +
      `🏆 *शुद्ध लाभ: ${fmt(netProfit)}* (${margin}%)\n\n` +
      `📋 कुल बिल: ${billCount} | नकद: ${fmt(cashSales)} | UPI: ${fmt(upiSales)} | उधार: ${fmt(udhaarSales)}`;
    openWhatsApp(undefined, msg);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isLoggedIn) return null;

  return (
    <div className="space-y-4">
      {/* PRO Gate */}
      {!isPro && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
              <Lock className="w-6 h-6 text-amber-700" />
            </div>
          </div>
          <h3 className="font-black text-amber-950 text-base">माहवारी लाभ-हानि रिपोर्ट</h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            असली मुनाफा जानने के लिए यह रिपोर्ट सिर्फ <strong>ग्रामीण PRO (₹99/माह)</strong> में उपलब्ध है।<br />
            लागत, बिक्री, खराबी, और शुद्ध लाभ — सब एक जगह।
          </p>
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            PRO में अपग्रेड करें
          </div>
        </div>
      )}

      {isPro && (
        <>
          {/* Month Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs font-black text-stone-700">माह चुनें:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-500 bg-white cursor-pointer"
            >
              {MONTHS_HI.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-500 bg-white cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">कुल बिक्री</div>
              <div className="text-xl font-black text-emerald-900">{fmt(totalRevenue)}</div>
              <div className="text-[10px] text-stone-500 mt-1">{billCount} बिल</div>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">माल की लागत</div>
              <div className="text-xl font-black text-rose-900">{fmt(totalCOGS)}</div>
              <div className="text-[10px] text-stone-500 mt-1">खरीद मूल्य अनुमान</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1">खराबी हानि</div>
              <div className="text-xl font-black text-amber-900">{fmt(totalSpoilageLoss)}</div>
              <div className="text-[10px] text-stone-500 mt-1">{monthlySpoilage.length} एंट्री</div>
            </div>
            <div className={`border-2 rounded-2xl p-4 text-center ${netProfit >= 0 ? 'bg-emerald-100 border-emerald-400' : 'bg-rose-100 border-rose-400'}`}>
              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                शुद्ध लाभ
              </div>
              <div className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'}`}>
                {fmt(netProfit)}
              </div>
              <div className={`text-[10px] mt-1 font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {netProfit >= 0 ? (
                  <span className="flex items-center justify-center gap-0.5"><TrendingUp className="w-3 h-3" />{margin}% मार्जिन</span>
                ) : (
                  <span className="flex items-center justify-center gap-0.5"><TrendingDown className="w-3 h-3" />नुकसान</span>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-black text-stone-900 mb-3 flex items-center gap-1.5">
              <Minus className="w-3.5 h-3.5" /> भुगतान विधि अनुसार बिक्री
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-stone-500 font-medium">नकद</div>
                <div className="text-sm font-black text-stone-900">{fmt(cashSales)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">UPI</div>
                <div className="text-sm font-black text-stone-900">{fmt(upiSales)}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 font-medium">उधार</div>
                <div className="text-sm font-black text-amber-700">{fmt(udhaarSales)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              WhatsApp पर भेजें
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-98"
            >
              <Download className="w-4 h-4" />
              PDF में सेव करें
            </button>
          </div>

          {billCount === 0 && (
            <div className="text-center py-8 text-stone-500 text-sm">
              {MONTHS_HI[selectedMonth]} {selectedYear} में कोई बिल नहीं है।
            </div>
          )}
        </>
      )}
    </div>
  );
};

