import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ShoppingCart, Share2, Plus, Trash2, CheckSquare, X, PackageCheck, Check, UserCheck } from 'lucide-react';
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

interface ReceiveItemRow {
  productId?: string;
  name: string;
  hindiName: string;
  qty: number;
  unit: string;
  rate: number;
  checked: boolean;
}

export const MandiPlanner: React.FC = () => {
  const { language, t } = useLanguage();
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});

  // Wholesaler directory persistence
  const [wholesalerName, setWholesalerName] = useState(() => localStorage.getItem('gk_mandi_wholesaler_name') || '');
  const [wholesalerPhone, setWholesalerPhone] = useState(() => localStorage.getItem('gk_mandi_wholesaler_phone') || '');

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customItems, setCustomItems] = useState<MandiItemRow[]>([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomQty, setNewCustomQty] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('kg');
  const [newCustomRate, setNewCustomRate] = useState('');

  // Stock receiving modal state
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveList, setReceiveList] = useState<ReceiveItemRow[]>([]);
  const [receiveSuccessMsg, setReceiveSuccessMsg] = useState('');

  // Persist wholesaler details
  useEffect(() => {
    localStorage.setItem('gk_mandi_wholesaler_name', wholesalerName);
    localStorage.setItem('gk_mandi_wholesaler_phone', wholesalerPhone);
  }, [wholesalerName, wholesalerPhone]);

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

  const handleOpenReceiveModal = () => {
    const list: ReceiveItemRow[] = mandiRows
      .filter(item => !!item.productId)
      .map(item => ({
        productId: item.productId,
        name: item.name,
        hindiName: item.hindiName,
        qty: item.suggestedQty,
        unit: item.unit,
        rate: item.wholesaleRate,
        checked: true
      }));
    setReceiveList(list);
    setShowReceiveModal(true);
  };

  const handleToggleReceiveItem = (idx: number) => {
    setReceiveList(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const handleUpdateReceiveQty = (idx: number, qty: number) => {
    setReceiveList(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(0, qty) } : item));
  };

  const handleUpdateReceiveRate = (idx: number, rate: number) => {
    setReceiveList(prev => prev.map((item, i) => i === idx ? { ...item, rate: Math.max(0, rate) } : item));
  };

  const handleConfirmReceiveStock = async () => {
    const selected = receiveList.filter(item => item.checked && item.productId && item.qty > 0);
    if (selected.length === 0) {
      alert('कृपया कम से कम एक सामान चुनें जिसकी मात्रा 0 से अधिक हो।');
      return;
    }

    try {
      await db.transaction('rw', db.products, async () => {
        for (const item of selected) {
          if (!item.productId) continue;
          const existing = await db.products.get(item.productId);
          if (existing) {
            const newStock = (existing.stockQty || 0) + item.qty;
            await db.products.update(item.productId, {
              stockQty: newStock,
              purchasePrice: item.rate > 0 ? item.rate : existing.purchasePrice
            });
          }
        }
      });

      setQtyOverrides({});
      setShowReceiveModal(false);
      setReceiveSuccessMsg(`✅ ${selected.length} सामानों का स्टॉक सफलतापूर्वक बढ़ा दिया गया!`);
      setTimeout(() => setReceiveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update stock from mandi:', err);
      alert('स्टॉक अपडेट करने में त्रुटि हुई।');
    }
  };

  const shareToWholesalerWhatsApp = () => {
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const greetingName = wholesalerName.trim() ? `${wholesalerName.trim()} भैयाजी` : 'भैयाजी';
    let text = `🛒 *मंडी खरीदारी आर्डर - ग्रामीण किराना*\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    text += `नमस्ते ${greetingName}, तहसील मंडी आते समय हमें यह माल चाहिए, कृपया पैक रखें:\n`;
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

      {/* Wholesaler Directory & Actions Bar */}
      <div className="village-card p-3.5 rounded-2xl bg-white space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-xs font-bold text-stone-700 whitespace-nowrap flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-700" />
              <span>थोक व्यापारी:</span>
            </span>
            <input
              type="text"
              value={wholesalerName}
              onChange={e => setWholesalerName(e.target.value)}
              placeholder="नाम (उदा. साहू ट्रेडर्स)"
              className="p-2 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500 w-full sm:w-40"
            />
            <input
              type="text"
              value={wholesalerPhone}
              onChange={e => setWholesalerPhone(e.target.value)}
              placeholder="फोन (उदा. 98271XXXXX)"
              className="p-2 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500 w-full sm:w-36"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddCustom(true)}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.mandi.addItemManually}</span>
            </button>

            <button
              onClick={shareToWholesalerWhatsApp}
              disabled={mandiRows.length === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              <span>{t.mandi.shareWholesaler}</span>
            </button>

            <button
              onClick={handleOpenReceiveModal}
              disabled={mandiRows.filter(r => !!r.productId).length === 0}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
              title="मंडी से सामान आने पर एक क्लिक में दुकान स्टॉक बढ़ाएं"
            >
              <PackageCheck className="w-4 h-4" />
              <span>मंडी से माल आया</span>
            </button>
          </div>
        </div>

        {receiveSuccessMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{receiveSuccessMsg}</span>
          </div>
        )}
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

      {/* Receive Stock from Mandi Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 border border-amber-300/80 shadow-2xl space-y-3 my-auto max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 m-0">
                    मंडी से माल आया — स्टॉक अपडेट
                  </h3>
                  <p className="text-xs text-stone-500 m-0 font-medium">
                    आए हुए सामानों की मात्रा जांचें और एक क्लिक में स्टॉक में जोड़ें
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-stone-100 space-y-2 pr-1">
              {receiveList.map((item, idx) => (
                <div key={item.productId || idx} className={`p-2.5 rounded-2xl border transition-all ${item.checked ? 'bg-[#faf8f3] border-amber-200' : 'bg-stone-50 border-stone-200 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleReceiveItem(idx)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-stone-900 truncate">
                        {language === 'hi' ? item.hindiName : item.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-300">
                        <span className="text-[10px] text-stone-500 font-bold">+</span>
                        <input
                          type="number"
                          min="0"
                          value={item.qty}
                          onChange={e => handleUpdateReceiveQty(idx, parseFloat(e.target.value) || 0)}
                          className="w-14 text-center font-black text-xs text-stone-900 outline-hidden"
                        />
                        <span className="text-[10px] text-stone-500 font-bold">{item.unit}</span>
                      </div>

                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-stone-300">
                        <span className="text-[10px] text-stone-500 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={e => handleUpdateReceiveRate(idx, parseFloat(e.target.value) || 0)}
                          className="w-12 text-center font-bold text-xs text-stone-900 outline-hidden"
                          title="थोक खरीद भाव"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-stone-600">
                चयनित: {receiveList.filter(i => i.checked).length} सामान
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReceiveStock}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-xs transition active:scale-95"
                >
                  पुष्टि करें व स्टॉक में जोड़ें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
