import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ShoppingCart, Share2, Plus, Trash2, CheckSquare, X } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface MandiItemRow {
  productId?: string;
  name: string;
  hindiName: string;
  currentStock: number;
  suggestedQty: number;
  unit: string;
  wholesaleRate: number;
  category: string;
}

export const MandiPlanner: React.FC = () => {
  const { language, t } = useLanguage();
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});
  const [wholesalerPhone, setWholesalerPhone] = useState('');
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customItems, setCustomItems] = useState<MandiItemRow[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('kg');
  const [newCustomRate, setNewCustomRate] = useState('');

  // Auto-identify items below or near threshold
  const lowStockProducts = products.filter((p: Product) => p.stockQty <= (p.minStockThreshold * 1.5));

  const mandiRows: MandiItemRow[] = [
    ...lowStockProducts.map((p: Product) => {
      const defaultQty = Math.max(5, (p.minStockThreshold * 3) - p.stockQty);
      const activeQty = p.id && qtyOverrides[p.id] !== undefined ? qtyOverrides[p.id] : defaultQty;
      return {
        productId: p.id,
        name: p.name,
        hindiName: p.hindiName,
        currentStock: p.stockQty,
        suggestedQty: activeQty,
        unit: p.unit,
        wholesaleRate: p.purchasePrice,
        category: p.category
      };
    }),
    ...customItems
  ];

  const handleQtyChange = (productId: string, val: number) => {
    setQtyOverrides(prev => ({
      ...prev,
      [productId]: Math.max(0, val)
    }));
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;

    const qty = parseFloat(newCustomQty) || 1;
    const rate = parseFloat(newCustomRate) || 0;

    setCustomItems(prev => [
      ...prev,
      {
        name: newCustomName.trim(),
        hindiName: newCustomName.trim(),
        currentStock: 0,
        suggestedQty: qty,
        unit: newCustomUnit,
        wholesaleRate: rate,
        category: 'custom'
      }
    ]);

    setNewCustomName('');
    setNewCustomQty('');
    setNewCustomRate('');
    setShowAddCustom(false);
  };

  const totalEstimatedMandiBudget = Math.round(
    mandiRows.reduce((sum, item) => sum + (item.suggestedQty * item.wholesaleRate), 0)
  );

  const shareToWholesalerWhatsApp = () => {
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let text = `🛒 *मंडी खरीदारी आर्डर - ग्रामीण किराना*\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    text += `नमस्ते भैयाजी, तहसील मंडी आते समय हमें यह माल चाहिए, कृपया पैक रखें:\n`;
    text += `------------------------------------\n`;

    mandiRows.forEach((item, idx) => {
      const name = language === 'hi' ? item.hindiName : item.name;
      const estLineCost = Math.round(item.suggestedQty * item.wholesaleRate);
      text += `${idx + 1}. *${name}* - *${item.suggestedQty} ${item.unit}* (अनुमानित दर: ₹${item.wholesaleRate} = ₹${estLineCost})\n`;
    });

    text += `------------------------------------\n`;
    text += `💰 *अनुमानित कुल लागत: ₹${totalEstimatedMandiBudget.toLocaleString('en-IN')}*\n`;
    text += `दुकान: ग्रामीण किराना स्टोर\n`;
    text += `कृपया बिल तैयार रखें, हम गाड़ी लेकर पहुँच रहे हैं।`;

    const encoded = encodeURIComponent(text);
    const phone = wholesalerPhone.replace(/[^0-9]/g, '');
    const url = phone.length >= 10 
      ? `https://wa.me/91${phone}?text=${encoded}` 
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Village Harvest Theme */}
      <div className="village-card p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-white via-[#fcfbf7] to-amber-50/60 border border-amber-300/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-stone-950 m-0">
              {t.mandi.title}
            </h2>
          </div>
          <p className="text-xs text-stone-600 m-0 mt-1 font-medium">
            {t.mandi.subtitle}
          </p>
        </div>

        <div className="bg-amber-100/80 border border-amber-400/80 px-4 py-2.5 rounded-2xl text-left sm:text-right w-full sm:w-auto shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 block">
            {t.mandi.estimatedBudget}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-900">
            ₹{totalEstimatedMandiBudget.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Wholesaler Phone & Actions Bar */}
      <div className="village-card p-3 rounded-2xl bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-bold text-stone-700 whitespace-nowrap">
            थोक व्यापारी (Wholesaler) फोन:
          </span>
          <input
            type="text"
            value={wholesalerPhone}
            onChange={e => setWholesalerPhone(e.target.value)}
            placeholder="उदा. 98271XXXXX"
            className="p-2 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500 w-full max-w-[200px]"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCustom(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.mandi.addItemManually}</span>
          </button>

          <button
            onClick={shareToWholesalerWhatsApp}
            disabled={mandiRows.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>{t.mandi.shareWholesaler}</span>
          </button>
        </div>
      </div>

      {/* Mandi Items Container */}
      <div className="village-card rounded-3xl overflow-hidden bg-white shadow-2xs">
        <div className="p-3.5 bg-[#faf8f3] border-b border-amber-200/60 flex items-center justify-between text-xs text-stone-700 font-bold">
          <span className="flex items-center gap-1.5">
            <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-lg text-xs font-black">
              {mandiRows.length}
            </span>
            <span>{t.mandi.itemsToBuy}</span>
          </span>
          <span className="text-[11px] text-stone-500 hidden sm:inline font-medium">
            {t.mandi.autoGeneratedNotice}
          </span>
        </div>

        {mandiRows.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
            <p className="text-sm font-bold text-stone-600">सभी सामानों का स्टॉक पर्याप्त है।</p>
            <p className="text-xs text-stone-400 mt-0.5">मंडी खरीदारी की आवश्यकता नहीं है।</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on md and desktop, visible on mobile) */}
            <div className="block md:hidden divide-y divide-stone-100 p-2 space-y-2">
              {mandiRows.map((row, idx) => {
                const lineTotal = Math.round(row.suggestedQty * row.wholesaleRate);
                return (
                  <div key={row.productId || `custom-mob-${idx}`} className="p-3 bg-[#faf8f3] rounded-2xl border border-amber-200/50 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-950 text-sm">
                          {language === 'hi' ? row.hindiName : row.name}
                        </div>
                        <div className="text-[11px] text-stone-500 font-medium">
                          दुकान में स्टॉक: <span className="font-bold text-stone-700">{row.currentStock} {row.unit}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-stone-500 font-medium">अनुमानित लागत</div>
                        <div className="font-black text-amber-900 text-base">₹{lineTotal.toLocaleString('en-IN')}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-600">खरीदें:</span>
                        <div className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-300">
                          <input
                            type="number"
                            min="1"
                            value={row.suggestedQty}
                            onChange={e => {
                              if (row.productId) {
                                handleQtyChange(row.productId, parseFloat(e.target.value) || 0);
                              }
                            }}
                            className="w-14 text-center font-black text-xs text-stone-900 outline-hidden"
                          />
                          <span className="text-[11px] text-stone-500 font-bold">{row.unit}</span>
                        </div>
                      </div>

                      <div className="text-xs text-stone-600">
                        दर: <span className="font-bold">₹{row.wholesaleRate}</span>
                      </div>

                      {row.category === 'custom' && (
                        <button
                          onClick={() => setCustomItems(prev => prev.filter((_, i) => i !== idx - lowStockProducts.length))}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tablet & Desktop Full Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#faf8f3] text-stone-700 border-b border-stone-200 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3.5">सामान (Item)</th>
                    <th className="p-3.5 text-center">दुकान में स्टॉक</th>
                    <th className="p-3.5 text-center">खरीदने की मात्रा</th>
                    <th className="p-3.5 text-right">थोक दर (₹)</th>
                    <th className="p-3.5 text-right">कुल लागत (₹)</th>
                    <th className="p-3.5 text-center">क्रिया</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-800">
                  {mandiRows.map((row, idx) => {
                    const lineTotal = Math.round(row.suggestedQty * row.wholesaleRate);
                    return (
                      <tr key={row.productId || `custom-${idx}`} className="hover:bg-amber-50/40 transition-colors">
                        <td className="p-3.5 font-bold text-stone-950">
                          <div>{language === 'hi' ? row.hindiName : row.name}</div>
                          <div className="text-[11px] text-stone-400 font-normal">{row.name}</div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                            row.currentStock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {row.currentStock} {row.unit}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 justify-center bg-[#faf8f3] p-1 rounded-xl border border-stone-300">
                            <input
                              type="number"
                              min="1"
                              value={row.suggestedQty}
                              onChange={e => {
                                if (row.productId) {
                                  handleQtyChange(row.productId, parseFloat(e.target.value) || 0);
                                }
                              }}
                              className="w-16 p-1 rounded-lg text-center font-black text-xs bg-white text-stone-950 outline-hidden"
                            />
                            <span className="text-stone-600 font-bold pr-1">{row.unit}</span>
                          </div>
                        </td>

                        <td className="p-3.5 text-right font-semibold text-stone-700">
                          ₹{row.wholesaleRate}
                        </td>

                        <td className="p-3.5 text-right font-black text-amber-900 text-sm">
                          ₹{lineTotal.toLocaleString('en-IN')}
                        </td>

                        <td className="p-3.5 text-center">
                          {row.category === 'custom' ? (
                            <button
                              onClick={() => setCustomItems(prev => prev.filter((_, i) => i !== idx - lowStockProducts.length))}
                              className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          ) : (
                            <span className="text-[10px] bg-stone-100 text-stone-500 font-bold px-1.5 py-0.5 rounded">ऑटो</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Custom Item Modal */}
      {showAddCustom && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                मंडी लिस्ट में अतिरिक्त सामान जोड़ें
              </h3>
              <button
                onClick={() => setShowAddCustom(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  सामान का नाम: *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomName}
                  onChange={e => setNewCustomName(e.target.value)}
                  placeholder="उदा. पोहा या अगरबत्ती पेटी"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    मात्रा: *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newCustomQty}
                    onChange={e => setNewCustomQty(e.target.value)}
                    placeholder="10"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    इकाई (Unit):
                  </label>
                  <select
                    value={newCustomUnit}
                    onChange={e => setNewCustomUnit(e.target.value)}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  >
                    <option value="kg">kg (किलो)</option>
                    <option value="packet">packet (पैकेट)</option>
                    <option value="liter">liter (लीटर)</option>
                    <option value="piece">piece (नग/पीस)</option>
                    <option value="pouch">pouch (पाउच)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  अनुमानित थोक दर (₹ प्रति इकाई):
                </label>
                <input
                  type="number"
                  value={newCustomRate}
                  onChange={e => setNewCustomRate(e.target.value)}
                  placeholder="उदा. 45"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-xs"
                >
                  जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
