import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Edit2, Package, X, Sparkles, AlertTriangle, Check, Layers } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import { DailyRateSheetModal } from '../Mandi/DailyRateSheetModal';

export const AllStock: React.FC = () => {
  const { language, t } = useLanguage();
  const isCashier = syncService.getRole() === 'munim' || syncService.getUserInfo()?.role === 'CASHIER';
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isRateSheetOpen, setIsRateSheetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [showDeduplicateDetails, setShowDeduplicateDetails] = useState(false);

  // New product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdHindi, setNewProdHindi] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdCat, setNewProdCat] = useState<Product['category']>('staples');
  const [newProdBuy, setNewProdBuy] = useState('');
  const [newProdSell, setNewProdSell] = useState('');
  const [newProdStock, setNewProdStock] = useState('');
  const [newProdUnit, setNewProdUnit] = useState<Product['unit']>('kg');
  const [newProdMin, setNewProdMin] = useState('10');
  const [newProdIsLoose, setNewProdIsLoose] = useState(false);
  const [newProdExp, setNewProdExp] = useState('');

  const normalize = (str?: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

  // Identify duplicate groups in existing products catalog (for 1-click audit & cleanup)
  const duplicateGroups = useMemo(() => {
    const groups: {
      key: string;
      reason: 'BARCODE' | 'NAME';
      primary: Product;
      duplicates: Product[];
      totalStock: number;
    }[] = [];

    const seenIds = new Set<string>();

    // 1. Group by non-empty Barcode
    const barcodeMap = new Map<string, Product[]>();
    for (const p of products) {
      const bc = (p.barcode || '').trim();
      if (bc) {
        if (!barcodeMap.has(bc)) barcodeMap.set(bc, []);
        barcodeMap.get(bc)!.push(p);
      }
    }

    for (const [bc, prods] of barcodeMap.entries()) {
      if (prods.length > 1) {
        const [primary, ...dups] = prods;
        prods.forEach(p => p.id && seenIds.add(p.id));
        const totalStock = prods.reduce((sum, p) => sum + (p.stockQty || 0), 0);
        groups.push({
          key: `bc_${bc}`,
          reason: 'BARCODE',
          primary,
          duplicates: dups,
          totalStock
        });
      }
    }

    // 2. Group by Normalized Name + Unit (excluding items already caught by barcode)
    const nameMap = new Map<string, Product[]>();
    for (const p of products) {
      if (p.id && seenIds.has(p.id)) continue;
      const normName = normalize(p.name);
      const normHindi = normalize(p.hindiName);
      const key = `${normName || normHindi}_${p.unit}`;
      if (!nameMap.has(key)) nameMap.set(key, []);
      nameMap.get(key)!.push(p);
    }

    for (const [key, prods] of nameMap.entries()) {
      if (prods.length > 1) {
        const [primary, ...dups] = prods;
        prods.forEach(p => p.id && seenIds.add(p.id));
        const totalStock = prods.reduce((sum, p) => sum + (p.stockQty || 0), 0);
        groups.push({
          key: `name_${key}`,
          reason: 'NAME',
          primary,
          duplicates: dups,
          totalStock
        });
      }
    }

    return groups;
  }, [products]);

  // Real-time duplicate detection in Add modal
  const cleanNewBarcode = newProdBarcode.trim();
  const cleanNewName = normalize(newProdName);
  const cleanNewHindi = normalize(newProdHindi);

  const duplicateBarcodeAddMatch = cleanNewBarcode
    ? products.find(p => p.barcode && p.barcode.trim() === cleanNewBarcode)
    : null;

  const duplicateNameAddMatch = (cleanNewName || cleanNewHindi)
    ? products.find(p => {
        const pName = normalize(p.name);
        const pHindi = normalize(p.hindiName);
        return (cleanNewName && (pName === cleanNewName || pHindi === cleanNewName)) ||
               (cleanNewHindi && (pHindi === cleanNewHindi || pName === cleanNewHindi));
      })
    : null;

  const existingMatchToAdd = duplicateBarcodeAddMatch || duplicateNameAddMatch;

  // Real-time duplicate barcode detection in Edit modal
  const duplicateBarcodeEditMatch = editingProduct && editingProduct.barcode && editingProduct.barcode.trim()
    ? products.find(p => p.id !== editingProduct.id && p.barcode && p.barcode.trim() === editingProduct.barcode!.trim())
    : null;

  const filtered = products.filter((p: Product) => {
    const matchesCat = selectedCat === 'all' || p.category === selectedCat;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.hindiName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const resetAddForm = () => {
    setNewProdName('');
    setNewProdHindi('');
    setNewProdBarcode('');
    setNewProdBuy('');
    setNewProdSell('');
    setNewProdStock('');
    setNewProdExp('');
  };

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleQuickPriceAdjust = async (productId: string, delta: number) => {
    const p = products.find(item => item.id === productId);
    if (!p || !p.id) return;
    const newPrice = Math.max(1, Math.round((p.sellingPrice + delta) * 10) / 10);
    await db.products.update(p.id, { 
      sellingPrice: newPrice,
      updatedAt: new Date().toISOString()
    });
  };

  const handleMergeStockIntoExisting = async (targetProduct: Product) => {
    if (!targetProduct.id) return;
    const addedQty = Math.max(0, parseFloat(newProdStock) || 0);
    const newBuyRate = parseFloat(newProdBuy);
    const newSellRate = parseFloat(newProdSell);
    
    const updatedStock = Math.max(0, (targetProduct.stockQty || 0) + addedQty);
    const updates: Partial<Product> = {
      stockQty: updatedStock,
      updatedAt: new Date().toISOString()
    };
    if (!isNaN(newBuyRate) && newBuyRate > 0) {
      updates.purchasePrice = newBuyRate;
    }
    if (!isNaN(newSellRate) && newSellRate > 0) {
      updates.sellingPrice = newSellRate;
    }
    if (!targetProduct.barcode && cleanNewBarcode) {
      updates.barcode = cleanNewBarcode;
    }
    
    await db.products.update(targetProduct.id, updates);
    setIsAddProductOpen(false);
    resetAddForm();
    showNotification(`✅ "${targetProduct.hindiName}" का स्टॉक बढ़कर ${updatedStock} ${targetProduct.unit} हो गया (डुप्लीकेट नहीं बना)!`);
  };

  const handleMergeAllDuplicates = async () => {
    if (duplicateGroups.length === 0) return;
    const confirmMsg = `क्या आप सभी ${duplicateGroups.length} डुप्लीकेट सामानों को मिलाना चाहते हैं?\n\n- सभी का स्टॉक आपस में जुड़ जाएगा।\n- डुप्लीकेट रिकॉर्ड साफ़ हो जाएंगे।\n- कोई डेटा या हिसाब नष्ट नहीं होगा।`;
    if (!confirm(confirmMsg)) return;

    setIsMerging(true);
    try {
      const deletedIds: string[] = [];
      await db.transaction('rw', db.products, async () => {
        for (const group of duplicateGroups) {
          const { primary, duplicates } = group;
          if (!primary.id) continue;
          const additionalStock = duplicates.reduce((sum, d) => sum + (d.stockQty || 0), 0);
          const bestSellingPrice = Math.max(primary.sellingPrice, ...duplicates.map(d => d.sellingPrice || 0));
          const bestPurchasePrice = Math.max(primary.purchasePrice, ...duplicates.map(d => d.purchasePrice || 0));

          await db.products.update(primary.id, {
            stockQty: (primary.stockQty || 0) + additionalStock,
            sellingPrice: bestSellingPrice > 0 ? bestSellingPrice : primary.sellingPrice,
            purchasePrice: bestPurchasePrice > 0 ? bestPurchasePrice : primary.purchasePrice,
            updatedAt: new Date().toISOString()
          });

          for (const dup of duplicates) {
            if (dup.id) {
              deletedIds.push(dup.id);
              await db.products.delete(dup.id);
            }
          }
        }
      });

      // Record deleted IDs in localStorage for cloud sync deletion
      if (deletedIds.length > 0 && typeof window !== 'undefined') {
        try {
          const existing = JSON.parse(localStorage.getItem('gk_deleted_product_uuids') || '[]');
          const merged = Array.from(new Set([...existing, ...deletedIds]));
          localStorage.setItem('gk_deleted_product_uuids', JSON.stringify(merged));
        } catch (_) {}
      }

      // Trigger cloud sync to immediately clean server MongoDB duplicates
      syncService.triggerSync().catch(console.error);

      setShowDeduplicateDetails(false);
      showNotification(`✅ सभी ${duplicateGroups.length} डुप्लीकेट सामान सफलतापूर्वक एक में मिला दिए गए!`);
    } catch (err) {
      console.error('Failed to merge duplicates:', err);
      alert('डुप्लीकेट मिलाने में त्रुटि हुई।');
    } finally {
      setIsMerging(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;

    if (duplicateBarcodeEditMatch) {
      alert(`⚠️ बारकोड टकराव: यह बारकोड पहले से "${duplicateBarcodeEditMatch.hindiName}" में दर्ज है। कृपया अलग बारकोड दें।`);
      return;
    }

    const trimmedName = editingProduct.name.trim().replace(/\s+/g, ' ');
    const trimmedHindi = editingProduct.hindiName.trim().replace(/\s+/g, ' ') || trimmedName;

    await db.products.update(editingProduct.id, {
      name: trimmedName,
      hindiName: trimmedHindi,
      barcode: editingProduct.barcode?.trim() || undefined,
      purchasePrice: Math.max(0, editingProduct.purchasePrice || 0),
      sellingPrice: Math.max(0, editingProduct.sellingPrice || 0),
      stockQty: Math.max(0, editingProduct.stockQty || 0),
      minStockThreshold: Math.max(0, editingProduct.minStockThreshold || 0),
      unit: editingProduct.unit,
      isLoose: editingProduct.isLoose,
      expiryDate: editingProduct.expiryDate || undefined,
      updatedAt: new Date().toISOString()
    });

    setEditingProduct(null);
    showNotification(`✅ "${trimmedHindi}" विवरण सुरक्षित कर दिया गया!`);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newProdName.trim().replace(/\s+/g, ' ');
    if (!trimmedName) {
      alert('कृपया सामान का नाम दर्ज करें!');
      return;
    }

    // Strict: block duplicate barcode
    if (duplicateBarcodeAddMatch) {
      alert(`⚠️ बारकोड टकराव: यह बारकोड पहले से "${duplicateBarcodeAddMatch.hindiName}" में दर्ज है। कृपया अलग बारकोड दें या 'मौजूदा सामान में स्टॉक जोड़ें' बटन दबाएँ।`);
      return;
    }

    // Soft check: warn if exact duplicate name & unit
    if (duplicateNameAddMatch && duplicateNameAddMatch.unit === newProdUnit) {
      const proceed = confirm(`⚠️ "${duplicateNameAddMatch.hindiName}" (${newProdUnit}) पहले से स्टॉक में मौजूद है (वर्तमान स्टॉक: ${duplicateNameAddMatch.stockQty} ${duplicateNameAddMatch.unit})।\n\nक्या आप सचमुच एक नया डुप्लीकेट सामान बनाना चाहते हैं?\n(सुझाव: 'Cancel' दबाकर 'मौजूदा सामान में स्टॉक जोड़ें' बटन दबाएँ)`);
      if (!proceed) return;
    }

    const buyRate = Math.max(0, parseFloat(newProdBuy) || 0);
    const sellRate = Math.max(0, parseFloat(newProdSell) || 0);
    const stock = Math.max(0, parseFloat(newProdStock) || 0);
    const minStock = Math.max(0, parseFloat(newProdMin) || 5);

    await db.products.add({
      id: 'prod_' + Math.random().toString(36).substring(2, 9),
      name: trimmedName,
      hindiName: newProdHindi.trim().replace(/\s+/g, ' ') || trimmedName,
      barcode: cleanNewBarcode || undefined,
      category: newProdCat,
      purchasePrice: buyRate,
      sellingPrice: sellRate,
      stockQty: stock,
      unit: newProdUnit,
      minStockThreshold: minStock,
      isLoose: newProdIsLoose,
      expiryDate: newProdExp || undefined,
      updatedAt: new Date().toISOString()
    });

    setIsAddProductOpen(false);
    resetAddForm();
    showNotification(`✅ नया सामान "${newProdHindi.trim() || trimmedName}" सफलतापूर्वक जोड़ा गया!`);
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsRateSheetOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-stone-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform"
              title="दैनिक मंडी भाव शीट"
            >
              <Sparkles className="w-4 h-4 text-stone-950" />
              <span>{t.mandi?.dailyRateSheet || '🌅 दैनिक भाव शीट'}</span>
            </button>

            <button
              onClick={() => setIsAddProductOpen(true)}
              className="bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>नया सामान जोड़ें</span>
            </button>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-3 bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMsg('')} 
            className="text-emerald-200 hover:text-white font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Catalog Deduplication Audit Banner */}
      {!isCashier && duplicateGroups.length > 0 && (
        <div className="village-card p-4 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-stone-950 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-950 m-0">
                  ⚠️ स्टॉक ऑडिट: दुकान में {duplicateGroups.length} डुप्लीकेट सामान मिले
                </h4>
                <p className="text-[11px] text-amber-800 m-0 font-medium mt-0.5">
                  एक ही नाम या बारकोड के अलग-अलग रिकॉर्ड हैं। 1-क्लिक में सभी का स्टॉक आपस में जोड़कर लिस्ट साफ़ करें।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowDeduplicateDetails(!showDeduplicateDetails)}
                className="text-[11px] font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer px-2 py-1"
              >
                {showDeduplicateDetails ? '▲ विवरण छुपाएं' : '▼ विवरण देखें'}
              </button>
              <button
                type="button"
                onClick={handleMergeAllDuplicates}
                disabled={isMerging}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isMerging ? 'मिला रहे हैं...' : 'सभी डुप्लीकेट मिलाएं'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Details */}
          {showDeduplicateDetails && (
            <div className="pt-2 border-t border-amber-200/80 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {duplicateGroups.map((g) => (
                <div 
                  key={g.key}
                  className="p-2 bg-white/80 rounded-xl border border-amber-200 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="font-black text-stone-900 truncate block">
                      {g.primary.hindiName} ({g.primary.name})
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {g.reason === 'BARCODE' ? `बारकोड: ${g.primary.barcode}` : `इकाई: ${g.primary.unit}`} • {g.duplicates.length + 1} अलग रिकॉर्ड
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-stone-500 block">कुल मिलकर होगा</span>
                    <span className="font-black text-emerald-800 text-xs">{g.totalStock} {g.primary.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            { id: 'snacks', label: 'नाश्ता व बच्चों का खजाना' },
            { id: 'hygiene', label: 'साबुन व सफाई' },
            { id: 'dairy', label: 'डेयरी व पेय' },
            { id: 'rural_special', label: 'ग्रामीण दैनिक' },
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
                      {!isCashier && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => prod.id && handleQuickPriceAdjust(prod.id, -1)}
                            className="px-1 py-0.2 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-[10px] font-bold"
                            title="₹1 घटाएं"
                          >-1</button>
                          <button
                            type="button"
                            onClick={() => prod.id && handleQuickPriceAdjust(prod.id, 1)}
                            className="px-1 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold"
                            title="₹1 बढ़ाएं"
                          >+1</button>
                        </div>
                      )}
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
                      <div>₹{prod.sellingPrice} /{prod.unit}</div>
                      {!isCashier && (
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => prod.id && handleQuickPriceAdjust(prod.id, -1)}
                            className="px-1.5 py-0.2 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer"
                            title="₹1 घटाएं"
                          >-1</button>
                          <button
                            type="button"
                            onClick={() => prod.id && handleQuickPriceAdjust(prod.id, 1)}
                            className="px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold cursor-pointer"
                            title="₹1 बढ़ाएं"
                          >+1</button>
                          <button
                            type="button"
                            onClick={() => prod.id && handleQuickPriceAdjust(prod.id, 2)}
                            className="px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold cursor-pointer"
                            title="₹2 बढ़ाएं"
                          >+2</button>
                        </div>
                      )}
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

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">बारकोड (वैकल्पिक):</label>
                <input
                  type="text"
                  value={editingProduct.barcode || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                  placeholder="उदा. 8901030382748"
                  className={`w-full p-2.5 bg-[#faf8f3] border rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden ${
                    duplicateBarcodeEditMatch ? 'border-rose-500 bg-rose-50' : 'border-amber-200/80 focus:border-amber-500'
                  }`}
                />
                {duplicateBarcodeEditMatch && (
                  <p className="text-[11px] text-rose-700 font-bold mt-1 m-0 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>⚠️ यह बारकोड पहले से "{duplicateBarcodeEditMatch.hindiName} ({duplicateBarcodeEditMatch.name})" में दर्ज है। कृपया अलग बारकोड दें।</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">थोक खरीद दर (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingProduct.purchasePrice}
                    onChange={e => setEditingProduct({ ...editingProduct, purchasePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">दुकान बिक्री दर (₹):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingProduct.sellingPrice}
                    onChange={e => setEditingProduct({ ...editingProduct, sellingPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>

                {editingProduct.purchasePrice > 0 && editingProduct.sellingPrice > 0 && editingProduct.sellingPrice < editingProduct.purchasePrice && (
                  <div className="col-span-2 p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>⚠️ नुकसान चेतावनी: बिक्री दर थोक खरीद से ₹{(editingProduct.purchasePrice - editingProduct.sellingPrice).toFixed(1)} कम है!</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">वर्तमान स्टॉक:</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={editingProduct.stockQty}
                    onChange={e => setEditingProduct({ ...editingProduct, stockQty: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">न्यूनतम सीमा:</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.minStockThreshold}
                    onChange={e => setEditingProduct({ ...editingProduct, minStockThreshold: Math.max(0, parseFloat(e.target.value) || 0) })}
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
                  disabled={Boolean(duplicateBarcodeEditMatch)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white cursor-pointer shadow-xs"
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

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">बारकोड (वैकल्पिक):</label>
                <input
                  type="text"
                  value={newProdBarcode}
                  onChange={e => setNewProdBarcode(e.target.value)}
                  placeholder="उदा. 8901030382748"
                  className={`w-full p-2.5 bg-[#faf8f3] border rounded-xl text-xs sm:text-sm font-semibold text-stone-900 outline-hidden ${
                    duplicateBarcodeAddMatch ? 'border-rose-500 bg-rose-50' : 'border-amber-200/80 focus:border-amber-500'
                  }`}
                />
                {duplicateBarcodeAddMatch && (
                  <p className="text-[11px] text-rose-700 font-bold mt-1 m-0 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>⚠️ यह बारकोड पहले से "{duplicateBarcodeAddMatch.hindiName} ({duplicateBarcodeAddMatch.name})" में दर्ज है। कृपया अलग बारकोड दें या नीचे 'मौजूदा सामान में जोड़ें' बटन दबाएँ।</span>
                  </p>
                )}
              </div>

              {/* Smart Duplicate Match & Stock Merge Helper */}
              {existingMatchToAdd && (
                <div className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        {duplicateBarcodeAddMatch ? '⚠️ बारकोड मैच मिला' : 'ℹ️ मिलता-जुलता सामान पहले से मौजूद'}
                      </span>
                      <div className="font-black text-xs text-amber-950 mt-0.5">
                        {existingMatchToAdd.hindiName} ({existingMatchToAdd.name})
                      </div>
                      <div className="text-[11px] text-stone-600 mt-0.5">
                        वर्तमान स्टॉक: <span className="font-black text-stone-900">{existingMatchToAdd.stockQty} {existingMatchToAdd.unit}</span> • बिक्री भाव: <span className="font-bold text-stone-900">₹{existingMatchToAdd.sellingPrice}/{existingMatchToAdd.unit}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMergeStockIntoExisting(existingMatchToAdd)}
                    className="w-full py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      मौजूदा सामान में +{parseFloat(newProdStock) || 0} {existingMatchToAdd.unit} जोड़ें (बिना डुप्लीकेट बनाए)
                    </span>
                  </button>
                </div>
              )}

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
                    min="0"
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
                    min="0"
                    required
                    value={newProdSell}
                    onChange={e => setNewProdSell(e.target.value)}
                    placeholder="45"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {parseFloat(newProdBuy) > 0 && parseFloat(newProdSell) > 0 && parseFloat(newProdSell) < parseFloat(newProdBuy) && (
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-[11px] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    ⚠️ नुकसान चेतावनी: बिक्री दर थोक खरीद से ₹{(parseFloat(newProdBuy) - parseFloat(newProdSell)).toFixed(1)} कम है! घाटा होगा।
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">शुरुआती स्टॉक: *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
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
                    min="0"
                    step="any"
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
                  disabled={Boolean(duplicateBarcodeAddMatch)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white cursor-pointer shadow-xs"
                >
                  सुरक्षित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Rate Sheet Modal */}
      <DailyRateSheetModal
        isOpen={isRateSheetOpen}
        onClose={() => setIsRateSheetOpen(false)}
        isCashier={isCashier}
      />
    </div>
  );
};
