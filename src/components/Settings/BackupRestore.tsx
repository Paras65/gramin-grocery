import React, { useState } from 'react';
import { Download, Upload, ShieldCheck, RefreshCw, Sparkles } from 'lucide-react';
import { exportDatabaseToJSON, importDatabaseFromJSON, initializeDatabaseIfEmpty, db } from '../../db';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import { SubscriptionModal } from '../Subscription/SubscriptionModal';

export const BackupRestore: React.FC = () => {
  const { language, t } = useLanguage();
  const isCashier = syncService.getUserInfo()?.role === 'CASHIER';
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

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

    setStatusMessage('✅ डिफ़ॉल्ट गाँव डाटा रीसेट हो गया!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
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

    {/* Subscription Modal */}
    <SubscriptionModal
      isOpen={isSubModalOpen}
      onClose={() => setIsSubModalOpen(false)}
    />
  </div>
  );
};
