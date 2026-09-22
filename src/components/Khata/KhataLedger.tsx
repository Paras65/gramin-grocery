import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, Calendar, ArrowUpRight, ArrowDownLeft, 
  Share2, History, AlertTriangle, UserPlus, X, BookOpen,
  Printer, FileText, Send, Lock
} from 'lucide-react';
import { db } from '../../db';
import type { Customer, DueReason, Transaction } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { printCustomerStatement } from '../../utils/thermalPrint';
import { syncService } from '../../services/syncService';

export const KhataLedger: React.FC = () => {
  const { t } = useLanguage();
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const isPro = syncService.isPro();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPara, setSelectedPara] = useState<string>('all');
  const [activeCustomerForLedger, setActiveCustomerForLedger] = useState<Customer | null>(null);

  // Quick transaction modal (Jama or Udhaar)
  const [txnModal, setTxnModal] = useState<{
    customer: Customer;
    type: 'JAMA' | 'UDHAAR';
  } | null>(null);
  const [txnAmount, setTxnAmount] = useState<string>('');
  const [txnNote, setTxnNote] = useState<string>('');

  // Add new customer modal
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustPara, setNewCustPara] = useState('Patel Para (पटेल पारा)');
  const [newCustBalance, setNewCustBalance] = useState('');
  const [newCustDueReason, setNewCustDueReason] = useState<DueReason>('KHARIF_DHAN');
  const [newCustDueDate, setNewCustDueDate] = useState('2026-11-25');
  const [newCustNotes, setNewCustNotes] = useState('');

  // Get distinct Paras
  const allParas: string[] = Array.from(new Set(customers.map((c: Customer) => c.para).filter(Boolean)));

  // Filtered Customers
  const filteredCustomers = customers.filter((c: Customer) => {
    const matchesPara = selectedPara === 'all' || c.para === selectedPara;
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.phone.includes(searchQuery);
    return matchesPara && matchesSearch;
  });

  const totalOutstanding = customers.reduce((sum: number, c: Customer) => sum + (c.balanceDue || 0), 0);
  const kharifDhanTotal = customers
    .filter((c: Customer) => c.dueReason === 'KHARIF_DHAN')
    .reduce((sum: number, c: Customer) => sum + (c.balanceDue || 0), 0);

  // Handle Jama / Udhaar submission
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnModal || !txnAmount || isNaN(Number(txnAmount))) return;

    const amount = parseFloat(txnAmount);
    if (amount <= 0) return;

    const { customer, type } = txnModal;
    const newBalance = type === 'JAMA' 
      ? Math.max(0, (customer.balanceDue || 0) - amount)
      : (customer.balanceDue || 0) + amount;

    const timestamp = new Date().toISOString();

    if (customer.id) {
      await db.customers.update(customer.id, {
        balanceDue: newBalance,
        updatedAt: timestamp
      });

      await db.transactions.add({
        id: 'txn_' + Math.random().toString(36).substring(2, 9),
        customerId: customer.id,
        type,
        amount,
        timestamp,
        note: txnNote || (type === 'JAMA' ? 'भुगतान प्राप्त (Cash Received)' : 'उधार दिया (Credit)')
      });
    }

    setTxnModal(null);
    setTxnAmount('');
    setTxnNote('');
  };

  // Handle Add New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const initialBal = parseFloat(newCustBalance) || 0;
    const customerId = 'cust_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await db.customers.add({
      id: customerId,
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '98XXXXXXXX',
      para: newCustPara,
      balanceDue: initialBal,
      dueDate: newCustDueDate,
      dueReason: newCustDueReason,
      notes: newCustNotes,
      createdAt: now,
      updatedAt: now
    });

    if (initialBal > 0) {
      await db.transactions.add({
        id: 'txn_' + Math.random().toString(36).substring(2, 9),
        customerId,
        type: 'UDHAAR',
        amount: initialBal,
        timestamp: now,
        note: 'खाता खोलते समय पुराना बकाया'
      });
    }

    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustBalance('');
    setNewCustNotes('');
  };

  // WhatsApp Reminder message
  const sendWhatsAppReminder = (customer: Customer) => {
    const reasonText = customer.dueReason === 'KHARIF_DHAN' 
      ? 'धान खरीदी/फसल भुगतान' 
      : customer.dueReason === 'MONTHLY_DBT' 
      ? 'महतारी वंदन / सरकारी DBT' 
      : 'नियत तारीख';

    let text = `नमस्ते ${customer.name} जी,\n`;
    text += `दुकान के बही-खाते अनुसार आपका कुल बकाया *₹${customer.balanceDue}* है।\n`;
    if (customer.dueDate) {
      text += `📅 भुगतान का वादा: ${customer.dueDate} (${reasonText})\n`;
    }
    text += `कृपया समय पर भुगतान कर दुकान संचालन में सहयोग दें।\n`;
    text += `🙏 धन्यवाद! - ग्रामीण किराना स्टोर`;

    const encoded = encodeURIComponent(text);
    const phone = customer.phone.replace(/[^0-9]/g, '');
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank');
  };

  // PRO: Blast WhatsApp reminder to ALL overdue customers
  const blastWhatsAppReminders = () => {
    const overdue = customers.filter((c: Customer) => c.balanceDue > 0);
    if (overdue.length === 0) {
      alert('सभी ग्राहकों का हिसाब साफ है। कोई बकाया नहीं!');
      return;
    }
    const ok = window.confirm(
      `${overdue.length} ग्राहकों को WhatsApp तगादा भेजना है?\n` +
      `(प्रत्येक के लिए एक-एक WhatsApp खुलेगा)`
    );
    if (!ok) return;
    overdue.forEach((c: Customer, i: number) => {
      setTimeout(() => sendWhatsAppReminder(c), i * 800);
    });
  };

  // Thermal Print Customer Statement (58mm/BT)
  const handlePrintStatement = async (customer: Customer) => {
    const custTxns = transactions
      .filter((t: Transaction) => t.customerId === customer.id)
      .sort((a: Transaction, b: Transaction) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const totalUdhaar = custTxns
      .filter(t => t.type === 'UDHAAR')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalJama = custTxns
      .filter(t => t.type === 'JAMA')
      .reduce((sum, t) => sum + t.amount, 0);

    await printCustomerStatement({
      storeName: 'ग्रामीण किराना स्टोर',
      date: new Date().toLocaleDateString('hi-IN'),
      customerName: customer.name,
      customerPara: customer.para,
      customerPhone: customer.phone,
      transactions: custTxns.map(t => ({
        date: t.timestamp,
        type: t.type,
        amount: t.amount,
        note: t.note,
      })),
      totalUdhaar,
      totalJama,
      netBalance: customer.balanceDue,
    });
  };

  // Send Itemized Statement via WhatsApp
  const sendWhatsAppStatement = (customer: Customer) => {
    const custTxns = transactions
      .filter((t: Transaction) => t.customerId === customer.id)
      .sort((a: Transaction, b: Transaction) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let text = `📒 *ग्रामीण किराना — ग्राहक खाता पर्ची (Statement)*\n`;
    text += `👤 *ग्राहक:* ${customer.name} (${customer.para})\n`;
    text += `📅 *तारीख:* ${new Date().toLocaleDateString('hi-IN')}\n`;
    text += `--------------------------------\n`;
    text += `*लेन-देन विवरण:*\n`;
    custTxns.forEach((t, i) => {
      const d = t.timestamp.split('T')[0];
      const typeLabel = t.type === 'UDHAAR' ? 'उधार (+)' : 'जमा (-)';
      text += `${i + 1}. ${d} | ${typeLabel}: ₹${t.amount} ${t.note ? `(${t.note})` : ''}\n`;
    });
    text += `--------------------------------\n`;
    text += `🔴 *कुल अंतिम बाकी रकम: ₹${customer.balanceDue}*\n`;
    text += `🙏 शुद्ध ग्रामीण हिसाब। सहयोग के लिए धन्यवाद!`;

    const encoded = encodeURIComponent(text);
    const phone = customer.phone.replace(/[^0-9]/g, '');
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Stats Overview with Village Premium Warm Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Udhaar Banner */}
        <div className="village-card p-4 rounded-3xl bg-gradient-to-br from-white to-rose-50/40 border border-rose-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 uppercase tracking-wider">{t.khata.totalUdhaar}</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-700 mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-500 mt-1 m-0 font-medium">
            {customers.length} {t.khata.totalCustomers}
          </p>
        </div>

        {/* Harvest Repayments (Kharif Dhan) */}
        <div className="village-card p-4 rounded-3xl bg-gradient-to-br from-white to-amber-50/50 border border-amber-300/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider">🌾 धान फसल पर अटका उधार</span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-1">
            ₹{kharifDhanTotal.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-stone-500 mt-1 m-0 font-medium">
            नवंबर-जनवरी समर्थन मूल्य पर चुकता होगा
          </p>
        </div>

        {/* New Customer Action Card */}
        <div className="bg-stone-900 text-white p-4 rounded-3xl shadow-sm border border-amber-500/40 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>डिजिटल बही-खाता सुरक्षा</span>
            </div>
            <div className="text-sm font-black mt-1 text-stone-100">100% ऑफलाइन बही-खाता</div>
          </div>
          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="mt-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 py-2 px-3.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
          >
            <UserPlus className="w-4 h-4 text-stone-950" />
            <span>{t.khata.newCustomerBtn}</span>
          </button>
        </div>
      </div>

      {/* PRO: Blast WhatsApp Reminder to All Overdue Customers */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-stone-500 font-medium">
          {customers.filter((c: Customer) => c.balanceDue > 0).length} ग्राहकों का बकाया चल रहा है
        </span>
        {isPro ? (
          <button
            onClick={blastWhatsAppReminders}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            📲 सभी उधारी वालों को याद दिलाएं (PRO)
          </button>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-stone-200 text-stone-500 font-bold text-xs cursor-not-allowed"
            title="यह सुविधा ग्रामीण PRO (₹99/माह) में है"
          >
            <Lock className="w-3.5 h-3.5" />
            🔒 सभी को WhatsApp तगादा (PRO)
          </button>
        )}
      </div>

      {/* Filter Bar: Mohalla / Para Filter & Search */}
      <div className="village-card p-3 rounded-2xl bg-white flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.khata.searchCustomer}
            className="w-full pl-9 pr-3 py-1.5 bg-[#faf8f3] border border-amber-200/70 rounded-xl text-xs sm:text-sm text-stone-900 font-medium outline-hidden focus:border-amber-500"
          />
        </div>

        {/* Para / Mohalla Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-600 whitespace-nowrap hidden sm:inline">
            {t.khata.filterByPara}:
          </span>
          <select
            value={selectedPara}
            onChange={e => setSelectedPara(e.target.value)}
            className="bg-[#faf8f3] border border-amber-200/70 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 outline-hidden focus:border-amber-500"
          >
            <option value="all">{t.khata.allParas}</option>
            {allParas.map((para: string) => (
              <option key={para} value={para}>
                {para}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Ledger Cards: Responsive 1 col mobile, 2 cols tablet, 3 cols widescreen desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredCustomers.map((customer: Customer) => {
          const hasBalance = customer.balanceDue > 0;
          return (
            <div
              key={customer.id}
              className={`village-card rounded-2xl p-4 flex flex-col justify-between ${
                hasBalance ? 'bahi-khata-edge-red' : 'bahi-khata-edge-green'
              }`}
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-black text-stone-950 text-base m-0 truncate">
                      {customer.name}
                    </h3>
                    <span className="inline-block text-[11px] font-bold bg-amber-100/80 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full mt-1">
                      📍 {customer.para}
                    </span>
                  </div>

                  {/* Balance Display */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">
                      {t.khata.balance}
                    </span>
                    <span className={`text-xl sm:text-2xl font-black ${
                      hasBalance ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      ₹{customer.balanceDue}
                    </span>
                  </div>
                </div>

                {/* Repayment Cycle Info */}
                <div className="mt-3 bg-[#faf8f3] rounded-xl p-2.5 text-xs text-stone-700 space-y-1.5 border border-amber-200/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-500">अपेक्षित भुगतान:</span>
                    <span className="font-bold text-stone-900">
                      {customer.dueReason === 'KHARIF_DHAN' ? t.khata.reasons.KHARIF_DHAN :
                       customer.dueReason === 'MONTHLY_DBT' ? t.khata.reasons.MONTHLY_DBT :
                       customer.dueReason === 'WEEKLY_HAAT' ? t.khata.reasons.WEEKLY_HAAT : 'अन्य'}
                    </span>
                  </div>
                  {customer.dueDate && (
                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>तारीख:</span>
                      <span className="font-bold text-stone-800">{customer.dueDate}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="text-[11px] text-stone-600 italic pt-1 border-t border-amber-100 line-clamp-1">
                      "{customer.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Large thumb touch targets */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                <div className="flex gap-1.5">
                  {/* Jama Button (+ Received) */}
                  <button
                    onClick={() => {
                      setTxnModal({ customer, type: 'JAMA' });
                      setTxnAmount('');
                    }}
                    className="bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>{t.khata.jamaBtn}</span>
                  </button>

                  {/* Udhaar Button (- Given) */}
                  <button
                    onClick={() => {
                      setTxnModal({ customer, type: 'UDHAAR' });
                      setTxnAmount('');
                    }}
                    className="bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>{t.khata.udhaarBtn}</span>
                  </button>
                </div>

                <div className="flex gap-1">
                  {/* WhatsApp Reminder */}
                  {hasBalance && (
                    <button
                      onClick={() => sendWhatsAppReminder(customer)}
                      className="p-2 rounded-xl text-emerald-800 hover:bg-emerald-50 border border-emerald-300/80 cursor-pointer active:scale-95 transition-all"
                      title={t.khata.whatsappReminder}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Full Ledger History */}
                  <button
                    onClick={() => setActiveCustomerForLedger(customer)}
                    className="p-2 rounded-xl text-stone-700 hover:bg-amber-50 border border-stone-300/80 cursor-pointer active:scale-95 transition-all"
                    title={t.khata.viewLedger}
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction Modal (Jama or Udhaar) */}
      {txnModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                {txnModal.type === 'JAMA' ? 'जमा प्रविष्टि (Payment Received)' : 'उधार प्रविष्टि (Add Credit)'}
              </h3>
              <button
                onClick={() => setTxnModal(null)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="mt-3 space-y-3">
              <div className="bg-[#faf8f3] p-3 rounded-2xl text-xs border border-amber-200/50">
                <div className="font-bold text-stone-900">{txnModal.customer.name}</div>
                <div className="text-stone-500">{txnModal.customer.para}</div>
                <div className="text-stone-700 font-semibold mt-1">
                  वर्तमान बकाया: <span className="text-rose-700 font-black">₹{txnModal.customer.balanceDue}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  राशि दर्ज करें (₹): *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  autoFocus
                  value={txnAmount}
                  onChange={e => setTxnAmount(e.target.value)}
                  placeholder="उदा. 500"
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-xl font-black text-stone-900 outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  विवरण / नोट (वैकल्पिक):
                </label>
                <input
                  type="text"
                  value={txnNote}
                  onChange={e => setTxnNote(e.target.value)}
                  placeholder="उदा. नकद भुगतान / तेल और चावल लिया"
                  className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-800 outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTxnModal(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-sm cursor-pointer ${
                    txnModal.type === 'JAMA' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-rose-700 hover:bg-rose-600'
                  }`}
                >
                  {txnModal.type === 'JAMA' ? 'जमा सुरक्षित करें' : 'उधार दर्ज करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Customer Ledger History Modal */}
      {activeCustomerForLedger && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-amber-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <h3 className="font-black text-stone-950 text-base m-0">
                  {activeCustomerForLedger.name} का बही-खाता
                </h3>
                <p className="text-xs text-stone-500 m-0 font-medium">
                  {activeCustomerForLedger.para} • फोन: {activeCustomerForLedger.phone}
                </p>
              </div>
              <button
                onClick={() => setActiveCustomerForLedger(null)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Balance Alert */}
            <div className="my-3 bg-[#faf8f3] p-3 rounded-2xl border border-amber-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-500 font-medium">कुल अंतिम बकाया:</span>
                <div className="text-xl font-black text-rose-700">₹{activeCustomerForLedger.balanceDue}</div>
              </div>
              <button
                onClick={() => sendWhatsAppReminder(activeCustomerForLedger)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>तगादा भेजें</span>
              </button>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                लेन-देन इतिहास:
              </h4>
              {transactions
                .filter((t: Transaction) => t.customerId === activeCustomerForLedger.id)
                .sort((a: Transaction, b: Transaction) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((txn: Transaction) => (
                  <div
                    key={txn.id}
                    className="p-2.5 rounded-xl border border-stone-200 bg-[#faf8f3] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                          txn.type === 'JAMA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {txn.type === 'JAMA' ? 'जमा (Payment)' : 'उधार (Credit)'}
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium">
                          {new Date(txn.timestamp).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="text-xs text-stone-800 font-semibold mt-1">
                        {txn.note || 'दुकान लेन-देन'}
                      </div>
                      {txn.billItemsSummary && (
                        <div className="text-[10px] text-stone-500 italic mt-0.5">
                          सामान: {txn.billItemsSummary}
                        </div>
                      )}
                    </div>
                    <div className={`font-black text-sm ${
                      txn.type === 'JAMA' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {txn.type === 'JAMA' ? '-' : '+'}₹{txn.amount}
                    </div>
                  </div>
                ))}
            </div>

            <div className="pt-3 mt-2 border-t border-stone-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintStatement(activeCustomerForLedger)}
                  className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="58mm थर्मल प्रिंटर या ब्राउज़र प्रिंट"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>🖨️ पर्ची प्रिंट</span>
                </button>
                <button
                  type="button"
                  onClick={() => sendWhatsAppStatement(activeCustomerForLedger)}
                  className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="विस्तृत खाता पर्ची व्हाट्सएप भेजें"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-200" />
                  <span>📲 खाता पर्ची</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setActiveCustomerForLedger(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                {t.khata.newCustomerBtn}
              </h3>
              <button
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ग्राहक का नाम: *
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="उदा. राधेलाल पटेल"
                  className="w-full p-2.5 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    मोबाइल नंबर:
                  </label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="98261XXXXX"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    गाँव का पारा / मोहल्ला:
                  </label>
                  <input
                    type="text"
                    value={newCustPara}
                    onChange={e => setNewCustPara(e.target.value)}
                    placeholder="उदा. पटेल पारा"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    शुरुआती पुराना बाकी (₹):
                  </label>
                  <input
                    type="number"
                    value={newCustBalance}
                    onChange={e => setNewCustBalance(e.target.value)}
                    placeholder="0"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    भुगतान चक्र (साधन):
                  </label>
                  <select
                    value={newCustDueReason}
                    onChange={e => setNewCustDueReason(e.target.value as DueReason)}
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                  >
                    <option value="KHARIF_DHAN">🌾 धान खरीदी (फसल)</option>
                    <option value="MONTHLY_DBT">🏛️ महतारी वंदन / PM-किसान</option>
                    <option value="WEEKLY_HAAT">🎪 साप्ताहिक हाट</option>
                    <option value="OTHER">अन्य</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  अपेक्षित भुगतान तारीख:
                </label>
                <input
                  type="date"
                  value={newCustDueDate}
                  onChange={e => setNewCustDueDate(e.target.value)}
                  className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  विशेष टिप्पणी / नोट:
                </label>
                <input
                  type="text"
                  value={newCustNotes}
                  onChange={e => setNewCustNotes(e.target.value)}
                  placeholder="उदा. धान बिकने पर चुकता करेंगे"
                  className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-sm"
                >
                  ग्राहक जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
