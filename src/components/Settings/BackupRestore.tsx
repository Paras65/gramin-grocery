import React, { useState, useEffect } from 'react';
import { Download, Upload, ShieldCheck, RefreshCw, Sparkles, Printer, Smartphone, CheckCircle2, Bluetooth, LogOut, QrCode, Archive } from 'lucide-react';
import { exportDatabaseToJSON, importDatabaseFromJSON, initializeDatabaseIfEmpty, db, archiveOldSales, exportFiscalYearArchiveJSON, getStorageStats } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import { SubscriptionModal } from '../Subscription/SubscriptionModal';
import { pwaService } from '../../services/pwaService';
import {
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  subscribePrinterStatus,
  isBluetoothPrinterConnected,
  getConnectedPrinterName
} from '../../utils/thermalPrint';

export const BackupRestore: React.FC = () => {
  const { language, t } = useLanguage();
  const isCashier = syncService.getUserInfo()?.role === 'CASHIER';
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Store UPI Settings
  const [storeUpiId, setStoreUpiId] = useState(() => localStorage.getItem('gk_store_upi_id') || '');

  // Printer slip customization
  const [receiptHeader, setReceiptHeader] = useState(() => localStorage.getItem('gk_receipt_header') || '');
  const [receiptFooter, setReceiptFooter] = useState(() => localStorage.getItem('gk_receipt_footer') || '');
  const [printerConnected, setPrinterConnected] = useState(isBluetoothPrinterConnected());
  const [printerName, setPrinterName] = useState(getConnectedPrinterName());
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);

  // PWA install state
  const [canInstallPwa, setCanInstallPwa] = useState(pwaService.canInstall());
  const [isStandalone, setIsStandalone] = useState(false);

  // Storage and Cold Archiving stats
  const [storageStats, setStorageStats] = useState<{
    activeSalesCount: number;
    archivedSalesCount: number;
    customersCount: number;
    productsCount: number;
    transactionsCount: number;
    estimatedSizeKB: number;
  }>({
    activeSalesCount: 0,
    archivedSalesCount: 0,
    customersCount: 0,
    productsCount: 0,
    transactionsCount: 0,
    estimatedSizeKB: 0,
  });

  const loadStats = async () => {
    try {
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();

    const unsubPrinter = subscribePrinterStatus((connected, name) => {
      setPrinterConnected(connected);
      setPrinterName(name);
    });

    const unsubPwa = pwaService.subscribeInstall((can) => {
      setCanInstallPwa(can);
    });

    if (typeof window !== 'undefined') {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    }

    return () => {
      unsubPrinter();
      unsubPwa();
    };
  }, []);

  const handleSaveReceiptSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gk_receipt_header', receiptHeader.trim());
    localStorage.setItem('gk_receipt_footer', receiptFooter.trim());
    setStatusMessage('✅ प्रिंटर पर्ची सेटिंग्स सफलतापूर्वक सुरक्षित हो गईं!');
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleSaveUpiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('gk_store_upi_id', storeUpiId.trim());
    setStatusMessage('✅ दुकान की UPI ID सुरक्षित हो गई! अब POS में ग्राहक के लिए डायनेमिक QR कोड दिखेगा।');
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleConnectPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const ok = await connectBluetoothPrinter();
      if (ok) {
        setStatusMessage('✅ ब्लूटूथ प्रिंटर सफलतापूर्वक कनेक्ट हो गया!');
      } else {
        setStatusMessage('ℹ️ प्रिंटर कनेक्ट नहीं हुआ या ब्लूटूथ विंडो रद्द कर दी गई।');
      }
    } finally {
      setIsConnectingPrinter(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleDisconnectPrinter = () => {
    disconnectBluetoothPrinter();
    setStatusMessage('प्रिंटर डिस्कनेक्ट कर दिया गया।');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleInstallApp = async () => {
    const ok = await pwaService.triggerInstall();
    if (ok) {
      setStatusMessage('✅ ग्रामीण किराना ऐप सफलतापूर्वक इंस्टॉल हो रहा है!');
    }
  };

  const handleStoreLogout = async () => {
    const pending = await syncService.getPendingSyncCount();
    if (pending > 0) {
      const ok = window.confirm(
        `⚠️ चेतावनी: आपके ${pending} बिल/खाता रिकॉर्ड्स अभी क्लाउड पर सुरक्षित नहीं हुए हैं!\n\nयदि आप अभी लॉगआउट करेंगे तो ऑफ़लाइन डेटा नष्ट हो सकता है।\n\nक्या आप सच में लॉगआउट करना चाहते हैं?`
      );
      if (!ok) return;
    } else {
      const ok = window.confirm('क्या आप सच में अपनी दुकान से लॉगआउट करना चाहते हैं?');
      if (!ok) return;
    }
    await syncService.logout(true);
  };

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportDatabaseToJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];

      const a = document.createElement('a');
      a.href = url;
      a.download = `GraminKirana_Backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('✅ बैकअप फ़ाइल सफलतापूर्वक डाउनलोड हो गई! इसे अपने WhatsApp या Google Drive पर सुरक्षित रख सकते हैं।');
    } catch (err) {
      setStatusMessage('❌ बैकअप लेने में त्रुटि हुई।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirm = window.confirm(
      language === 'hi'
        ? 'क्या आप सुनिश्चित हैं? यह मौजूदा डेटा को बैकअप फ़ाइल के डेटा से बदल देगा।'
        : 'Are you sure? This will replace current data with data from the backup file.'
    );
    if (!confirm) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const success = await importDatabaseFromJSON(text);

      if (success) {
        setStatusMessage('✅ डेटा सफलतापूर्वक पुनर्स्थापित (Restore) हो गया!');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setStatusMessage('❌ बैकअप फ़ाइल अमान्य है।');
      }
    } catch (err) {
      setStatusMessage('❌ फ़ाइल पढ़ने में त्रुटि हुई।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToDemo = async () => {
    const confirm = window.confirm(
      language === 'hi'
        ? 'क्या आप डेटा को छत्तीसगढ़ के डिफ़ॉल्ट डेमो डेटा (36 सामान, गाँव के ग्राहक) पर रीसेट करना चाहते हैं?'
        : 'Reset data to default Chhattisgarh village demo items and customers?'
    );
    if (!confirm) return;

    await db.products.clear();
    await db.customers.clear();
    await db.transactions.clear();
    await db.sales.clear();
    await db.spoilageLogs.clear();
    await initializeDatabaseIfEmpty();
    await loadStats();

    setStatusMessage('✅ डिफ़ॉल्ट गाँव डाटा रीसेट हो गया!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleArchiveOldSales = async () => {
    const confirm = window.confirm(
      language === 'hi'
        ? 'क्या आप 180 दिन (6 माह) से पुराने बिलों को कोल्ड आर्काइव में स्थानांतरित करना चाहते हैं? इससे मुख्य बिलिंग सूची और ऐप तेज़ रहेंगे।'
        : 'Do you want to archive sales older than 180 days (6 months) into cold storage? This will keep active billing superfast.'
    );
    if (!confirm) return;

    try {
      setIsProcessing(true);
      const res = await archiveOldSales(180);
      await loadStats();
      if (res.archivedCount > 0) {
        setStatusMessage(`✅ ${res.archivedCount} पुराने बिल सफलतापूर्वक कोल्ड आर्काइव में सुरक्षित कर दिए गए!`);
      } else {
        setStatusMessage('ℹ️ 180 दिन से पुराना कोई बिल नहीं मिला। सभी बिल हाल के हैं।');
      }
    } catch (err: any) {
      setStatusMessage('❌ आर्काइव करने में त्रुटि: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleExportArchive = async () => {
    try {
      setIsProcessing(true);
      const jsonStr = await exportFiscalYearArchiveJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().split('T')[0];

      const a = document.createElement('a');
      a.href = url;
      a.download = `GraminKirana_ColdArchive_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('✅ आर्काइव डेटा फ़ाइल सफलतापूर्वक डाउनलोड हो गई!');
    } catch (err) {
      setStatusMessage('❌ आर्काइव डाउनलोड करने में त्रुटि हुई।');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setStatusMessage(''), 3500);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Privacy & Offline Guarantee Card with Village Forest Theme */}
      <div className="bg-stone-900 text-white p-5 sm:p-6 rounded-3xl shadow-sm border border-amber-500/40 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-stone-950">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-black m-0 text-stone-100">
            {t.backup.clearNotice}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium">
          आपके ग्राहकों का उधारी हिसाब, मंडी लिस्ट और बिलिंग का सारा डेटा केवल आपके इस फोन/कंप्यूटर में सुरक्षित रहता है। इंटरनेट बंद होने पर भी कोई डेटा नहीं खोता।
        </p>
      </div>

      {/* Store Plan & Features Card */}
      <div className="village-card rounded-3xl p-5 bg-white border border-amber-300/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
            <Sparkles className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-stone-900 text-sm sm:text-base m-0">
                दुकान सदस्यता व प्लान
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                syncService.getSubscriptionStatus().isPro
                  ? 'bg-amber-100 text-amber-800 border-amber-400'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-400'
              }`}>
                {syncService.getSubscriptionStatus().isPro ? '👑 ग्रामिन प्रो' : '🌾 गाँव स्टार्टर (मुफ़्त)'}
              </span>
            </div>
            <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
              {syncService.getSubscriptionStatus().isPro
                ? 'क्लाउड सिंक व स्टाफ लॉगिन सक्रिय है।'
                : '100% ऑफ़लाइन चालू। बिना किसी शुल्क के आजीवन मुफ़्त।'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsSubModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>सुविधाएं व प्लान देखें</span>
        </button>
      </div>

      {!syncService.isLoggedIn() ? (
        <div className="village-card rounded-3xl p-6 bg-white border border-amber-300 text-center space-y-2">
          <div className="text-3xl">🔒</div>
          <h3 className="font-black text-stone-900 text-base m-0">डेमो मोड में डेटा बैकअप लॉक है</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed m-0">
            यह केवल परीक्षण (Demo Sandbox) है। अपनी असली दुकान का डेटा बैकअप डाउनलोड या रीस्टोर करने के लिए कृपया अपनी दुकान मुफ़्त में रजिस्टर करें।
          </p>
        </div>
      ) : isCashier ? (
        <div className="village-card rounded-3xl p-6 bg-white border border-amber-300 text-center space-y-2">
          <div className="text-3xl">🔒</div>
          <h3 className="font-black text-stone-900 text-base m-0">केवल दुकान मालिक (Owner) के लिए आरक्षित</h3>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed m-0">
            मुनीम (Cashier) खाते से डेटा बैकअप डाउनलोड या रीसेट करने की अनुमति नहीं है। दुकान का संपूर्ण हिसाब-किताब सुरक्षित रखने के लिए यह सुविधा केवल दुकान मालिक के पिन से संचालित होती है।
          </p>
        </div>
      ) : (
        /* Backup & Restore Controls */
        <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs space-y-4 border border-amber-300/70">
          <div>
            <h3 className="font-black text-stone-950 text-base sm:text-lg m-0">
              {t.backup.title}
            </h3>
            <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
              {t.backup.subtitle}
            </p>
          </div>

        {statusMessage && (
          <div className="p-3 bg-[#faf8f3] rounded-2xl text-xs font-bold text-stone-900 border border-amber-300">
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Download Backup */}
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="p-5 rounded-2xl bg-[#faf8f3] hover:bg-amber-50/70 border border-amber-200/80 flex flex-col items-center text-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-2xs"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Download className="w-6 h-6" />
            </div>
            <span className="font-black text-xs sm:text-sm text-stone-950">
              {t.backup.exportBtn}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              सारा हिसाब-किताब एक सुरक्षित फ़ाइल में सेव करें
            </span>
          </button>

          {/* Restore Backup */}
          <label className="p-5 rounded-2xl bg-[#faf8f3] hover:bg-amber-50/70 border border-amber-200/80 flex flex-col items-center text-center gap-2 cursor-pointer transition-all active:scale-[0.99] shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <span className="font-black text-xs sm:text-sm text-stone-950">
              {t.backup.importBtn}
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              पुरानी बैकअप फ़ाइल को चुनें और डेटा वापस पाएं
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>

        {/* Reset to Default Demo Data */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-bold text-stone-800 block">
              डिफ़ॉल्ट गाँव डेटा रीलोड करें
            </span>
            <span className="text-[11px] text-stone-500 font-medium">
              छत्तीसगढ़ के 36+ किराना सामान व ग्राहक रीलोड करें
            </span>
          </div>
          <button
            onClick={handleResetToDemo}
            className="px-3.5 py-2 rounded-xl border border-stone-300 hover:border-amber-500 text-stone-700 hover:text-stone-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-white transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>डेटा रीसेट</span>
          </button>
        </div>
      </div>
    )}

    {/* Fiscal Year Archiving & Local Storage Management Card */}
    {syncService.isLoggedIn() && !isCashier && (
      <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs space-y-4 border border-amber-300/70">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 shrink-0">
            <Archive className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h3 className="font-black text-stone-950 text-base sm:text-lg m-0">
              {t.backup.archiveTitle}
            </h3>
            <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
              {t.backup.archiveSubtitle}
            </p>
          </div>
        </div>

        {/* Storage stats badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          <div className="bg-[#faf8f3] border border-amber-200/80 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-stone-500 block">{t.backup.activeSales}</span>
            <span className="text-base font-black text-stone-900">{storageStats.activeSalesCount}</span>
          </div>
          <div className="bg-[#faf8f3] border border-amber-200/80 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-stone-500 block">{t.backup.archivedSales}</span>
            <span className="text-base font-black text-stone-900">{storageStats.archivedSalesCount}</span>
          </div>
          <div className="bg-[#faf8f3] border border-amber-200/80 p-3 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-stone-500 block">{t.backup.estimatedStorage}</span>
            <span className="text-base font-black text-amber-900">~{storageStats.estimatedSizeKB} KB</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleArchiveOldSales}
            disabled={isProcessing || storageStats.activeSalesCount === 0}
            className="flex-1 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition active:scale-95"
          >
            <Archive className="w-4 h-4" />
            <span>{t.backup.archiveBtn}</span>
          </button>
          <button
            type="button"
            onClick={handleExportArchive}
            disabled={isProcessing || storageStats.archivedSalesCount === 0}
            className="px-4 py-2.5 rounded-2xl border border-stone-300 hover:border-amber-500 disabled:opacity-50 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer bg-white transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>{t.backup.exportArchiveBtn}</span>
          </button>
        </div>
      </div>
    )}

    {/* Thermal Printer Settings Card */}
    <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs space-y-4 border border-amber-300/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-stone-950 text-base sm:text-lg m-0">
              प्रिंटर व पर्ची सेटिंग्स (Thermal Printer)
            </h3>
            <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
              58mm/80mm ब्लूटूथ प्रिंटर कनेक्शन व बिल पर्ची का संदेश बदलें
            </p>
          </div>
        </div>

        {/* Bluetooth Connect status badge & button */}
        <div className="flex items-center gap-2">
          {printerConnected ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{printerName || 'ब्लूटूथ प्रिंटर चालू'}</span>
              </span>
              <button
                type="button"
                onClick={handleDisconnectPrinter}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
              >
                डिस्कनेक्ट
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnectPrinter}
              disabled={isConnectingPrinter}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition active:scale-95"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>{isConnectingPrinter ? 'खोज रहे हैं...' : 'प्रिंटर जोड़ें'}</span>
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSaveReceiptSettings} className="space-y-3 pt-2">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            दुकान का स्लोगन / जीएसटी / पता (पर्ची के ऊपर छपेगा):
          </label>
          <input
            type="text"
            value={receiptHeader}
            onChange={(e) => setReceiptHeader(e.target.value)}
            placeholder="उदा. प्रो. रामप्रसाद साहू | मो. 98260XXXXX | शुद्ध व ताज़ा सामान"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-medium text-stone-900 bg-[#faf8f3]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            आभार संदेश / उधारी नियम (पर्ची के नीचे छपेगा):
          </label>
          <input
            type="text"
            value={receiptFooter}
            onChange={(e) => setReceiptFooter(e.target.value)}
            placeholder="उदा. धन्यवाद! फिर पधारें 🙏 बिका माल वापस नहीं होगा"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs font-medium text-stone-900 bg-[#faf8f3]"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-bold cursor-pointer transition shadow-xs active:scale-95"
          >
            पर्ची संदेश सेव करें
          </button>
        </div>
      </form>
    </div>

    {/* Store UPI Payment Settings Card */}
    <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs border border-emerald-300/80 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-stone-950 text-base m-0 flex items-center gap-2">
            <span>दुकान UPI भुगतान सेटिंग्स (POS डायनेमिक QR कोड)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
              PhonePe / GPay / Paytm
            </span>
          </h3>
          <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
            अपना UPI ID दर्ज करें ताकि बिलिंग के समय ग्राहक के लिए सही राशि का QR कोड स्क्रीन पर स्वतः बन जाए
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveUpiSettings} className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            दुकानदार की UPI VPA / ID:
          </label>
          <input
            type="text"
            value={storeUpiId}
            onChange={(e) => setStoreUpiId(e.target.value)}
            placeholder="उदा. 98260XXXXX@ybl या shopname@okaxis"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-xs font-mono font-bold text-stone-900 bg-[#faf8f3]"
          />
          <span className="text-[10px] text-stone-500 font-medium mt-1 block">
            ग्राहक जब POS में 'ऑनलाइन (UPI)' चुनेगा, तो ठीक बिल राशि का QR कोड स्क्रीन पर दिखेगा।
          </span>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition shadow-xs active:scale-95"
          >
            UPI ID सुरक्षित करें
          </button>
        </div>
      </form>
    </div>

    {/* PWA App Installation Card */}
    <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs border border-amber-300/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-black text-stone-950 text-base m-0 flex items-center gap-2">
            <span>फोन / कंप्यूटर पर ऐप इंस्टॉल करें (PWA)</span>
            {isStandalone && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                इंस्टॉल है ✅
              </span>
            )}
          </h3>
          <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
            होमस्क्रीन पर आइकॉन बनाकर बिना ब्राउज़र खोले बिजली की तेज़ी से 100% ऑफ़लाइन चलाएं
          </p>
        </div>
      </div>

      {isStandalone ? (
        <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 shrink-0 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>ऐप सक्रिय है</span>
        </div>
      ) : canInstallPwa ? (
        <button
          onClick={handleInstallApp}
          className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition active:scale-95 shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>ऐप इंस्टॉल करें</span>
        </button>
      ) : (
        <span className="text-xs text-stone-500 font-medium shrink-0">
          (ब्राउज़र मेनू से 'Add to Home screen' चुनें)
        </span>
      )}
    </div>

      {/* Store Account & Safe Logout Card */}
      {syncService.isLoggedIn() && (
        <div className="village-card rounded-3xl p-5 sm:p-6 bg-white shadow-2xs border border-rose-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-800 shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-stone-950 text-base m-0 flex items-center gap-2">
                <span>दुकान खाते से लॉगआउट करें</span>
              </h3>
              <p className="text-xs text-stone-600 m-0 mt-0.5 font-medium">
                वर्तमान दुकान ({syncService.getStoreInfo()?.storeName || 'गाँव किराना'}) से सुरक्षित बाहर निकलें
              </p>
            </div>
          </div>

          <button
            onClick={handleStoreLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition active:scale-95 shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>लॉगआउट करें (Logout)</span>
          </button>
        </div>
      )}

      {/* Subscription Modal */}
    <SubscriptionModal
      isOpen={isSubModalOpen}
      onClose={() => setIsSubModalOpen(false)}
    />
  </div>
  );
};
