import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  X, BookOpen, 
  Printer, QrCode, Phone, MapPin, Calendar, 
  Share2, ChevronDown, 
  ExternalLink, Copy, Check
} from 'lucide-react';
import { db } from '../../db';
import type { Customer, Transaction } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';
import { QRCodeSVG } from 'qrcode.react';
import { buildUpiPayUrl } from '../../utils/qrCode';
import { printCustomerStatement } from '../../utils/thermalPrint';
import { openWhatsApp } from '../../utils/whatsapp';
import { syncService } from '../../services/syncService';

interface CustomerPassbookModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export const CustomerPassbookModal: React.FC<CustomerPassbookModalProps> = ({
  customer,
  isOpen,
  onClose,
  isStandalone = false,
}) => {
  const storeInfo = syncService.getStoreInfo();
  const storeName = storeInfo?.storeName || (storeInfo as any)?.name || 'ग्रामीण किराना स्टोर';
  const village = storeInfo?.village || 'छत्तीसगढ़';
  const storeUpi = localStorage.getItem('gk_store_upi_id') || '';

  const [copiedLink, setCopiedLink] = useState(false);
  const [statementFilter, setStatementFilter] = useState<'ALL' | '30DAYS'>('ALL');
  const [payAmount, setPayAmount] = useState<string>(
    customer.balanceDue > 0 ? String(customer.balanceDue) : ''
  );
  const [showQrExpanded, setShowQrExpanded] = useState<boolean>(true);

  // Load all transactions for this customer from Dexie
  const transactions = useLiveQuery(
    () => db.transactions.where('customerId').equals(customer.id || '').toArray(),
    [customer.id]
  ) || [];

  if (!isOpen) return null;

  // Sort chronological for passbook running balance calculation
  const sortedTxns = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Filter based on selected date range (All vs Last 30 Days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filteredSortedTxns = statementFilter === '30DAYS'
    ? sortedTxns.filter(t => new Date(t.timestamp) >= thirtyDaysAgo)
    : sortedTxns;

  // Compute running balances across full history
  let running = 0;
  const ledgerRowsWithRunning = sortedTxns.map((t: Transaction) => {
    if (t.type === 'UDHAAR') {
      running += t.amount;
    } else {
      running = Math.max(0, running - t.amount);
    }
    return {
      ...t,
      runningBalance: running,
    };
  });

  // Filter displayed rows
  const ledgerRows = (statementFilter === '30DAYS'
    ? ledgerRowsWithRunning.filter(t => new Date(t.timestamp) >= thirtyDaysAgo)
    : ledgerRowsWithRunning
  ).reverse(); // Display newest on top for immediate glance

  const totalUdhaarGiven = filteredSortedTxns
    .filter((t) => t.type === 'UDHAAR')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalJamaRepaid = filteredSortedTxns
    .filter((t) => t.type === 'JAMA')
    .reduce((sum, t) => sum + t.amount, 0);

  // Passbook share URL
  const passbookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}#passbook=${customer.id}`
    : '';

  const handleCopyPassbookLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(passbookUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    // Recent 5 transactions itemized list for WhatsApp text
    const recentTxns = [...sortedTxns].reverse().slice(0, 5);
    const txnLines = recentTxns.map(t => {
      const d = t.timestamp.split('T')[0];
      const typeLabel = t.type === 'UDHAAR' ? 'उधार (+)' : 'जमा (-)';
      const noteStr = t.note ? ` (${t.note})` : '';
      return `• ${d}: ${typeLabel} ₹${t.amount}${noteStr}`;
    }).join('\n');

    const msg =
      `📖 *बही-खाता पर्ची — ${storeName}*\n` +
      `📍 गाँव: ${village}\n` +
      `👤 खाताधारक: *${customer.name}*${customer.para ? ` (${customer.para})` : ''}\n` +
      `📅 दिनांक: ${new Date().toLocaleDateString('hi-IN')}\n` +
      `--------------------------------\n` +
      `*हालिया लेन-देन हिसाब (Recent Transactions):*\n` +
      `${txnLines || '• कोई पूर्व लेन-देन दर्ज नहीं'}\n` +
      `--------------------------------\n` +
      `कुल उधार: ₹${totalUdhaarGiven}\n` +
      `कुल जमा: ₹${totalJamaRepaid}\n` +
      `*कुल अंतिम बाकी: ${formatINR(customer.balanceDue)}*\n` +
      `--------------------------------\n` +
      (storeUpi ? `📲 UPI भुगतान ID: *${storeUpi}*\n\n` : '') +
      `🌐 संपूर्ण पासबुक व रसीदें यहाँ देखें:\n` +
      `${passbookUrl}\n\n` +
      `धन्यवाद! शुद्ध ग्रामीण हिसाब 🙏`;

    openWhatsApp(customer.phone, msg);
  };

  // Generate UPI payment URL
  const paymentAmountNum = parseFloat(payAmount) || customer.balanceDue;
  const upiPayUrl = storeUpi
    ? buildUpiPayUrl(storeUpi, storeName, paymentAmountNum > 0 ? paymentAmountNum : 0)
    : '';

  return (
    <div className={`fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto ${isStandalone ? 'bg-stone-900' : ''}`}>
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-stone-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>डिजिटल बही-खाता पासबुक</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-[10px] text-stone-400 font-normal">सुरक्षित व पारदर्शी</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {storeName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-stone-500" />
                  {village}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStandalone && (
              <button
                onClick={onClose}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-full text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="बंद करें"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-stone-800">
          
          {/* Customer Profile & Balance Overview */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 bg-stone-200 px-2 py-0.5 rounded-md">
                खाताधारक (Account Holder)
              </span>
              <h3 className="text-xl font-black text-stone-900 mt-1">
                {customer.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                {customer.phone && (
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {customer.phone}
                  </span>
                )}
                {customer.para && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    {customer.para}
                  </span>
                )}
              </div>
            </div>

            {/* Big Outstanding Balance Display */}
            <div className={`p-4 rounded-2xl border text-center sm:text-right ${
              customer.balanceDue > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="text-[11px] font-bold uppercase tracking-wider">
                {customer.balanceDue > 0 ? 'कुल बकाया शेष (Due Balance)' : 'खाता स्थिति'}
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5">
                {customer.balanceDue > 0 ? formatINR(customer.balanceDue) : '₹0 (हिसाब साफ)'}
              </div>
              {customer.balanceDue > 0 && customer.dueDate && (
                <div className="text-[10px] font-semibold text-rose-700 mt-1 flex items-center justify-center sm:justify-end gap-1">
                  <Calendar className="w-3 h-3" />
                  वादा: {formatDate(customer.dueDate)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
              <span className="text-stone-500 block text-[10px]">कुल उधार लिया</span>
              <span className="font-bold text-rose-700 text-sm">{formatINR(totalUdhaarGiven)}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
              <span className="text-stone-500 block text-[10px]">कुल जमा चुकाया</span>
              <span className="font-bold text-emerald-700 text-sm">{formatINR(totalJamaRepaid)}</span>
            </div>
            <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200 col-span-2 sm:col-span-1">
              <span className="text-stone-500 block text-[10px]">उधारी सीमा (क्रेडिट लिमिट)</span>
              <span className="font-bold text-stone-800 text-sm">{formatINR(customer.creditLimit || 2000)}</span>
            </div>
          </div>

          {/* Direct UPI Payment Section (when balanceDue > 0) */}
          {customer.balanceDue > 0 && storeUpi && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl border border-amber-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-amber-700" />
                  <div>
                    <h4 className="text-sm font-black text-amber-950">
                      सीधे दुकान खाते में UPI से भुगतान करें
                    </h4>
                    <p className="text-[11px] text-amber-800">
                      PhonePe, Google Pay, Paytm या BHIM से स्कैन करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrExpanded(!showQrExpanded)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  {showQrExpanded ? 'QR छुपाएं' : 'QR दिखाएं'}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showQrExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showQrExpanded && (
                <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-amber-200/80 shrink-0">
                    {upiPayUrl ? (
                      <div className="w-36 h-36 flex items-center justify-center overflow-hidden">
                        <QRCodeSVG
                          value={upiPayUrl}
                          size={136}
                          level="H"
                          marginSize={2}
                          imageSettings={{
                            src: '/icons/upi-badge.svg',
                            height: 28,
                            width: 28,
                            excavate: true,
                          }}
                          className="w-full h-full"
                        />
                      </div>
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center text-xs text-stone-400">
                        QR तैयार नहीं
                      </div>
                    )}
                    <div className="text-[10px] text-center text-stone-500 font-mono mt-1">
                      {storeUpi}
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-900 mb-1">
                        भुगतान राशि (₹):
                      </label>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="राशि दर्ज करें"
                        className="w-full px-3 py-2 bg-white rounded-xl border border-amber-300 font-bold text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <a
                      href={upiPayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 text-xs cursor-pointer transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      UPI ऐप में खोलें (Pay via UPI)
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Passbook Ledger Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <span>लेन-देन विवरण (Passbook Ledger)</span>
                <span className="text-xs font-normal text-stone-500">
                  ({ledgerRows.length} प्रविष्टियां)
                </span>
              </h4>

              {/* Statement Filter Selector (All vs Last 30 Days) */}
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setStatementFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statementFilter === 'ALL'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  सभी ({sortedTxns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatementFilter('30DAYS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statementFilter === '30DAYS'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  पिछले 30 दिन
                </button>
              </div>
            </div>

            {ledgerRows.length === 0 ? (
              <div className="bg-stone-50 rounded-2xl p-8 text-center text-stone-500 text-xs border border-stone-200">
                इस खाते में अभी कोई लेन-देन दर्ज नहीं है।
              </div>
            ) : (
              <div className="border border-stone-200 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5 sm:p-3">दिनांक</th>
                        <th className="p-2.5 sm:p-3">विवरण / सामान</th>
                        <th className="p-2.5 sm:p-3 text-right">उधार (+)</th>
                        <th className="p-2.5 sm:p-3 text-right">जमा (-)</th>
                        <th className="p-2.5 sm:p-3 text-right">बकाया शेष</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {ledgerRows.map((txn) => {
                        const isUdhaar = txn.type === 'UDHAAR';
                        return (
                          <tr key={txn.id} className="hover:bg-stone-50/70 transition-colors">
                            <td className="p-2.5 sm:p-3 whitespace-nowrap text-stone-600 font-medium">
                              <div>{formatDate(txn.timestamp)}</div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                {new Date(txn.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>
                            <td className="p-2.5 sm:p-3">
                              <div className="font-semibold text-stone-800">
                                {txn.billItemsSummary || txn.note || (isUdhaar ? 'सामान उधारी' : 'नकद जमा')}
                              </div>
                              {txn.billItemsSummary && txn.note && txn.note !== txn.billItemsSummary && (
                                <div className="text-[10px] text-stone-500 mt-0.5">
                                  नोट: {txn.note}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-bold text-rose-600 whitespace-nowrap">
                              {isUdhaar ? `+${formatINR(txn.amount)}` : '—'}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {!isUdhaar ? `-${formatINR(txn.amount)}` : '—'}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right font-black text-stone-900 whitespace-nowrap bg-stone-50/40">
                              {formatINR(txn.runningBalance)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-stone-100 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPassbookLink}
              className="py-2 px-3 bg-white hover:bg-stone-50 active:scale-95 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">लिंक कॉपी हुआ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-500" />
                  <span>पासबुक लिंक कॉपी</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shadow-emerald-600/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp पर भेजें</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => printCustomerStatement({
                storeName,
                date: statementFilter === '30DAYS' 
                  ? `${new Date().toLocaleDateString('hi-IN')} (पिछले 30 दिन)` 
                  : new Date().toLocaleDateString('hi-IN'),
                customerName: customer.name,
                customerPara: customer.para,
                customerPhone: customer.phone,
                transactions: filteredSortedTxns.map(t => ({
                  date: t.timestamp,
                  type: t.type,
                  amount: t.amount,
                  note: t.note,
                })),
                totalUdhaar: totalUdhaarGiven,
                totalJama: totalJamaRepaid,
                netBalance: customer.balanceDue,
              })}
              className="py-2 px-3 bg-stone-800 hover:bg-stone-900 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{statementFilter === '30DAYS' ? '30-दिन पर्ची प्रिंट' : 'प्रिंट पर्ची (All)'}</span>
            </button>
            {!isStandalone && (
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-stone-200 hover:bg-stone-300 active:scale-95 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                बंद करें
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

