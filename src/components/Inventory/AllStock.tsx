import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Edit2, Package, X } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';

export const AllStock: React.FC = () => {
  const { language, t } = useLanguage();
  const isCashier = syncService.getUserInfo()?.role === 'CASHIER';
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdHindi, setNewProdHindi] = useState('');
  const [newProdCat, setNewProdCat] = useState<Product['category']>('staples');
  const [newProdBuy, setNewProdBuy] = useState('');
  const [newProdSell, setNewProdSell] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdUnit, setNewProdUnit] = useState<Product['unit']>('kg');
  const [newProdMin, setNewProdMin] = useState('10');
  const [newProdIsLoose, setNewProdIsLoose] = useState(false);
  const [newProdExp, setNewProdExp] = useState('');

  const filtered = products.filter((p: Product) => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.hindiName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;

    await db.products.update(editingProduct.id, {
      name: editingProduct.name,
      hindiName: editingProduct.hindiName,
      purchasePrice: editingProduct.purchasePrice,
      sellingPrice: editingProduct.sellingPrice,
      stockQty: editingProduct.stockQty,
      minStockThreshold: editingProduct.minStockThreshold,
      unit: editingProduct.unit,
      isLoose: editingProduct.isLoose,
      expiryDate: editingProduct.expiryDate
    });

    setEditingProduct(null);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    await db.products.add({
      id: 'prod_' + Math.random().toString(36).substring(2, 9),
      name: newProdName.trim(),
      hindiName: newProdHindi.trim() || newProdName.trim(),
      category: newProdCat,
      purchasePrice: parseFloat(newProdBuy) || 0,
      sellingPrice: parseFloat(newProdSell) || 0,
      stockQty: parseFloat(newProdStock) || 0,
      unit: newProdUnit,
      minStockThreshold: parseFloat(newProdMin) || 5,
      isLoose: newProdIsLoose,
      expiryDate: newProdExp || undefined
    });

    setIsAddProductOpen(false);
    setNewProdName('');
    setNewProdHindi('');
    setNewProdBuy('');
    setNewProdSell('');
    setNewProdStock('');
    setNewProdExp('');
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Actions with Village Premium Styling */}
      <div className="village-card p-4 sm:p-5 rounded-3xl bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-stone-950">
              <Package className="w-5 h-5" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-stone-950 m-0">
              {t.tabs.inventory}
            </h2>
          </div>
          <p className="text-xs text-stone-600 m-0 mt-1 font-medium">
            दुकान का संपूर्ण सामान, थोक व खुदरा दर और मार्जिन
          </p>
        </div>

        {!isCashier && (
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>नया सामान जोड़ें</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="village-card p-3 rounded-2xl bg-white flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="सामान खोजें (उदा. शक्कर, चावल, तेल)..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#faf8f3] border border-amber-200/70 rounded-xl text-xs sm:text-sm text-stone-900 font-medium outline-hidden focus:border-amber-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: 'all', label: 'सभी' },
            { id: 'staples', label: 'किराना/अनाज' },
            { id: 'pulses', label: 'दालें' },
            { id: 'oils', label: 'तेल' },
            { id: 'spices', label: 'मसाले' },
            { id: 'snacks', label: 'नाश्ता/बिस्कुट' },
            { id: 'dairy', label: 'डेयरी' },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCat === c.id
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-[#faf8f3] text-stone-700 border border-amber-200/60 hover:bg-amber-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Items Container */}
      <div className="village-card rounded-3xl overflow-hidden bg-white shadow-2xs">
        <div className="p-3.5 bg-[#faf8f3] border-b border-amber-200/60 flex items-center justify-between text-xs font-bold text-stone-700">
          <span>कुल {filtered.length} सामान</span>
          <span className="text-[11px] text-stone-500 font-medium">मुनाफ़ा व इन्वेंट्री नियंत्रण</span>
        </div>

        {/* 1. Mobile Cards View (Hidden on md+, visible on mobile) */}
        <div className="block md:hidden divide-y divide-stone-100 p-2 space-y-2">
          {filtered.map((prod: Product) => {
            const profit = prod.sellingPrice - prod.purchasePrice;
            const marginPct = prod.sellingPrice > 0 ? Math.round((profit / prod.sellingPrice) * 100) : 0;
            const isLow = prod.stockQty <= prod.minStockThreshold;

            return (
              <div key={prod.id} className="p-3 bg-[#faf8f3] rounded-2xl border border-amber-200/50 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-stone-950 text-sm">
                      {language === 'hi' ? prod.hindiName : prod.name}
                    </div>
                    <div className="text-[11px] text-stone-500 font-normal">{prod.name}</div>
                  </div>
                  {!isCashier && (
                    <button
                      onClick={() => setEditingProduct({ ...prod })}
                      className="p-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-amber-700 cursor-pointer"
                      title="एडिट करें"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {isCashier ? (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-100 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">बिक्री दर</span>
                      <span className="font-black text-stone-900 text-sm">₹{prod.sellingPrice}/{prod.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 block">स्टॉक स्थिति</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                        isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}>
                        {prod.stockQty} {prod.unit}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-100 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 block">थोक खरीद</span>
                      <span className="font-semibold text-stone-700">₹{prod.purchasePrice}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 block">बिक्री दर</span>
                      <span className="font-black text-stone-900">₹{prod.sellingPrice}/{prod.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 block">मुनाफ़ा</span>
                      <span className="font-black text-emerald-800">
                        +₹{Math.round(profit * 10) / 10} ({marginPct}%)
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    prod.isLoose ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {prod.isLoose ? 'खुला (Loose)' : 'पैकेट/ब्रांड'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}>
                    स्टॉक: {prod.stockQty} {prod.unit}
                  </span>
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
                <th className="p-3.5">सामान का नाम</th>
                <th className="p-3.5">प्रकार</th>
                {!isCashier && <th className="p-3.5 text-right">थोक दर (खरीद)</th>}
                <th className="p-3.5 text-right">दुकान दर (बिक्री)</th>
                {!isCashier && <th className="p-3.5 text-right">मुनाफ़ा (Margin)</th>}
                <th className="p-3.5 text-center">स्टॉक</th>
                {!isCashier && <th className="p-3.5 text-center">एडिट</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filtered.map((prod: Product) => {
                const profit = prod.sellingPrice - prod.purchasePrice;
                const marginPct = prod.sellingPrice > 0 ? Math.round((profit / prod.sellingPrice) * 100) : 0;
                const isLow = prod.stockQty <= prod.minStockThreshold;

                return (
                  <tr key={prod.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-3.5 font-bold text-stone-950">
                      <div>{language === 'hi' ? prod.hindiName : prod.name}</div>
                      <div className="text-[11px] text-stone-400 font-normal">{prod.name}</div>
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        prod.isLoose ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-700'
                      }`}>
                        {prod.isLoose ? 'खुला (Loose)' : 'पैकेट/ब्रांड'}
                      </span>
                    </td>

                    {!isCashier && (
                      <td className="p-3.5 text-right text-stone-700 font-semibold">
                        ₹{prod.purchasePrice} /{prod.unit}
                      </td>
                    )}

                    <td className="p-3.5 text-right text-stone-950 font-black">
                      ₹{prod.sellingPrice} /{prod.unit}
                    </td>

                    {!isCashier && (
                      <td className="p-3.5 text-right">
                        <span className="text-emerald-800 font-black">
                          +₹{Math.round(profit * 10) / 10}
                        </span>
                        <span className="text-[10px] text-stone-400 font-semibold block">
                          ({marginPct}%)
                        </span>
                      </td>
                    )}

                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                        isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}>
                        {prod.stockQty} {prod.unit}
                      </span>
                    </td>

                    {!isCashier && (
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setEditingProduct({ ...prod })}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                          title="एडिट करें"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                सामान व दर अपडेट करें
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">नाम (हिन्दी):</label>
                <input
                  type="text"
                  value={editingProduct.hindiName}
                  onChange={e => setEditingProduct({ ...editingProduct, hindiName: e.target.value })}
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">थोक खरीद दर (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.purchasePrice}
                    onChange={e => setEditingProduct({ ...editingProduct, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">दुकान बिक्री दर (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.sellingPrice}
                    onChange={e => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">वर्तमान स्टॉक:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.stockQty}
                    onChange={e => setEditingProduct({ ...editingProduct, stockQty: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">न्यूनतम सीमा:</label>
                  <input
                    type="number"
                    value={editingProduct.minStockThreshold}
                    onChange={e => setEditingProduct({ ...editingProduct, minStockThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-xs"
                >
                  अपडेट करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-black text-stone-950 text-base m-0">
                दुकान में नया सामान जोड़ें
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">नाम (English): *</label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={e => setNewProdName(e.target.value)}
                    placeholder="e.g. Suji"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">नाम (हिन्दी): *</label>
                  <input
                    type="text"
                    required
                    value={newProdHindi}
                    onChange={e => setNewProdHindi(e.target.value)}
                    placeholder="उदा. सूजी / रवा"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">श्रेणी (Category):</label>
                  <select
                    value={newProdCat}
                    onChange={e => setNewProdCat(e.target.value as Product['category'])}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  >
                    <option value="staples">{t.pos.categoryNames.staples}</option>
                    <option value="pulses">{t.pos.categoryNames.pulses}</option>
                    <option value="oils">{t.pos.categoryNames.oils}</option>
                    <option value="spices">{t.pos.categoryNames.spices}</option>
                    <option value="snacks">{t.pos.categoryNames.snacks}</option>
                    <option value="hygiene">{t.pos.categoryNames.hygiene}</option>
                    <option value="dairy">{t.pos.categoryNames.dairy}</option>
                    <option value="rural_special">{t.pos.categoryNames.rural_special}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">इकाई (Unit):</label>
                  <select
                    value={newProdUnit}
                    onChange={e => setNewProdUnit(e.target.value as Product['unit'])}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  >
                    <option value="kg">kg (किलो)</option>
                    <option value="packet">packet (पैकेट)</option>
                    <option value="piece">piece (नग)</option>
                    <option value="pouch">pouch (पाउच)</option>
                    <option value="liter">liter (लीटर)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">थोक खरीद दर (₹): *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProdBuy}
                    onChange={e => setNewProdBuy(e.target.value)}
                    placeholder="35"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">खुदरा बिक्री दर (₹): *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProdSell}
                    onChange={e => setNewProdSell(e.target.value)}
                    placeholder="45"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">शुरुआती स्टॉक: *</label>
                  <input
                    type="number"
                    required
                    value={newProdStock}
                    onChange={e => setNewProdStock(e.target.value)}
                    placeholder="25"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">न्यूनतम सीमा:</label>
                  <input
                    type="number"
                    value={newProdMin}
                    onChange={e => setNewProdMin(e.target.value)}
                    placeholder="10"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProdIsLoose}
                    onChange={e => setNewProdIsLoose(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 cursor-pointer"
                  />
                  <span>खुला बिकने वाला सामान (Loose / बिना पैकेट)</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer shadow-xs"
                >
                  सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
