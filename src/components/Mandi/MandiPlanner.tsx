import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShoppingCart, Share2, Plus, Trash2, CheckSquare, X, 
  PackageCheck, Check, Sparkles, Building2, 
  Phone, Search, AlertTriangle, BookOpen, Edit2
} from 'lucide-react';
import { db } from '../../db';
import type { Product, Wholesaler } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { DailyRateSheetModal } from './DailyRateSheetModal';
import { syncService } from '../../services/syncService';
import { openWhatsApp } from '../../utils/whatsapp';

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
  currentSellingPrice?: number;
  newSellingPrice?: number;
  checked: boolean;
  isCustom?: boolean;
}

const defaultWholesalers: Wholesaler[] = [];

export const MandiPlanner: React.FC = () => {
  const { language, t } = useLanguage();
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [qtyOverrides, setQtyOverrides] = useState<Record<string, number>>({});

  // Wholesaler directory state
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>(() => {
    try {
      const saved = localStorage.getItem('gk_wholesaler_directory');
      if (saved) return JSON.parse(saved);
    } catch (_) {}

    const oldName = localStorage.getItem('gk_mandi_wholesaler_name');
    const oldPhone = localStorage.getItem('gk_mandi_wholesaler_phone');
    if (oldName || oldPhone) {
      return [{
        id: 'ws_default',
        name: oldName || 'थोक व्यापारी',
        phone: oldPhone || '',
        mandiLocation: 'तहसील मंडी',
        category: 'अनाज व किराना'
      }];
    }
    return defaultWholesalers;
  });

  const [selectedWholesalerId, setSelectedWholesalerId] = useState<string>(() => {
    return localStorage.getItem('gk_selected_wholesaler_id') || (wholesalers[0]?.id || '');
  });

  const [showWholesalerModal, setShowWholesalerModal] = useState<boolean>(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const [wsName, setWsName] = useState('');
  const [wsPhone, setWsPhone] = useState('');
  const [wsLocation, setWsLocation] = useState('');
  const [wsCategory, setWsCategory] = useState('अनाज व किराना');

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

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
  const [isRateSheetOpen, setIsRateSheetOpen] = useState(false);

  // Persist wholesalers
  useEffect(() => {
    localStorage.setItem('gk_wholesaler_directory', JSON.stringify(wholesalers));
  }, [wholesalers]);

  useEffect(() => {
    localStorage.setItem('gk_selected_wholesaler_id', selectedWholesalerId);
  }, [selectedWholesalerId]);

  const activeWholesaler = wholesalers.find(w => w.id === selectedWholesalerId) || wholesalers[0];

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

  const filterCategories = [
    { id: 'all', label: 'सभी सामान' },
    { id: 'staples', label: 'अनाज' },
    { id: 'pulses', label: 'दालें' },
    { id: 'oils', label: 'तेल/घी' },
    { id: 'spices', label: 'मसाले' },
    { id: 'snacks', label: 'नाश्ता' },
    { id: 'hygiene', label: 'साबुन' },
    { id: 'dairy', label: 'डेयरी' },
    { id: 'custom', label: 'अन्य जोड़े' }
  ];

  const filteredMandiRows = mandiRows.filter(row => {
    const matchesCat = selectedCategory === 'all' || row.category === selectedCategory;
    const matchesSearch = !searchFilter.trim() || 
      row.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
      row.hindiName.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
      .map(item => {
        const prod = item.productId ? products.find(p => p.id === item.productId) : undefined;
        const currentSell = prod?.sellingPrice;
        const defaultSell = currentSell !== undefined 
          ? (item.wholesaleRate > currentSell ? Math.round(item.wholesaleRate * 1.15) : currentSell)
          : Math.round(item.wholesaleRate * 1.15) || (item.wholesaleRate + 5);

        return {
          productId: item.productId,
          name: item.name,
          hindiName: item.hindiName,
          qty: item.suggestedQty,
          unit: item.unit,
          rate: item.wholesaleRate,
          currentSellingPrice: currentSell,
          newSellingPrice: defaultSell,
          checked: true,
          isCustom: !item.productId
        };
      });
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
    setReceiveList(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updatedRate = Math.max(0, rate);
      const isMarginInverted = item.currentSellingPrice !== undefined && updatedRate >= item.currentSellingPrice;
      const updatedSell = isMarginInverted 
        ? Math.round(updatedRate * 1.15) 
        : item.newSellingPrice;
      return { ...item, rate: updatedRate, newSellingPrice: updatedSell };
    }));
  };

  const handleUpdateReceiveSellingPrice = (idx: number, sellPrice: number) => {
    setReceiveList(prev => prev.map((item, i) => i === idx ? { ...item, newSellingPrice: Math.max(0, sellPrice) } : item));
  };

  const handleConfirmReceiveStock = async () => {
    const selected = receiveList.filter(item => item.checked && item.qty > 0);
    if (selected.length === 0) {
      alert('कृपया कम से कम एक सामान चुनें जिसकी मात्रा 0 से अधिक हो।');
      return;
    }

    try {
      await db.transaction('rw', db.products, async () => {
        for (const item of selected) {
          if (item.productId) {
            const existing = await db.products.get(item.productId);
            if (existing) {
              const newStock = (existing.stockQty || 0) + item.qty;
              const updatePayload: Partial<Product> = {
                stockQty: Math.round(newStock * 100) / 100,
                purchasePrice: item.rate > 0 ? item.rate : existing.purchasePrice,
                updatedAt: new Date().toISOString()
              };
              if (item.newSellingPrice && item.newSellingPrice > 0) {
                updatePayload.sellingPrice = item.newSellingPrice;
              }
              await db.products.update(item.productId, updatePayload);
            }
          } else {
            // Ad-Hoc / Custom item -> Auto-create in db.products
            const newProdId = 'prod_' + Math.random().toString(36).substring(2, 9);
            const calculatedSell = item.newSellingPrice && item.newSellingPrice > 0 
              ? item.newSellingPrice 
              : Math.round(item.rate * 1.15) || (item.rate + 5);

            await db.products.add({
              id: newProdId,
              name: item.name,
              hindiName: item.hindiName,
              category: 'staples',
              purchasePrice: item.rate,
              sellingPrice: calculatedSell,
              stockQty: item.qty,
              unit: (item.unit as any) || 'kg',
              minStockThreshold: 5,
              isLoose: ['kg', 'liter'].includes(item.unit),
              updatedAt: new Date().toISOString()
            });
          }
        }
      });

      setCustomItems([]);
      setQtyOverrides({});
      setShowReceiveModal(false);
      setReceiveSuccessMsg(`✅ ${selected.length} सामानों का स्टॉक सफलतापूर्वक बढ़ा दिया गया!`);
      setTimeout(() => setReceiveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Failed to update stock from mandi:', err);
      alert('स्टॉक अपडेट करने में त्रुटि हुई।');
    }
  };

  // Save Wholesaler
  const handleSaveWholesaler = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = wsName.trim();
    const cleanPhone = wsPhone.replace(/\D/g, '').slice(-10);

    if (!cleanName) {
      alert('कृपया व्यापारी का नाम दर्ज करें!');
      return;
    }
    if (cleanPhone && cleanPhone.length !== 10) {
      alert('कृपया 10-अंकों का मान्य मोबाइल नंबर दर्ज करें!');
      return;
    }

    if (editingWholesaler) {
      setWholesalers(prev => prev.map(w => w.id === editingWholesaler.id ? {
        ...w,
        name: cleanName,
        phone: cleanPhone,
        mandiLocation: wsLocation.trim(),
        category: wsCategory
      } : w));
    } else {
      const newWs: Wholesaler = {
        id: 'ws_' + Math.random().toString(36).substring(2, 9),
        name: cleanName,
        phone: cleanPhone,
        mandiLocation: wsLocation.trim(),
        category: wsCategory
      };
      setWholesalers(prev => [...prev, newWs]);
      setSelectedWholesalerId(newWs.id);
    }

    setEditingWholesaler(null);
    setWsName('');
    setWsPhone('');
    setWsLocation('');
    setShowWholesalerModal(false);
  };

  const handleDeleteWholesaler = (id: string) => {
    const target = wholesalers.find(w => w.id === id);
    if (!target) return;
    if (confirm(`क्या आप व्यापारी "${target.name}" को हटाना चाहते हैं?`)) {
      setWholesalers(prev => prev.filter(w => w.id !== id));
      if (selectedWholesalerId === id) {
        const remaining = wholesalers.filter(w => w.id !== id);
        setSelectedWholesalerId(remaining[0]?.id || '');
      }
    }
  };

  const shareToWholesalerWhatsApp = () => {
    if (mandiRows.length === 0) return;
    if (!activeWholesaler || !activeWholesaler.phone) {
      alert('कृपया पहले डायरी (✏️) में थोक व्यापारी जोड़ें या उनका फ़ोन नंबर दर्ज करें।');
      return;
    }
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'ग्रामीण किराना स्टोर';
    const village = store?.village ? `(${store.village})` : '';

    const wsTitle = activeWholesaler?.name ? `${activeWholesaler.name} जी` : 'भैयाजी';
    let text = `🛒 *मंडी खरीदारी आर्डर - ${shopName}*\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    if (activeWholesaler?.mandiLocation) {
      text += `📍 मंडी: ${activeWholesaler.mandiLocation}\n`;
    }
    text += `नमस्ते ${wsTitle}, हमें दुकान हेतु निम्नलिखित सामान चाहिए, कृपया पैक रखें:\n`;
    text += `------------------------------------\n`;

    mandiRows.forEach((item, idx) => {
      const name = language === 'hi' ? item.hindiName : item.name;
      const estLineCost = Math.round(item.suggestedQty * item.wholesaleRate);
      text += `${idx + 1}. *${name}* - *${item.suggestedQty} ${item.unit}* (अनुमानित दर: ₹${item.wholesaleRate} = ₹${estLineCost})\n`;
    });

    text += `------------------------------------\n`;
    text += `💰 *अनुमानित कुल लागत: ₹${totalEstimatedMandiBudget.toLocaleString('en-IN')}*\n`;
    text += `दुकान: ${shopName} ${village}\n`;
    text += `कृपया बिल तैयार रखें, हम गाड़ी लेकर पहुँच रहे हैं। 🙏`;

    const phone = activeWholesaler?.phone ? activeWholesaler.phone.replace(/[^0-9]/g, '') : '';
    openWhatsApp(phone, text);
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
              <Building2 className="w-3.5 h-3.5 text-amber-700" />
              <span>थोक व्यापारी:</span>
            </span>

            {/* Wholesaler Dropdown Switcher */}
            <select
              value={selectedWholesalerId}
              onChange={e => setSelectedWholesalerId(e.target.value)}
              className="p-2 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500 max-w-xs"
            >
              {wholesalers.length === 0 ? (
                <option value="">कोई व्यापारी नहीं (डायरी ✏️ से जोड़ें)</option>
              ) : (
                wholesalers.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.category || 'किराना'}) - {w.mandiLocation || 'मंडी'}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={() => {
                setEditingWholesaler(null);
                setWsName('');
                setWsPhone('');
                setWsLocation('');
                setWsCategory('अनाज व किराना');
                setShowWholesalerModal(true);
              }}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="व्यापारी डायरी खोलें या नया व्यापारी जोड़ें"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>डायरी ({wholesalers.length}) ✏️</span>
            </button>

            {activeWholesaler && (
              <span className="text-[11px] text-stone-500 font-semibold flex items-center gap-1 ml-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{activeWholesaler.phone}</span>
                {activeWholesaler.mandiLocation && (
                  <span className="text-stone-400">| {activeWholesaler.mandiLocation}</span>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsRateSheetOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="सुबह 1-क्लिक में आज के मंडी भाव अपडेट करें"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-950" />
              <span>{t.mandi?.dailyRateSheet || '🌅 दैनिक भाव शीट'}</span>
            </button>

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
              disabled={mandiRows.length === 0}
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
        {/* Category Filter Chips & Search Bar */}
        <div className="p-2.5 sm:p-3 bg-[#faf8f3] border-b border-amber-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {filterCategories.map(cat => {
              const count = cat.id === 'all' 
                ? mandiRows.length 
                : mandiRows.filter(r => r.category === cat.id).length;
              if (count === 0 && cat.id !== 'all') return null;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-700 text-white shadow-2xs'
                      : 'bg-white text-stone-700 border border-amber-200/70 hover:bg-amber-50'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative shrink-0 w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="सामान खोजें..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-xl outline-hidden focus:border-amber-500 font-semibold"
            />
          </div>
        </div>

        {filteredMandiRows.length === 0 ? (
          <div className="p-8 text-center text-stone-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-2 text-stone-300 stroke-[1.5]" />
            <p className="text-sm font-bold text-stone-600">
              {mandiRows.length === 0 ? 'सभी सामानों का स्टॉक पर्याप्त है।' : 'इस श्रेणी में कोई सामान नहीं मिला।'}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {mandiRows.length === 0 ? 'मंडी खरीदारी की आवश्यकता नहीं है।' : 'ऊपर "सभी सामान" चुनें या खोज साफ़ करें।'}
            </p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Hidden on md and desktop, visible on mobile) */}
            <div className="block md:hidden divide-y divide-stone-100 p-2 space-y-2">
              {filteredMandiRows.map((row, idx) => {
                const lineTotal = Math.round(row.suggestedQty * row.wholesaleRate);
                return (
                  <div key={row.productId || `custom-mob-${idx}`} className="p-3 bg-[#faf8f3] rounded-2xl border border-amber-200/50 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-stone-950 text-sm flex items-center gap-1.5">
                          <span>{language === 'hi' ? row.hindiName : row.name}</span>
                          {row.category === 'custom' && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md">
                              नया
                            </span>
                          )}
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
                          onClick={() => setCustomItems(prev => prev.filter(c => c.name !== row.name))}
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
                  {filteredMandiRows.map((row, idx) => {
                    const lineTotal = Math.round(row.suggestedQty * row.wholesaleRate);
                    return (
                      <tr key={row.productId || `custom-${idx}`} className="hover:bg-amber-50/40 transition-colors">
                        <td className="p-3.5 font-bold text-stone-950">
                          <div className="flex items-center gap-1.5">
                            <span>{language === 'hi' ? row.hindiName : row.name}</span>
                            {row.category === 'custom' && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-md">
                                नया
                              </span>
                            )}
                          </div>
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
                              onClick={() => setCustomItems(prev => prev.filter(c => c.name !== row.name))}
                              className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400">ऑटो</span>
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

      {/* Wholesaler Directory Management Modal */}
      {showWholesalerModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-5 border border-amber-300/80 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 m-0">
                    थोक व्यापारी डायरी (Wholesaler Directory)
                  </h3>
                  <p className="text-xs text-stone-500 m-0 font-medium">
                    अपने तहसील/शहर के थोक आढ़तियों के नाम व नंबर सुरक्षित रखें
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWholesalerModal(false);
                  setEditingWholesaler(null);
                }}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Saved Wholesalers List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {wholesalers.map(w => (
                <div 
                  key={w.id} 
                  className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                    w.id === selectedWholesalerId 
                      ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/50' 
                      : 'bg-[#faf8f3] border-stone-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                        {w.name}
                      </span>
                      {w.category && (
                        <span className="px-1.5 py-0.5 bg-stone-200/80 text-stone-700 rounded-md text-[10px] font-semibold whitespace-nowrap">
                          {w.category}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 font-medium flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <Phone className="w-3 h-3" /> {w.phone}
                      </span>
                      {w.mandiLocation && (
                        <span className="text-stone-400 truncate">| 📍 {w.mandiLocation}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWholesalerId(w.id);
                        setShowWholesalerModal(false);
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                        w.id === selectedWholesalerId 
                          ? 'bg-emerald-700 text-white' 
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {w.id === selectedWholesalerId ? 'चयनित ✓' : 'चुनें'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingWholesaler(w);
                        setWsName(w.name);
                        setWsPhone(w.phone);
                        setWsLocation(w.mandiLocation || '');
                        setWsCategory(w.category || 'अनाज व किराना');
                      }}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-amber-800 hover:bg-amber-100 cursor-pointer"
                      title="संपादित करें"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWholesaler(w.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="हटाएं"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add or Edit Wholesaler Form */}
            <form onSubmit={handleSaveWholesaler} className="bg-[#faf8f3] p-3 rounded-2xl border border-amber-200/80 space-y-2.5">
              <div className="text-xs font-bold text-stone-900 flex items-center justify-between">
                <span>{editingWholesaler ? '✏️ व्यापारी विवरण बदलें:' : '➕ नया व्यापारी जोड़ें:'}</span>
                {editingWholesaler && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWholesaler(null);
                      setWsName('');
                      setWsPhone('');
                      setWsLocation('');
                    }}
                    className="text-[10px] text-stone-500 hover:text-stone-800 underline font-bold"
                  >
                    रद्द करें
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">नाम: *</label>
                  <input
                    type="text"
                    required
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                    placeholder="उदा. साहू ट्रेडर्स"
                    className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">मोबाइल नंबर (10 अंक):</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={wsPhone}
                    onChange={e => setWsPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98271XXXXX"
                    className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">मंडी / पता:</label>
                  <input
                    type="text"
                    value={wsLocation}
                    onChange={e => setWsLocation(e.target.value)}
                    placeholder="उदा. तहसील मंडी"
                    className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">सामान श्रेणी:</label>
                  <select
                    value={wsCategory}
                    onChange={e => setWsCategory(e.target.value)}
                    className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
                  >
                    <option value="अनाज व किराना">अनाज व किराना</option>
                    <option value="तेल व घी">तेल व घी</option>
                    <option value="मसाले व शक्कर">मसाले व शक्कर</option>
                    <option value="साबुन व FMCG">साबुन व FMCG</option>
                    <option value="अन्य">अन्य</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                {editingWholesaler ? 'सुरक्षित करें ✓' : 'डायरी में जोड़ें +'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Item Modal */}
      {showAddCustom && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 border border-amber-300/80 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-black text-stone-900 m-0">
                {t.mandi.addItemManually}
              </h3>
              <button
                onClick={() => setShowAddCustom(false)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  सामान का नाम: *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomName}
                  onChange={e => setNewCustomName(e.target.value)}
                  placeholder="उदा. देसी गुड़, नया पोहा"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
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
              {receiveList.map((item, idx) => {
                const isMarginInverted = item.currentSellingPrice !== undefined && item.rate >= item.currentSellingPrice;
                return (
                  <div 
                    key={item.productId || `receive-${idx}`} 
                    className={`p-2.5 rounded-2xl border transition-all space-y-1.5 ${
                      !item.checked 
                        ? 'bg-stone-50 border-stone-200 opacity-60' 
                        : isMarginInverted
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-[#faf8f3] border-amber-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleReceiveItem(idx)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <span className="text-xs font-bold text-stone-900 block truncate">
                            {language === 'hi' ? item.hindiName : item.name}
                          </span>
                          {item.isCustom && (
                            <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md inline-block mt-0.5">
                              ✨ नया सामान (इन्वेंटरी में जुड़ेगा)
                            </span>
                          )}
                        </div>
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
                            title="आई हुई मात्रा"
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

                    {/* Inverted Pricing Loss Alert & Selling Price Revision */}
                    {item.checked && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/70">
                        {isMarginInverted ? (
                          <span className="text-rose-700 font-black flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>खरीद दर (₹{item.rate}) बिक्री दर (₹{item.currentSellingPrice}) से ज्यादा/बराबर है! घाटा होगा।</span>
                          </span>
                        ) : (
                          <span className="text-stone-500 font-medium">
                            वर्तमान खुदरा बिक्री भाव: <b className="text-stone-800">₹{item.currentSellingPrice || item.newSellingPrice}</b>
                          </span>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          <span className="text-[10px] font-bold text-stone-600">नई बिक्री दर ₹:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.newSellingPrice || ''}
                            onChange={e => handleUpdateReceiveSellingPrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 p-0.5 bg-white border border-stone-300 rounded-lg text-right font-black text-xs text-emerald-800 outline-hidden focus:border-emerald-600"
                            title="नई खुदरा बिक्री दर सेट करें"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Daily Rate Sheet Modal */}
      <DailyRateSheetModal
        isOpen={isRateSheetOpen}
        onClose={() => setIsRateSheetOpen(false)}
      />
    </div>
  );
};
