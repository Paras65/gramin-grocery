import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertOctagon, ZapOff, SunMedium, Bug, Clock, Plus, Trash2, X } from 'lucide-react';
import { db } from '../../db';
import type { Product, SpoilageLog, SpoilageReason } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

export const SpoilageExpiryGuard: React.FC = () => {
  const { language, t } = useLanguage();
  const spoilageLogs = useLiveQuery(() => db.spoilageLogs.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logProdName, setLogProdName] = useState('');
  const [logQty, setLogQty] = useState('');
  const [logUnit, setLogUnit] = useState('pouch');
  const [logReason, setLogReason] = useState<SpoilageReason>('POWER_CUT');
  const [logLoss, setLogLoss] = useState('');
  const [logNote, setLogNote] = useState('');

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

  const handleSaveSpoilage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logProdName.trim() || !logLoss) return;

    await db.spoilageLogs.add({
      id: 'spoil_' + Math.random().toString(36).substring(2, 9),
      productName: logProdName.trim(),
      quantity: parseFloat(logQty) || 1,
      unit: logUnit,
      reason: logReason,
      estimatedLoss: parseFloat(logLoss) || 0,
      timestamp: new Date().toISOString(),
      note: logNote.trim()
    });

    setIsLogModalOpen(false);
    setLogProdName('');
    setLogQty('');
    setLogLoss('');
    setLogNote('');
  };

  const handleDeleteLog = async (id?: string) => {
    if (id) {
      await db.spoilageLogs.delete(id);
    }
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

      {/* Expiring Soon Radar */}
      <div className="village-card rounded-3xl p-4 sm:p-5 bg-white shadow-2xs border border-amber-300/70">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-stone-950 m-0">
            {t.spoilage.expiringSoon}
          </h3>
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
                  className={`p-3 rounded-2xl border flex flex-col justify-between ${
                    isUrgent ? 'bg-rose-50/80 border-rose-300' : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-stone-950">
                      {language === 'hi' ? p.hindiName : p.name}
                    </div>
                    <div className="text-[11px] text-stone-600 font-medium">
                      स्टॉक: <span className="font-bold">{p.stockQty} {p.unit}</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-stone-200/80 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 font-medium">एक्सपायरी:</span>
                    <span className={`font-black ${isUrgent ? 'text-rose-700' : 'text-amber-900'}`}>
                      {p.expiryDate} ({diffDays <= 0 ? 'आज समाप्त' : `${diffDays} दिन शेष`})
                    </span>
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
            {spoilageLogs.length} प्रविष्टियां दर्ज
          </span>
        </div>

        {spoilageLogs.length === 0 ? (
          <div className="p-6 text-center text-stone-400 text-xs font-medium">
            कोई खराबी दर्ज नहीं की गई है।
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on md+, visible on mobile) */}
            <div className="block md:hidden divide-y divide-stone-100 p-2 space-y-2">
              {spoilageLogs.map((log: SpoilageLog) => (
                <div key={log.id} className="p-3 bg-[#faf8f3] rounded-2xl border border-rose-200/60 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-stone-950 text-sm">{log.productName}</div>
                      <div className="text-[11px] text-stone-500 font-medium">
                        {new Date(log.timestamp).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })} • {log.quantity} {log.unit}
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
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-600"
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
                  {spoilageLogs.map((log: SpoilageLog) => (
                    <tr key={log.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="p-3.5 text-stone-500 font-medium whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="p-3.5 font-bold text-stone-950">
                        {log.productName}
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
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-stone-400 hover:text-rose-600 cursor-pointer p-1"
                          title="हटाएं"
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
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
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
                  value={logProdName}
                  onChange={e => setLogProdName(e.target.value)}
                  placeholder="उदा. अमुल दूध या रहर दाल"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    खराब मात्रा: *
                  </label>
                  <input
                    type="number"
                    required
                    value={logQty}
                    onChange={e => setLogQty(e.target.value)}
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
