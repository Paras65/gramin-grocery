import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../db';
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
  const [loadingTotals, setLoadingTotals] = useState<boolean>(true);

  // Form state
  const [physicalCash, setPhysicalCash] = useState<string>('');
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [expDesc, setExpDesc] = useState<string>('');
  const [expAmt, setExpAmt] = useState<string>('');
  const [note, setNote] = useState<string>('');

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

      // Filter by payment mode in JS (Dexie compound index not set up for paymentMode+timestamp)
      const cashSales = todaySales
        .filter(s => s.paymentMode === 'CASH')
        .reduce((sum, s) => sum + s.totalAmount, 0);

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
      setJamaTotal(Math.round(jamaCollected * 100) / 100);

      // Check if already closed today
      const existing = await db.dailyCashClose
        .where('date').equals(today)
        .first();
      if (existing) setSavedRecord(existing);

    } finally {
      setLoadingTotals(false);
    }
  }, [today]);

  useEffect(() => { loadTotals(); }, [loadTotals]);

  // ─── Computed values ─────────────────────────────────────────────────────
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const physical = parseFloat(physicalCash) || 0;
  const expectedCash = cashSalesTotal + jamaTotal - totalExpenses;
  const difference = physical - expectedCash;

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

    const record: DailyCashCloseType = {
      id: 'cashclose_' + today,
      date: today,
      physicalCashInDrawer: physical,
      totalCashSalesDay: cashSalesTotal,
      totalJamaCollectedDay: jamaTotal,
      totalExpenses,
      expenses,
      calculatedExpectedCash: expectedCash,
      cashDifference: difference,
      note: note.trim() || undefined,
      closedAt: new Date().toISOString(),
    };

    await db.dailyCashClose.put(record);
    setSavedRecord(record);
    setSaveSuccess(true);
    loadHistory();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // ─── Past Record WhatsApp & Print ──────────────────────────────────────────
  const sendPastRecordWhatsApp = (rec: DailyCashCloseType) => {
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
      `🏪 *ग्रामीण किराना — दैनिक गल्ला हिसाब (इतिहास)*`,
      `📅 ${displayDate}`,
      ``,
      `💰 नकद बिक्री: *${fmtINR(rec.totalCashSalesDay)}*`,
      `📥 जमा उधार: *${fmtINR(rec.totalJamaCollectedDay)}*`,
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
    await printDaySummary({
      storeName: 'ग्रामीण किराना',
      date: new Date(rec.date).toLocaleDateString('hi-IN'),
      cashSales: rec.totalCashSalesDay,
      jamaCollected: rec.totalJamaCollectedDay,
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
    const displayDate = new Date(today).toLocaleDateString('hi-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const diffLine =
      difference === 0 ? '✅ गल्ला बिल्कुल मिला'
      : difference > 0 ? `📈 ${fmtINR(difference)} अतिरिक्त`
      : `⚠️ ${fmtINR(Math.abs(difference))} कम`;

    const expLines = expenses.map(e => `   • ${e.description}: ${fmtINR(e.amount)}`).join('\n');

    const msg = [
      `🏪 *ग्रामीण किराना — दैनिक गल्ला हिसाब*`,
      `📅 ${displayDate}`,
      ``,
      `💰 नकद बिक्री: *${fmtINR(cashSalesTotal)}*`,
      `📥 जमा उधार: *${fmtINR(jamaTotal)}*`,
      expenses.length > 0 ? `\n📤 खर्चे:\n${expLines}\n   कुल खर्च: *${fmtINR(totalExpenses)}*` : '',
      ``,
      `🧾 अपेक्षित नकद: *${fmtINR(expectedCash)}*`,
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
    await printDaySummary({
      storeName: 'ग्रामीण किराना',
      date: new Date(today).toLocaleDateString('hi-IN'),
      cashSales: cashSalesTotal,
      jamaCollected: jamaTotal,
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
                    </div>
                    <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-stone-200">
                      <span className="text-stone-500 block text-[10px]">जमा वसूली</span>
                      <span className="font-black text-stone-900 text-xs sm:text-sm">{fmtINR(rec.totalJamaCollectedDay)}</span>
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
        </div>
      )}

      {/* Auto-fetched totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Cash Sales Card */}
        <div className="village-card bahi-khata-edge-green p-4">
          <div className="text-xs font-semibold text-stone-500 mb-1">{tc.cashSalesLabel}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-24" />
          ) : (
            <div className="text-2xl font-black text-stone-900">{fmtINR(cashSalesTotal)}</div>
          )}
          <div className="text-[11px] text-emerald-700 mt-1">🟢 नकद (Cash) बिल्स आज</div>
        </div>

        {/* Jama Collected Card */}
        <div className="village-card bahi-khata-edge-gold p-4">
          <div className="text-xs font-semibold text-stone-500 mb-1">{tc.jamaLabel}</div>
          {loadingTotals ? (
            <div className="h-7 bg-stone-200 animate-pulse rounded w-24" />
          ) : (
            <div className="text-2xl font-black text-stone-900">{fmtINR(jamaTotal)}</div>
          )}
          <div className="text-[11px] text-amber-700 mt-1">📥 उधार जमा हुई रकम</div>
        </div>
      </div>

      {/* Physical Cash Input */}
      <div className="village-card p-4 sm:p-5">
        <label className="block text-sm font-bold text-stone-800 mb-1">
          💵 {tc.physicalCash}
        </label>
        <p className="text-[11px] text-stone-500 mb-3">{tc.physicalCashHint}</p>
        <input
          type="number"
          inputMode="numeric"
          value={physicalCash}
          onChange={e => setPhysicalCash(e.target.value)}
          placeholder="0"
          className="w-full text-3xl sm:text-4xl font-black text-stone-900 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 placeholder:text-stone-300 transition-all"
        />
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
            <div className="flex justify-between">
              <span className="text-stone-600">{tc.cashSalesLabel}</span>
              <span className="font-bold text-emerald-700">{fmtINR(cashSalesTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">{tc.jamaLabel}</span>
              <span className="font-bold text-amber-700">{fmtINR(jamaTotal)}</span>
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

