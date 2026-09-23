import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Search, Calendar, ArrowUpRight, ArrowDownLeft, 
  Share2, History, AlertTriangle, UserPlus, X, BookOpen,
  Printer, FileText, Send, Lock, Phone, Trash2, CheckCircle2
} from 'lucide-react';
import { db } from '../../db';
import type { Customer, DueReason, Transaction } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { printCustomerStatement } from '../../utils/thermalPrint';
import { syncService } from '../../services/syncService';
import { openWhatsApp } from '../../utils/whatsapp';
import { formatINR } from '../../utils/formatters';
import { CustomerPassbookModal } from './CustomerPassbookModal';
import { SubscriptionModal } from '../Subscription/SubscriptionModal';

export const KhataLedger: React.FC = () => {
  const { t } = useLanguage();
  const customers = useLiveQuery(() => db.customers.toArray()) || [];
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const isPro = syncService.isPro();
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPara, setSelectedPara] = useState<string>('all');
  const [activeCustomerForLedger, setActiveCustomerForLedger] = useState<Customer | null>(null);
  const [passbookCustomer, setPassbookCustomer] = useState<Customer | null>(null);
  const [settledCustomer, setSettledCustomer] = useState<{
    customer: Customer;
    settledAmount: number;
    timestamp: string;
  } | null>(null);

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
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('2000');
  const [newCustDueReason, setNewCustDueReason] = useState<DueReason>('KHARIF_DHAN');
  const [newCustDueDate, setNewCustDueDate] = useState(() => {
    return new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  });
  const [newCustNotes, setNewCustNotes] = useState('');

  const normalize = (str?: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanPhoneInput = newCustPhone.replace(/\D/g, '').slice(-10);

  // Real-time duplicate phone number match
  const duplicatePhoneMatch = cleanPhoneInput.length === 10
    ? customers.find(c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === cleanPhoneInput)
    : null;

  // Real-time duplicate name match in the same Para
  const duplicateNameMatch = newCustName.trim()
    ? customers.find(c => normalize(c.name) === normalize(newCustName) && c.para === newCustPara)
    : null;

  // Update credit limit for an existing customer
  const handleUpdateCreditLimit = async () => {
    if (!activeCustomerForLedger?.id) return;
    const currentLimit = activeCustomerForLedger.creditLimit ?? 2000;
    const input = window.prompt(`ग्राहक "${activeCustomerForLedger.name}" की उधारी सीमा (क्रेडिट लिमिट ₹) दर्ज करें:`, String(currentLimit));
    if (input === null) return;
    const val = parseFloat(input);
    if (isNaN(val) || val < 0) {
      alert('कृपया सही राशि दर्ज करें!');
      return;
    }
    await db.customers.update(activeCustomerForLedger.id, {
      creditLimit: val,
      updatedAt: new Date().toISOString()
    });
    setActiveCustomerForLedger(prev => prev ? { ...prev, creditLimit: val } : null);
  };

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

  // Clearance Receipt WhatsApp sender
  const sendClearanceReceiptWhatsApp = (cust: Customer, amount: number) => {
    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'ग्रामीण किराना स्टोर';
    const passbookLink = `${window.location.origin}${window.location.pathname}#passbook=${cust.id}`;
    const dateStr = new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const msg = 
      `🌸 *${shopName}* — खाता चुकता पावती 🌸\n\n` +
      `आदरणीय ${cust.name} जी,\n` +
      `आज दिनांक ${dateStr} को आपकी ओर से *₹${amount}* की अंतिम जमा राशि प्राप्त हुई।\n\n` +
      `✅ *दुकान बही-खाता स्थिति: ₹0 (शून्य बकाया)*\n` +
      `आपका पिछला समस्त उधार हिसाब पूर्णतः चुकता व साफ हो चुका है।\n\n` +
      `📖 अपनी अद्यतन डिजिटल पासबुक यहाँ देखें:\n${passbookLink}\n\n` +
      `समय पर भुगतान और अटूट विश्वास के लिए आपका कोटि-कोटि धन्यवाद! 🙏\n` +
      `— ${shopName}`;
    openWhatsApp(cust.phone, msg);
  };

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
      // Atomic ACID transaction for customer balance and ledger entry
      await db.transaction('rw', [db.customers, db.transactions], async () => {
        await db.customers.update(customer.id!, {
          balanceDue: newBalance,
          updatedAt: timestamp
        });

        await db.transactions.add({
          id: 'txn_' + Math.random().toString(36).substring(2, 9),
          customerId: customer.id!,
          type,
          amount,
          timestamp,
          note: txnNote || (type === 'JAMA' ? 'भुगतान प्राप्त (Cash Received)' : 'उधार दिया (Credit)')
        });
      });

      // Check for zero-balance full debt clearance
      if (type === 'JAMA' && newBalance === 0 && (customer.balanceDue || 0) > 0) {
        setSettledCustomer({
          customer: { ...customer, balanceDue: 0 },
          settledAmount: amount,
          timestamp
        });
      } else if (type === 'JAMA' && customer.phone && customer.phone.length === 10) {
        // 1-Tap Jama payment receipt via WhatsApp
        const storeName = syncService.getStoreInfo()?.storeName || 'गाँव किराना स्टोर';
        const msg = 
          `✅ *जमा पावती (Payment Received)*\n` +
          `दुकान: ${storeName}\n` +
          `ग्राहक: ${customer.name}\n` +
          `--------------------\n` +
          `जमा की गई राशि: ${formatINR(amount)}\n` +
          `नया बकाया शेष: ${formatINR(newBalance)}\n` +
          `दिनांक: ${new Date().toLocaleDateString('hi-IN')}\n\n` +
          `धन्यवाद! आपका हिसाब सुरक्षित दर्ज कर लिया गया है।`;
        openWhatsApp(customer.phone, msg);
      }
    }

    setTxnModal(null);
    setTxnAmount('');
    setTxnNote('');
  };

  // Safe Customer Account Deletion (Guard against deleting customers with balanceDue > 0)
  const handleDeleteCustomer = async (cust: Customer) => {
    if (cust.balanceDue > 0) {
      alert(`⚠️ खाता बंद नहीं हो सकता!\n\n${cust.name} पर अभी ₹${cust.balanceDue} का बकाया शेष है।\nखाता हटाने से पहले बकाया राशि शून्य (₹0) होना अनिवार्य है।`);
      return;
    }

    const ok = window.confirm(`क्या आप सच में ${cust.name} का खाता हमेशा के लिए हटाना चाहते हैं?`);
    if (!ok) return;

    if (cust.id) {
      await db.customers.delete(cust.id);
      await db.transactions.where('customerId').equals(cust.id).delete();
      setActiveCustomerForLedger(null);
    }
  };

  // Handle Add New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCustName.trim().replace(/\s+/g, ' ');
    if (!cleanName) {
      alert('कृपया ग्राहक का नाम दर्ज करें!');
      return;
    }

    const cleanPhone = newCustPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone && cleanPhone.length !== 10) {
      alert('कृपया 10-अंकों का मान्य मोबाइल नंबर दर्ज करें!');
      return;
    }

    if (duplicatePhoneMatch) {
      alert(`⚠️ मोबाइल नंबर टकराव: यह नंबर पहले से "${duplicatePhoneMatch.name}" (${duplicatePhoneMatch.para}) के खाते में दर्ज है। कृपया अलग नंबर दें या मौजूदा खाता खोलें।`);
      return;
    }

    if (duplicateNameMatch) {
      const proceed = confirm(`⚠️ "${duplicateNameMatch.name}" नाम का ग्राहक पहले से "${newCustPara}" में दर्ज है (वर्तमान बकाया: ₹${duplicateNameMatch.balanceDue})।\n\nक्या आप एक ही पारा में इसी नाम का नया खाता खोलना चाहते हैं?\n(सुझाव: पहचान के लिए नाम में उपनाम या पिता का नाम जोड़ें)`);
      if (!proceed) return;
    }

    const initialBal = Math.max(0, parseFloat(newCustBalance) || 0);
    const customerId = 'cust_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    await db.customers.add({
      id: customerId,
      name: cleanName,
      phone: cleanPhone,
      para: newCustPara,
      balanceDue: initialBal,
      creditLimit: isNaN(parseFloat(newCustCreditLimit)) ? 2000 : Math.max(0, parseFloat(newCustCreditLimit)),
      dueDate: newCustDueDate,
      dueReason: newCustDueReason,
      notes: newCustNotes.trim(),
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
    setNewCustCreditLimit('2000');
    setNewCustNotes('');
  };

  // WhatsApp Reminder message
  const sendWhatsAppReminder = (customer: Customer) => {
    const reasonText = customer.dueReason === 'KHARIF_DHAN' 
      ? 'धान खरीदी/फसल भुगतान' 
      : customer.dueReason === 'MONTHLY_DBT' 
      ? 'महतारी वंदन / सरकारी DBT' 
      : 'नियत तारीख';

    const store = syncService.getStoreInfo();
    const sName = store?.storeName || (store as any)?.name || 'ग्रामीण किराना स्टोर';
    const sVillage = store?.village ? ` (${store.village})` : '';
    const storeUpi = localStorage.getItem('gk_store_upi_id') || '';

    const passbookLink = `${window.location.origin}${window.location.pathname}#passbook=${customer.id}`;
    let text = `नमस्ते ${customer.name} जी,\n`;
    text += `दुकान के बही-खाते अनुसार आपका कुल बकाया *₹${customer.balanceDue}* है।\n`;
    if (customer.dueDate) {
      text += `📅 भुगतान का वादा: ${customer.dueDate} (${reasonText})\n`;
    }
    if (storeUpi) {
      text += `📲 ऑनलाइन UPI भुगतान ID: *${storeUpi}*\n`;
    }
    text += `\n📖 अपनी डिजिटल पासबुक और लेन-देन पर्ची यहाँ देखें:\n${passbookLink}\n\n`;
    text += `कृपया समय पर भुगतान कर दुकान संचालन में सहयोग दें।\n`;
    text += `🙏 धन्यवाद! - ${sName}${sVillage}`;

    openWhatsApp(customer.phone, text);
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

    const store = syncService.getStoreInfo();
    await printCustomerStatement({
      storeName: store?.storeName || (store as any)?.name || 'ग्रामीण किराना स्टोर',
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
            onClick={() => setIsSubModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs cursor-pointer transition active:scale-98"
            title="यह सुविधा ग्रामीण PRO (₹99/माह) में है — प्लान देखें व एक्टिव करें"
          >
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>🔒 सभी को WhatsApp तगादा (PRO देखें)</span>
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
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>उधारी सीमा:</span>
                    <span className={`font-bold ${customer.balanceDue > (customer.creditLimit ?? 2000) ? 'text-rose-700 font-black' : 'text-stone-800'}`}>
                      ₹{customer.creditLimit ?? 2000}
                      {customer.balanceDue > (customer.creditLimit ?? 2000) && (
                        <span className="ml-1 text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-1 py-0.2 rounded font-black">
                          सीमा पार!
                        </span>
                      )}
                    </span>
                  </div>
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
                  {/* Phone Call (Direct Dial) */}
                  {customer.phone && customer.phone.length === 10 && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-2 rounded-xl text-blue-700 hover:bg-blue-50 border border-blue-200 cursor-pointer active:scale-95 transition-all flex items-center justify-center"
                      title={`कॉल करें (${customer.phone})`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}

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

                  {/* Customer Digital Passbook & QR */}
                  <button
                    onClick={() => setPassbookCustomer(customer)}
                    className="p-2 rounded-xl text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 cursor-pointer active:scale-95 transition-all"
                    title="डिजिटल पासबुक व QR कोड खोलें"
                  >
                    <BookOpen className="w-4 h-4 text-amber-700" />
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

            {/* Current Balance & Credit Limit Alert */}
            <div className="my-3 bg-[#faf8f3] p-3 rounded-2xl border border-amber-200/60 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
              <div>
                <span className="text-xs text-stone-500 font-medium">कुल अंतिम बकाया:</span>
                <div className="text-xl font-black text-rose-700">₹{activeCustomerForLedger.balanceDue}</div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-stone-500 font-semibold block">उधारी सीमा (Limit):</span>
                <button
                  type="button"
                  onClick={handleUpdateCreditLimit}
                  className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 cursor-pointer active:scale-95 transition-all"
                  title="उधारी सीमा बदलें"
                >
                  <span>₹{activeCustomerForLedger.creditLimit ?? 2000}</span>
                  <span className="text-[10px] text-amber-700">✏️ बदलें</span>
                </button>
              </div>
              <button
                onClick={() => sendWhatsAppReminder(activeCustomerForLedger)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
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
              <button
                type="button"
                onClick={() => {
                  setPassbookCustomer(activeCustomerForLedger);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 active:scale-[0.99] text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20 transition-all"
              >
                <BookOpen className="w-4 h-4 text-amber-200" />
                <span>📖 ग्राहक डिजिटल पासबुक व UPI QR खोलें</span>
              </button>
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(activeCustomerForLedger)}
                  className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                  title="बकाया शून्य होने पर खाता हटाएं"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>खाता हटाएं</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCustomerForLedger(null)}
                  className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  बंद करें
                </button>
              </div>
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

              {duplicateNameMatch && (
                <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-xl flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span>चेतावनी: <b>"{duplicateNameMatch.name}"</b> नाम से इसी पारा में पहले से खाता है (बकाया: ₹{duplicateNameMatch.balanceDue})। पहचान हेतु उपनाम या पिता का नाम जोड़ें।</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    मोबाइल नंबर (10 अंक):
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98261XXXXX"
                    className={`w-full p-2 border rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600 ${
                      duplicatePhoneMatch ? 'border-rose-500 bg-rose-50 text-rose-900' : 'border-stone-300'
                    }`}
                  />
                  {duplicatePhoneMatch && (
                    <div className="mt-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 p-1.5 rounded-lg flex items-start gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>यह नंबर पहले से <b>"{duplicatePhoneMatch.name}"</b> ({duplicatePhoneMatch.para}) के खाते में है!</span>
                    </div>
                  )}
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
                    उधारी सीमा (क्रेडिट लिमिट ₹):
                  </label>
                  <input
                    type="number"
                    value={newCustCreditLimit}
                    onChange={e => setNewCustCreditLimit(e.target.value)}
                    placeholder="2000"
                    className="w-full p-2 border border-stone-300 rounded-xl text-xs text-stone-900 font-semibold outline-hidden focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                  disabled={!!duplicatePhoneMatch}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white shadow-sm transition-colors ${
                    duplicatePhoneMatch 
                      ? 'bg-stone-300 cursor-not-allowed text-stone-500' 
                      : 'bg-emerald-700 hover:bg-emerald-600 cursor-pointer'
                  }`}
                >
                  ग्राहक जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Zero-Balance Debt Settlement Celebration Modal */}
      {settledCustomer && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-emerald-400 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-100 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-amber-100 rounded-full blur-xl pointer-events-none" />

            <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
            </div>

            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider mb-2">
              🎉 पूर्ण हिसाब चुकता (Zero Debt)
            </span>

            <h3 className="text-lg font-black text-stone-900 m-0">
              बधाई! खाता शून्य हुआ
            </h3>

            <p className="text-xs text-stone-600 mt-2 mb-4 leading-relaxed">
              ग्राहक <b className="text-stone-900">{settledCustomer.customer.name}</b> ({settledCustomer.customer.para}) ने ₹{settledCustomer.settledAmount} का भुगतान कर अपना पूरा पिछला उधार चुकता कर दिया है।
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-900 space-y-1">
              <div className="flex justify-between">
                <span className="text-emerald-700">अंतिम जमा राशि:</span>
                <span className="font-black text-emerald-800">₹{settledCustomer.settledAmount}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-1">
                <span className="text-emerald-700">वर्तमान कुल बकाया:</span>
                <span className="font-black text-emerald-600 text-sm">₹0 (शून्य)</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  sendClearanceReceiptWhatsApp(settledCustomer.customer, settledCustomer.settledAmount);
                  setSettledCustomer(null);
                }}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>📲 व्हाट्सएप्प पर चुकता पावती भेजें</span>
              </button>

              <button
                type="button"
                onClick={() => setSettledCustomer(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                ठीक है / बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Digital Passbook Modal */}
      {passbookCustomer && (
        <CustomerPassbookModal
          customer={passbookCustomer}
          isOpen={!!passbookCustomer}
          onClose={() => setPassbookCustomer(null)}
        />
      )}

      {/* Village Pro Subscription Modal */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
      />
    </div>
  );
};
