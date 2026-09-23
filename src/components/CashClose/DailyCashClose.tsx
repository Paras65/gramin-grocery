import React, { useState, useEffect, useCallback } from 'react';
import { db, autoArchiveIfDue } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import type { DailyCashClose as DailyCashCloseType, DailyExpense } from '../../types';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  isBluetoothPrinterConnected,
  printDaySummary,
} from '../../utils/thermalPrint';
import { formatINR, getTodayISODate, formatTime } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/whatsapp';
import { syncService } from '../../services/syncService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = getTodayISODate;
const nowTimeStr = () => formatTime(new Date());
const fmtINR = (n: number) => formatINR(n);

// ─── Component ────────────────────────────────────────────────────────────────
export const DailyCashClose: React.FC = () => {
  const { t } = useLanguage();
  const tc = t.cashClose;

  const today = todayStr();

  // Auto-fetched totals
  const [cashSalesTotal, setCashSalesTotal] = useState<number>(0);
  const [jamaTotal, setJamaTotal] = useState<number>(0);
  const [upiSalesTotal, setUpiSalesTotal] = useState<number>(0);
  const [udhaarSalesTotal, setUdhaarSalesTotal] = useState<number>(0);
  const [loadingTotals, setLoadingTotals] = useState<boolean>(true);

  // Form state
  const [openingCash, setOpeningCash] = useState<string>('');
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [expDesc, setExpDesc] = useState<string>('');
  const [expAmt, setExpAmt] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Currency Denominations state
  const [showDenomModal, setShowDenomModal] = useState<boolean>(false);
  const [denom, setDenom] = useState<{
    d500: string;
    d200: string;
    d100: string;
    d50: string;
    d20: string;
    d10: string;
    coins: string;
  }>({
    d500: '',
    d200: '',
    d100: '',
    d50: '',
    d20: '',
    d10: '',
    coins: '',
  });

  // Saved record
  const [savedRecord, setSavedRecord] = useState<DailyCashCloseType | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [pastRecords, setPastRecords] = useState<DailyCashCloseType[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Bluetooth
  const [btConnected, setBtConnected] = useState<boolean>(false);
  const [btConnecting, setBtConnecting] = useState<boolean>(false);
  const [btSupported] = useState<boolean>('bluetooth' in navigator);

  // ─── Load Past Records ───────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const records = await db.dailyCashClose.orderBy('date').reverse().toArray();
      setPastRecords(records);
    } catch {
      // Fallback
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Load Today's Totals ─────────────────────────────────────────────────
  const loadTotals = useCallback(async () => {
    setLoadingTotals(true);
    try {
      // Cash sales today
      const todaySales = await db.sales
        .where('timestamp')
        .between(
          new Date(today + 'T00:00:00').toISOString(),
          new Date(today + 'T23:59:59.999').toISOString(),
          true, true
        )
        .toArray();

      // Cash sales (including cash portion of split payment)
      const cashSales = todaySales
        .reduce((sum, s) => {
          if (s.paymentMode === 'CASH') return sum + s.totalAmount;
          if (s.paymentMode === 'UDHAAR' && s.splitPayment?.cash) return sum + s.splitPayment.cash;
          return sum;
        }, 0);

      // UPI / Online sales
      const upiSales = todaySales
        .reduce((sum, s) => {
          if (s.paymentMode === 'UPI') return sum + s.totalAmount;
          return sum;
        }, 0);

      // New Udhaar sales today (for gross daily business volume)
      const udhaarSales = todaySales
        .reduce((sum, s) => {
          if (s.paymentMode === 'UDHAAR') {
            const creditPart = s.splitPayment ? s.splitPayment.udhaar : s.totalAmount;
            return sum + creditPart;
          }
          return sum;
        }, 0);

      // Jama (credit repayments) today
      const allTxns = await db.transactions
        .where('timestamp')
        .between(
          new Date(today + 'T00:00:00').toISOString(),
          new Date(today + 'T23:59:59.999').toISOString(),
          true, true
        )
        .toArray();

      const jamaCollected = allTxns
        .filter(tx => tx.type === 'JAMA')
        .reduce((sum, tx) => sum + tx.amount, 0);

      setCashSalesTotal(Math.round(cashSales * 100) / 100);
      setUpiSalesTotal(Math.round(upiSales * 100) / 100);
      setUdhaarSalesTotal(Math.round(udhaarSales * 100) / 100);
      setJamaTotal(Math.round(jamaCollected * 100) / 100);

      // Check if already closed today
      const existing = await db.dailyCashClose
        .where('date').equals(today)
        .first();
      if (existing) {
        setSavedRecord(existing);
        if (existing.openingCash) setOpeningCash(String(existing.openingCash));
        if (existing.physicalCashInDrawer) setPhysicalCash(String(existing.physicalCashInDrawer));
        if (existing.expenses) setExpenses(existing.expenses);
        if (existing.note) setNote(existing.note);
        if (existing.denominations) {
          setDenom({
            d500: existing.denominations.d500 ? String(existing.denominations.d500) : '',
            d200: existing.denominations.d200 ? String(existing.denominations.d200) : '',
            d100: existing.denominations.d100 ? String(existing.denominations.d100) : '',
            d50: existing.denominations.d50 ? String(existing.denominations.d50) : '',
            d20: existing.denominations.d20 ? String(existing.denominations.d20) : '',
            d10: existing.denominations.d10 ? String(existing.denominations.d10) : '',
            coins: existing.denominations.coins ? String(existing.denominations.coins) : '',
          });
        }
      }

    } finally {
      setLoadingTotals(false);
    }
  }, [today]);

  useEffect(() => { loadTotals(); }, [loadTotals]);

  // ─── Computed values ─────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const physical = parseFloat(physicalCash) || 0;
  const opening = parseFloat(openingCash) || 0;
  const expectedCash = opening + cashSalesTotal + jamaTotal - totalExpenses;
  const difference = physical - expectedCash;
  const grossDayTurnover = cashSalesTotal + upiSalesTotal + udhaarSalesTotal;

  // Denominations live sum
  const denomTotal = 
    (parseInt(denom.d500) || 0) * 500 +
    (parseInt(denom.d200) || 0) * 200 +
    (parseInt(denom.d100) || 0) * 100 +
    (parseInt(denom.d50) || 0) * 50 +
    (parseInt(denom.d20) || 0) * 20 +
    (parseInt(denom.d10) || 0) * 10 +
    (parseFloat(denom.coins) || 0);

  const applyDenomToPhysicalCash = () => {
    setPhysicalCash(String(denomTotal));
    setShowDenomModal(false);
  };

  const handleReopenDay = () => {
    if (window.confirm(tc.reopenConfirm || 'क्या आप आज के गल्ला रिकॉर्ड को पुनः खोलकर सुधारना चाहते हैं?')) {
      if (savedRecord) {
        setPhysicalCash(String(savedRecord.physicalCashInDrawer));
        if (savedRecord.openingCash) setOpeningCash(String(savedRecord.openingCash));
        if (savedRecord.expenses) setExpenses(savedRecord.expenses);
        if (savedRecord.note) setNote(savedRecord.note);
      }
      setSavedRecord(null);
    }
  };

  // ─── Expense helpers ─────────────────────────────────────────────────────
  const addExpense = () => {
    const amt = parseFloat(expAmt);
    if (!expDesc.trim() || isNaN(amt) || amt <= 0) return;
    setExpenses(prev => [...prev, {
      id: 'exp_' + Math.random().toString(36).substring(2, 9),
      description: expDesc.trim(),
      amount: amt,
      timestamp: new Date().toISOString(),
    }]);
    setExpDesc('');
    setExpAmt('');
  };

  const removeExpense = (id?: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ─── Save / Close Day ────────────────────────────────────────────────────
  const closeDay = async () => {
    if (!physicalCash || isNaN(parseFloat(physicalCash))) return;

    const d500 = parseInt(denom.d500) || undefined;
    const d200 = parseInt(denom.d200) || undefined;
    const d100 = parseInt(denom.d100) || undefined;
    const d50 = parseInt(denom.d50) || undefined;
    const d20 = parseInt(denom.d20) || undefined;
    const d10 = parseInt(denom.d10) || undefined;
    const coins = parseFloat(denom.coins) || undefined;
    const hasDenom = d500 || d200 || d100 || d50 || d20 || d10 || coins;

    const record: DailyCashCloseType = {
      id: 'cashclose_' + today,
      date: today,
      openingCash: opening > 0 ? opening : undefined,
      physicalCashInDrawer: physical,
      totalCashSalesDay: cashSalesTotal,
      totalJamaCollectedDay: jamaTotal,
      totalExpenses,
      expenses,
      calculatedExpectedCash: expectedCash,
      cashDifference: difference,
      totalUpiSalesDay: upiSalesTotal > 0 ? upiSalesTotal : undefined,
      totalUdhaarSalesDay: udhaarSalesTotal > 0 ? udhaarSalesTotal : undefined,
      denominations: hasDenom ? { d500, d200, d100, d50, d20, d10, coins } : undefined,
      note: note.trim() || undefined,
      closedAt: new Date().toISOString(),
    };

    await db.dailyCashClose.put(record);
    // Silent background maintenance: check if rolling sales archive is due (>30 days)
    autoArchiveIfDue().catch(console.warn);

    setSavedRecord(record);
    setSaveSuccess(true);
    loadHistory();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ─── Past Record WhatsApp & Print ──────────────────────────────────────────
  const sendPastRecordWhatsApp = (rec: DailyCashCloseType) => {
    const storeInfo = syncService.getStoreInfo();
    const storeDisplayName = storeInfo?.storeName?.trim() || 'ग्रामीण किराना';
    const storeVillage = storeInfo?.village?.trim() ? ` (${storeInfo.village})` : '';

    const displayDate = new Date(rec.date).toLocaleDateString('hi-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const diffLine =
      rec.cashDifference === 0 ? '✅ गल्ला बिल्कुल मिला'
      : rec.cashDifference > 0 ? `📈 ${fmtINR(rec.cashDifference)} अतिरिक्त`
      : `⚠️ ${fmtINR(Math.abs(rec.cashDifference))} कम`;

    const expLines = (rec.expenses || []).map(e => `   • ${e.description}: ${fmtINR(e.amount)}`).join('\n');
    const closedTime = rec.closedAt ? new Date(rec.closedAt).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : '';

    const msg = [
      `🏪 *${storeDisplayName}${storeVillage} — दैनिक गल्ला हिसाब (इतिहास)*`,
      `📅 ${displayDate}`,
      ``,
      rec.openingCash ? `💵 शुरुआती रोकड़ (Float): *${fmtINR(rec.openingCash)}*` : '',
      `💰 नकद बिक्री: *${fmtINR(rec.totalCashSalesDay)}*`,
      `📥 जमा उधार: *${fmtINR(rec.totalJamaCollectedDay)}*`,
      rec.totalUpiSalesDay ? `📲 UPI / ऑनलाइन: *${fmtINR(rec.totalUpiSalesDay)}*` : '',
      rec.totalExpenses > 0 ? `\n📤 खर्चे:\n${expLines}\n   कुल खर्च: *${fmtINR(rec.totalExpenses)}*` : '',
      ``,
      `🧾 अपेक्षित नकद: *${fmtINR(rec.calculatedExpectedCash)}*`,
      `💵 गल्ले में नकद: *${fmtINR(rec.physicalCashInDrawer)}*`,
      `${diffLine}`,
      rec.note ? `\n📝 ${rec.note}` : '',
      ``,
      closedTime ? `⏰ बंद: ${closedTime}` : '',
      `_ग्रामीण किराना ऐप द्वारा_`,
    ].filter(Boolean).join('\n');

    openWhatsApp(undefined, msg);
  };

  const printPastRecord = async (rec: DailyCashCloseType) => {
    const storeInfo = syncService.getStoreInfo();
    const storeDisplayName = storeInfo?.storeName?.trim() || 'ग्रामीण किराना';

    await printDaySummary({
      storeName: storeDisplayName,
      date: new Date(rec.date).toLocaleDateString('hi-IN'),
      openingCash: rec.openingCash,
      cashSales: rec.totalCashSalesDay,
      jamaCollected: rec.totalJamaCollectedDay,
      upiSales: rec.totalUpiSalesDay,
      totalExpenses: rec.totalExpenses,
      expenses: (rec.expenses || []).map(e => ({ description: e.description, amount: e.amount })),
      physicalCash: rec.physicalCashInDrawer,
      expectedCash: rec.calculatedExpectedCash,
      difference: rec.cashDifference,
      note: rec.note || undefined,
      closedAt: rec.closedAt ? new Date(rec.closedAt).toLocaleTimeString('hi-IN') : '',
    });
  };

  // ─── WhatsApp Day Summary ─────────────────────────────────────────────────
  const sendWhatsApp = () => {
    const storeInfo = syncService.getStoreInfo();
    const storeDisplayName = storeInfo?.storeName?.trim() || 'ग्रामीण किराना';
    const storeVillage = storeInfo?.village?.trim() ? ` (${storeInfo.village})` : '';

    const displayDate = new Date(today).toLocaleDateString('hi-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const diffLine =
      difference === 0 ? '✅ गल्ला बिल्कुल मिला'
      : difference > 0 ? `📈 ${fmtINR(difference)} अतिरिक्त`
      : `⚠️ ${fmtINR(Math.abs(difference))} कम`;

    const expLines = expenses.map(e => `   • ${e.description}: ${fmtINR(e.amount)}`).join('\n');

    const msg = [
      `🏪 *${storeDisplayName}${storeVillage} — दैनिक गल्ला हिसाब*`,
      `📅 ${displayDate}`,
      ``,
      opening > 0 ? `💵 शुरुआती रोकड़ (Float): *${fmtINR(opening)}*` : '',
      `💰 नकद बिक्री: *${fmtINR(cashSalesTotal)}*`,
      `📥 जमा उधार: *${fmtINR(jamaTotal)}*`,
      upiSalesTotal > 0 ? `📲 UPI / ऑनलाइन: *${fmtINR(upiSalesTotal)}*` : '',
      udhaarSalesTotal > 0 ? `📒 आज की नई उधारी: *${fmtINR(udhaarSalesTotal)}*` : '',
      expenses.length > 0 ? `\n📤 खर्चे:\n${expLines}\n   कुल खर्च: *${fmtINR(totalExpenses)}*` : '',
      ``,
      `🧾 कुल अपेक्षित नकद: *${fmtINR(expectedCash)}*`,
      `💵 गल्ले में नकद: *${fmtINR(physical)}*`,
      `${diffLine}`,
      note ? `\n📝 ${note}` : '',
      ``,
      `⏰ बंद: ${nowTimeStr()}`,
      `_ग्रामीण किराना ऐप द्वारा_`,
    ].filter(Boolean).join('\n');

    openWhatsApp(undefined, msg);
  };

  // ─── Thermal Print ────────────────────────────────────────────────────────
  const handlePrint = async () => {
    const storeInfo = syncService.getStoreInfo();
    const storeDisplayName = storeInfo?.storeName?.trim() || 'ग्रामीण किराना';

    await printDaySummary({
      storeName: storeDisplayName,
      date: new Date(today).toLocaleDateString('hi-IN'),
      openingCash: opening > 0 ? opening : undefined,
      cashSales: cashSalesTotal,
      jamaCollected: jamaTotal,
      upiSales: upiSalesTotal > 0 ? upiSalesTotal : undefined,
      totalExpenses,
      expenses: expenses.map(e => ({ description: e.description, amount: e.amount })),
      physicalCash: physical,
      expectedCash,
      difference,
      note: note || undefined,
      closedAt: new Date().toLocaleTimeString('hi-IN'),
    });
  };

  // ─── Bluetooth Connect ────────────────────────────────────────────────────
  const handleBluetooth = async () => {
    if (btConnected) {
      disconnectBluetoothPrinter();
      setBtConnected(false);
      return;
    }
    setBtConnecting(true);
    const ok = await connectBluetoothPrinter();
    setBtConnected(ok && isBluetoothPrinterConnected());
    setBtConnecting(false);
  };

  // ─── Difference Color ─────────────────────────────────────────────────────
  const diffBg    = difference === 0 ? 'bg-emerald-50 border-emerald-300' : difference > 0 ? 'bg-blue-50 border-blue-300' : 'bg-red-50 border-red-300';
  const diffText  = difference === 0 ? 'text-emerald-700' : difference > 0 ? 'text-blue-700' : 'text-red-700';
  const diffLabel = difference === 0 ? tc.matched : difference > 0 ? `${tc.excess}: ${fmtINR(difference)}` : `${tc.shortage}: ${fmtINR(Math.abs(difference))}`;

  // ─── Today display ────────────────────────────────────────────────────────
  const todayDisplay = new Date().toLocaleDateString('hi-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 space-y-4">

      {/* Header */}
      <div className="village-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="text-3xl sm:text-4xl">🏦</div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">{tc.title}</h2>
            <p className="text-sm text-stone-600 mt-0.5">{tc.subtitle}</p>
            <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 w-fit">
              <span>📅</span>
              <span>{todayDisplay}</span>
            </div>
          </div>
        </div>

        {/* Bluetooth connect badge */}
        {btSupported && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={handleBluetooth}
              disabled={btConnecting}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                btConnected
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>{btConnected ? '🖨️ प्रिंटर जुड़ा ✅' : btConnecting ? '⏳ जोड़ रहे हैं...' : `🖨️ ${tc.bluetoothConnect}`}</span>
            </button>
            {btConnected && (
              <span className="text-[11px] text-emerald-700 font-medium">Bluetooth ESC/POS ready</span>
            )}
          </div>
        )}

        {/* Tab switch pills */}
        <div className="mt-4 flex items-center gap-2 border-t border-stone-200 pt-3">
          <button
            type="button"
            onClick={() => setActiveTab('today')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span>आज का गल्ला</span>
            {savedRecord && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <span>पिछला इतिहास (Archive)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
              activeTab === 'history' ? 'bg-amber-700 text-amber-100' : 'bg-stone-200 text-stone-700'
            }`}>
              {pastRecords.length}
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        /* Past Cash Close Archive */
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="village-card p-8 text-center text-stone-500 text-sm font-medium">
              इतिहास लोड हो रहा है...
            </div>
          ) : pastRecords.length === 0 ? (
            <div className="village-card p-8 text-center space-y-2">
              <div className="text-3xl">📂</div>
              <h3 className="font-black text-stone-800 text-base m-0">कोई पिछला गल्ला रिकॉर्ड नहीं मिला</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                जब आप दिन के अंत में गल्ला सुरक्षित करेंगे, तो हर दिन का हिसाब-किताब तारीख अनुसार यहाँ सुरक्षित रहेगा।
              </p>
            </div>
          ) : (
            pastRecords.map((rec) => {
              const diff = rec.cashDifference;
              const isMatch = diff === 0;
              const isExcess = diff > 0;
              const dObj = new Date(rec.date);
              const dateStr = dObj.toLocaleDateString('hi-IN', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
              });
              const closedTime = rec.closedAt ? new Date(rec.closedAt).toLocaleTimeString('hi-IN', {
                hour: '2-digit', minute: '2-digit'
              }) : '';

              return (
                <div key={rec.id || rec.date} className="village-card p-4 sm:p-5 bg-white border border-amber-300/80 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">📅</span>
                      <div>
                        <h4 className="font-black text-stone-900 text-sm sm:text-base m-0">
                          {dateStr}
                        </h4>
                        {closedTime && (
                          <span className="text-[11px] text-stone-500 font-medium">
                            बंद समय: {closedTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black self-start sm:self-auto border ${
                      isMatch
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isExcess
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {isMatch ? '✅ मिलान सही' : isExcess ? `📈 +${fmtINR(diff)} अतिरिक्त` : `⚠️ -${fmtINR(Math.abs(diff))} कम`}
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block text-[10px]">नकद बिक्री</span>
                      <span className="font-black text-stone-900 text-xs sm:text-sm">{fmtINR(rec.totalCashSalesDay)}</span>
                      {rec.openingCash ? (
                        <span className="text-[9px] text-amber-800 font-semibold block mt-0.5">
                          (प्रारंभिक: {fmtINR(rec.openingCash)})
                        </span>
                      ) : null}
                    </div>
                    <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block text-[10px]">जमा वसूली</span>
                      <span className="font-black text-stone-900 text-xs sm:text-sm">{fmtINR(rec.totalJamaCollectedDay)}</span>
                      {rec.totalUpiSalesDay ? (
                        <span className="text-[9px] text-blue-700 font-semibold block mt-0.5">
                          (UPI: {fmtINR(rec.totalUpiSalesDay)})
                        </span>
                      ) : null}
                    </div>
                    <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block text-[10px]">कुल खर्चे</span>
                      <span className="font-black text-rose-700 text-xs sm:text-sm">{fmtINR(rec.totalExpenses)}</span>
                    </div>
                    <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block text-[10px]">गल्ले में नकद</span>
                      <span className="font-black text-stone-900 text-xs sm:text-sm">{fmtINR(rec.physicalCashInDrawer)}</span>
                    </div>
                  </div>

                  {rec.note && (
                    <p className="text-xs text-stone-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200 m-0">
                      📝 {rec.note}
                    </p>
                  )}

                  {/* WhatsApp & Print Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => sendPastRecordWhatsApp(rec)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-2xs"
                    >
                      <span>📲 WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => printPastRecord(rec)}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-2xs"
                    >
                      <span>🖨️ पर्ची प्रिंट</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <>
      {/* Already closed today — show summary card */}
      {savedRecord && (
        <div className="village-card bahi-khata-edge-green p-4 bg-emerald-50/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✅</span>
            <h3 className="font-black text-emerald-800">आज का गल्ला बंद हो चुका है</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white rounded-lg px-3 py-2 border border-emerald-200">
              <div className="text-xs text-stone-500">नकद बिक्री</div>
              <div className="font-bold text-stone-900">{fmtINR(savedRecord.totalCashSalesDay)}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-emerald-200">
              <div className="text-xs text-stone-500">जमा उधार</div>
              <div className="font-bold text-stone-900">{fmtINR(savedRecord.totalJamaCollectedDay)}</div>
            </div>
            <div className="bg-white rounded-lg px-3 py-2 border border-emerald-200">
              <div className="text-xs text-stone-500">गल्ले में नकद</div>
              <div className="font-bold text-stone-900">{fmtINR(savedRecord.physicalCashInDrawer)}</div>
            </div>
            <div className={`rounded-lg px-3 py-2 border ${savedRecord.cashDifference === 0 ? 'bg-emerald-100 border-emerald-300' : savedRecord.cashDifference > 0 ? 'bg-blue-100 border-blue-300' : 'bg-red-100 border-red-300'}`}>
              <div className="text-xs text-stone-500">मिलान अंतर</div>
              <div className={`font-bold ${savedRecord.cashDifference === 0 ? 'text-emerald-800' : savedRecord.cashDifference > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                {savedRecord.cashDifference === 0 ? '✅ सही मिला' : savedRecord.cashDifference > 0 ? `+${fmtINR(savedRecord.cashDifference)}` : fmtINR(savedRecord.cashDifference)}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-stone-500 mt-3">{tc.closedAt} {new Date(savedRecord.closedAt).toLocaleTimeString('hi-IN')}</p>
          {/* Allow reprint/reshare */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={sendWhatsApp}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {tc.whatsappSummary}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              {tc.printSummary}
            </button>
          </div>

          {/* Reopen / Edit Today's Closing Button */}
          <button
            type="button"
            onClick={handleReopenDay}
            className="w-full flex items-center justify-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer mt-3 shadow-xs active:scale-98"
          >
            <span>{tc.reopenDayBtn || '🔓 गल्ला पुनः खोलें / संशोधित करें'}</span>
          </button>
        </div>
      )}

      {/* Auto-fetched totals — 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Cash Sales Card */}
        <div className="village-card bahi-khata-edge-green p-3 sm:p-4">
          <div className="text-[11px] font-bold text-stone-500 mb-0.5">{tc.cashSalesLabel}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-20" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-stone-900">{fmtINR(cashSalesTotal)}</div>
          )}
          <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">🟢 नकद काउंटर बिक्री</div>
        </div>

        {/* Jama Collected Card */}
        <div className="village-card bahi-khata-edge-gold p-3 sm:p-4">
          <div className="text-[11px] font-bold text-stone-500 mb-0.5">{tc.jamaLabel}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-20" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-stone-900">{fmtINR(jamaTotal)}</div>
          )}
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">📥 बही-खाता वसूली</div>
        </div>

        {/* UPI / Online Sales Card */}
        <div className="village-card p-3 sm:p-4 bg-white border border-blue-200">
          <div className="text-[11px] font-bold text-stone-500 mb-0.5">{tc.totalUpiSalesLabel || 'UPI / ऑनलाइन'}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-20" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-blue-900">{fmtINR(upiSalesTotal)}</div>
          )}
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">📲 बैंक खाते में जमा</div>
        </div>

        {/* Gross Daily Turnover Card */}
        <div className="village-card p-3 sm:p-4 bg-white border border-stone-300">
          <div className="text-[11px] font-bold text-stone-500 mb-0.5">{tc.totalGrossSalesLabel || 'कुल कारोबार'}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-20" />
          ) : (
            <div className="text-xl sm:text-2xl font-black text-stone-900">{fmtINR(grossDayTurnover)}</div>
          )}
          <div className="text-[10px] text-stone-600 font-semibold mt-0.5">📊 नकद + UPI + उधार</div>
        </div>
      </div>

      {/* Opening Cash (Float) Input */}
      <div className="village-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-bold text-stone-800">
            🌅 {tc.openingCashLabel || 'शुरुआती रोकड़ / सुबह का गल्ला (Float)'}
          </label>
          <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            खुल्ला पैसा / Float
          </span>
        </div>
        <p className="text-[11px] text-stone-500 mb-2">{tc.openingCashHint || 'सुबह गल्ले में रखा हुआ खुल्ला पैसा'}</p>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-black text-lg">₹</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={openingCash}
            onChange={e => setOpeningCash(e.target.value)}
            placeholder="0"
            className="w-full text-2xl font-black text-stone-900 bg-stone-50 border border-stone-300 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder:text-stone-300 transition-all"
          />
        </div>
      </div>

      {/* Physical Cash Input & Denominations Counter */}
      <div className="village-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <label className="block text-sm font-bold text-stone-800">
              💵 {tc.physicalCash}
            </label>
            <p className="text-[11px] text-stone-500">{tc.physicalCashHint}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDenomModal(!showDenomModal)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
          >
            <span>{showDenomModal ? '✕ ' + (tc.denominationClose || 'कैलकुलेटर छुपाएं') : '🧮 ' + (tc.denominationCounter || 'नोट व सिक्के गिनें')}</span>
          </button>
        </div>

        <input
          type="number"
          inputMode="numeric"
          value={physicalCash}
          onChange={e => setPhysicalCash(e.target.value)}
          placeholder="0"
          className="w-full text-3xl sm:text-4xl font-black text-stone-900 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder:text-stone-300 transition-all"
        />

        {/* Collapsible Currency Denomination Counter */}
        {showDenomModal && (
          <div className="bg-stone-50 border-2 border-amber-200 rounded-xl p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="font-black text-stone-900 text-xs sm:text-sm m-0">
                🧮 भारतीय मुद्रा नोट व सिक्के कैलकुलेटर
              </h4>
              <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                योग: {fmtINR(denomTotal)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                { label: '₹500 का नोट', value: 500, key: 'd500' },
                { label: '₹200 का नोट', value: 200, key: 'd200' },
                { label: '₹100 का नोट', value: 100, key: 'd100' },
                { label: '₹50 का नोट', value: 50, key: 'd50' },
                { label: '₹20 का नोट', value: 20, key: 'd20' },
                { label: '₹10 का नोट', value: 10, key: 'd10' },
              ].map(item => {
                const k = item.key as keyof typeof denom;
                const cnt = parseInt(denom[k]) || 0;
                const sub = cnt * item.value;
                return (
                  <div key={item.key} className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200">
                    <span className="font-bold text-stone-800">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400 font-medium">×</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={denom[k]}
                        onChange={e => setDenom(prev => ({ ...prev, [k]: e.target.value }))}
                        placeholder="0"
                        className="w-14 text-center font-bold bg-stone-50 border border-stone-300 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="font-black text-stone-900 w-16 text-right">
                        {sub > 0 ? fmtINR(sub) : '₹0'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Coins / Mixed loose cash */}
              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-stone-200 sm:col-span-2">
                <span className="font-bold text-stone-800">🪙 कुल सिक्के (₹1, ₹2, ₹5, ₹10, ₹20)</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-400 font-bold">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={denom.coins}
                    onChange={e => setDenom(prev => ({ ...prev, coins: e.target.value }))}
                    placeholder="0"
                    className="w-24 text-right font-bold bg-stone-50 border border-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200">
              <div className="text-xs">
                <span className="text-stone-500">कुल नोट व सिक्के: </span>
                <span className="text-base font-black text-emerald-700">{fmtINR(denomTotal)}</span>
              </div>
              <button
                type="button"
                onClick={applyDenomToPhysicalCash}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs active:scale-95"
              >
                💾 {tc.denominationApply || 'कुल राशि गल्ले में भरें'} ({fmtINR(denomTotal)})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="village-card p-4 sm:p-5">
        <h3 className="font-black text-stone-800 mb-3">📤 {tc.expensesLabel}</h3>

        {/* Quick expense category chips */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          <span className="text-[11px] font-bold text-stone-500">अक्सर होने वाले खर्च:</span>
          {['सवारी / भाड़ा', 'मजदूरी / हमाली', 'चाय / नाश्ता', 'दुकान खर्च / बिजली', 'पॉलिथीन / पैकिंग'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setExpDesc(cat)}
              className="text-[11px] font-semibold bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300 rounded-lg px-2 py-0.5 transition cursor-pointer"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expense add row */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={expDesc}
            onChange={e => setExpDesc(e.target.value)}
            placeholder={tc.expenseDesc}
            className="flex-1 min-w-0 text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            onKeyDown={e => e.key === 'Enter' && addExpense()}
          />
          <input
            type="number"
            inputMode="numeric"
            value={expAmt}
            onChange={e => setExpAmt(e.target.value)}
            placeholder="₹"
            className="w-20 sm:w-24 text-sm text-right bg-white border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
            onKeyDown={e => e.key === 'Enter' && addExpense()}
          />
          <button
            onClick={addExpense}
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm px-4 py-2 rounded-lg shrink-0 transition-all cursor-pointer"
          >
            +
          </button>
        </div>

        {/* Expense list */}
        {expenses.length === 0 ? (
          <p className="text-[12px] text-stone-400 text-center py-3">कोई खर्च नहीं जोड़ा गया है। ऊपर से जोड़ें।</p>
        ) : (
          <div className="space-y-1.5">
            {expenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <span className="text-sm text-stone-800 min-w-0 truncate mr-2">{exp.description}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-red-700">{fmtINR(exp.amount)}</span>
                  <button
                    onClick={() => removeExpense(exp.id)}
                    className="text-stone-400 hover:text-red-600 text-sm font-bold cursor-pointer"
                    title="हटाएं"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black text-red-700 pt-1 border-t border-stone-200 mt-1">
              <span>कुल खर्च:</span>
              <span>{fmtINR(totalExpenses)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Cash Reconciliation Panel */}
      {physicalCash !== '' && (
        <div className={`village-card p-4 sm:p-5 border-2 ${diffBg}`}>
          <h3 className="font-black text-stone-800 mb-4">🧾 {tc.difference}</h3>
          <div className="space-y-2 text-sm">
            {opening > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">शुरुआती रोकड़ (Float):</span>
                <span className="font-bold text-stone-800">+ {fmtINR(opening)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-600">{tc.cashSalesLabel}</span>
              <span className="font-bold text-emerald-700">+ {fmtINR(cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">{tc.jamaLabel}</span>
              <span className="font-bold text-amber-700">+ {fmtINR(jamaTotal)}</span>
            </div>
            {totalExpenses > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">कुल खर्च (-):</span>
                <span className="font-bold text-red-700">- {fmtINR(totalExpenses)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-300 pt-2">
              <span className="text-stone-700 font-semibold">{tc.expectedCash}</span>
              <span className="font-black text-stone-900">{fmtINR(expectedCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-700 font-semibold">{tc.physicalCash}</span>
              <span className="font-black text-stone-900">{fmtINR(physical)}</span>
            </div>
          </div>

          {/* Difference Badge */}
          <div className={`mt-4 rounded-xl px-4 py-3 border-2 text-center ${diffBg}`}>
            <div className={`text-lg font-black ${diffText}`}>{diffLabel}</div>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="village-card p-4">
        <label className="block text-sm font-bold text-stone-800 mb-2">📝 {tc.note}</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="जैसे: कर्मचारी की छुट्टी थी, रात को देर से बंद हुई..."
          rows={2}
          className="w-full text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pb-4">
        {/* Save / Close Day */}
        <button
          onClick={closeDay}
          disabled={!physicalCash || isNaN(parseFloat(physicalCash))}
          className={`w-full py-4 rounded-xl font-black text-base tracking-tight transition-all active:scale-[0.98] cursor-pointer ${
            saveSuccess
              ? 'bg-emerald-600 text-white'
              : physicalCash
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
          }`}
        >
          {saveSuccess ? '✅ गल्ला सुरक्षित हो गया!' : `💾 ${tc.closeDayBtn}`}
        </button>

        {/* WhatsApp + Print row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={sendWhatsApp}
            disabled={!physicalCash}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            📲 व्हाट्सएप
          </button>
          <button
            onClick={handlePrint}
            disabled={!physicalCash}
            className="flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-bold px-3 py-3 rounded-xl transition-colors cursor-pointer active:scale-95"
          >
            🖨️ {btConnected ? 'BT प्रिंट' : tc.printFallback}
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

