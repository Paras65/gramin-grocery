import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  Zap, Check, Trash2, Printer, Plus, Minus,
  RotateCcw, Sparkles, Settings, Share2, X
} from 'lucide-react';
import { db } from '../../db';
import type { Product, Sale } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { printReceipt } from '../../utils/thermalPrint';
import { DemoLimitModal } from '../Demo/DemoLimitModal';
import { StoreAuthModal } from '../Auth/StoreAuthModal';
import { syncService } from '../../services/syncService';

interface HaatCartItem {
  product: Product;
  quantity: number;
  calculatedPrice: number;
}

export const HaatBazaarMode: React.FC = () => {
  const { language, t } = useLanguage();
  const th = t.haatMode;

  const products = useLiveQuery(() => db.products.toArray()) || [];
  const sales = useLiveQuery(() => db.sales.toArray()) || [];

  const [cart, setCart] = useState<HaatCartItem[]>([]);
  const [tenderCash, setTenderCash] = useState<number | null>(null);
  const [autoPrint, setAutoPrint] = useState<boolean>(false);
  const [lastSaleBanner, setLastSaleBanner] = useState<{ total: number; change: number } | null>(null);
  const [isDemoLimitOpen, setIsDemoLimitOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isConfigureTilesOpen, setIsConfigureTilesOpen] = useState<boolean>(false);
  const [tileSearch, setTileSearch] = useState<string>('');
  const [customTileIds, setCustomTileIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('gk_haat_custom_tiles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [tempTileIds, setTempTileIds] = useState<string[]>([]);

  // Filter top 12 Fast-Moving Haat Items
  const haatFastItems = useMemo(() => {
    if (customTileIds.length > 0) {
      const selected = products.filter(p => p.id && customTileIds.includes(p.id));
      if (selected.length > 0) return selected.slice(0, 12);
    }

    const priorityNames = [
      'Gud (Jaggery Bheli)',
      'Sarson Tel (Mustard Loose)',
      'Tata Namak (1kg)',
      'Loose Namak (Sada Khula)',
      'Bidi Bundle (Chhap 502)',
      'Cheeta Matchbox (माचिस)',
      'Parle-G Biscuit (₹5)',
      'Rin Soap Bar (₹10)',
      'Chai Patti (Red Label 250g)',
      'Khuli Chai Patti (Loose)',
      'Chana Daal',
      'Poha / Chuda'
    ];

    const matched = products.filter(p => priorityNames.includes(p.name));
    if (matched.length >= 8) return matched;
    return products.slice(0, 12);
  }, [products, customTileIds]);

  // Today's Haat Sales Total
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHaatSales = useMemo(() => {
    return sales.filter(s => s.timestamp.startsWith(todayStr) && s.paymentMode === 'CASH');
  }, [sales, todayStr]);

  const totalHaatCash = useMemo(() => {
    return todayHaatSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [todayHaatSales]);

  // Total payable in cart
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + it.calculatedPrice, 0);
  }, [cart]);

  // Change to return
  const changeToReturn = tenderCash !== null && tenderCash >= cartTotal ? tenderCash - cartTotal : 0;

  // Audio confirmation
  const playHaatChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio optional
    }
  };

  // Add Item to Haat Cart (1-tap)
  const addItemToHaatCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        const newQty = copy[idx].quantity + 1;
        copy[idx] = {
          ...copy[idx],
          quantity: newQty,
          calculatedPrice: Math.round(newQty * product.sellingPrice * 100) / 100
        };
        return copy;
      } else {
        return [...prev, {
          product,
          quantity: 1,
          calculatedPrice: product.sellingPrice
        }];
      }
    });
  };

  // Update quantity in cart
  const updateQty = (productId: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(it => {
        if (it.product.id === productId) {
          const newQty = it.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...it,
            quantity: newQty,
            calculatedPrice: Math.round(newQty * it.product.sellingPrice * 100) / 100
          };
        }
        return it;
      }).filter(Boolean) as HaatCartItem[];
    });
  };

  // Complete Sale in 1 Tap
  const handleCompleteHaatSale = async () => {
    if (cart.length === 0) return;

    if (await syncService.isDemoQuotaReached()) {
      setIsDemoLimitOpen(true);
      return;
    }

    const timestamp = new Date().toISOString();
    const saleRecord: Sale = {
      id: 'sale_haat_' + Math.random().toString(36).substring(2, 9),
      timestamp,
      items: cart.map(it => ({
        productId: it.product.id,
        name: it.product.name,
        hindiName: it.product.hindiName,
        quantity: it.quantity,
        unit: it.product.unit,
        unitPrice: it.product.sellingPrice,
        total: it.calculatedPrice
      })),
      totalAmount: cartTotal,
      paymentMode: 'CASH',
    };

    // Save to IndexedDB
    await db.sales.add(saleRecord);

    // Decrement stock in database
    for (const item of cart) {
      if (item.product.id) {
        const prod = await db.products.get(item.product.id);
        if (prod) {
          await db.products.update(item.product.id, {
            stockQty: Math.max(0, prod.stockQty - item.quantity)
          });
        }
      }
    }

    // Audio & Visual celebratory feedback
    playHaatChime();
    confetti({
      particleCount: 25,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#d97706', '#059669', '#f59e0b']
    });

    // Auto-print thermal slip if toggled
    if (autoPrint) {
      printReceipt({
        storeName: 'ग्रामीण किराना (हाट-बाजार)',
        date: new Date(timestamp).toLocaleDateString('hi-IN'),
        time: new Date(timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
        items: cart.map(it => ({
          name: it.product.hindiName || it.product.name,
          quantity: it.quantity,
          unit: it.product.unit,
          total: it.calculatedPrice
        })),
        total: cartTotal,
        paymentMode: 'नकद (हाट नकद)'
      });
    }

    // Show temporary change banner
    const currentChange = changeToReturn;
    setLastSaleBanner({ total: cartTotal, change: currentChange });
    setTimeout(() => setLastSaleBanner(null), 4000);

    // Reset for next customer immediately!
    setCart([]);
    setTenderCash(null);
  };

  // Keyboard shortcut: Spacebar or Enter to complete sale
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' && cart.length > 0 && !e.repeat) {
        handleCompleteHaatSale();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleCloseHaatSession = () => {
    const storeInfo = syncService.getStoreInfo();
    const storeName = storeInfo?.storeName || 'ग्रामीण किराना';
    const dateStr = new Date().toLocaleDateString('hi-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });

    let text = `🎪 *${storeName} - साप्ताहिक हाट-बाज़ार बिक्री सारांश*\n`;
    text += `📅 तारीख: ${dateStr} (${timeStr})\n`;
    text += `👥 कुल ग्राहक / बिल: ${todayHaatSales.length}\n`;
    text += `💵 कुल नकद बिक्री: ₹${totalHaatCash}\n`;
    text += `---------------------------\n`;
    text += `🙏 हाट सत्र संपन्न।`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleToggleTileSelection = (id?: string) => {
    if (!id) return;
    setTempTileIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        if (prev.length >= 12) {
          alert('आप अधिकतम 12 सामान ही चुन सकते हैं।');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleSaveTiles = () => {
    setCustomTileIds(tempTileIds);
    localStorage.setItem('gk_haat_custom_tiles', JSON.stringify(tempTileIds));
    setIsConfigureTilesOpen(false);
  };

  return (
    <div className="space-y-3 pb-24 md:pb-6">
      {/* Top Banner: Haat Live Cash Meter */}
      <div className="village-card p-3 sm:p-4 bg-linear-to-r from-amber-900 to-stone-900 text-white rounded-3xl shadow-md border border-amber-500/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-2xl border border-amber-400/30 text-xl sm:text-2xl">
              🎪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight m-0 text-amber-300">
                  {th.title}
                </h2>
                <span className="text-[10px] uppercase font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full animate-pulse">
                  हाई-स्पीड चालू
                </span>
              </div>
              <p className="text-[11px] text-stone-300 m-0 hidden sm:block">
                {th.subtitle}
              </p>
            </div>
          </div>

          {/* Live Cash Counter Badge & Haat Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setTempTileIds(customTileIds.length > 0 ? [...customTileIds] : haatFastItems.map(p => p.id || ''));
                setIsConfigureTilesOpen(true);
              }}
              className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              title="हाट स्क्रीन पर दिखने वाले 12 सामान बदलें"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>12 बटन बदलें</span>
            </button>

            <button
              type="button"
              onClick={handleCloseHaatSession}
              className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
              title="हाट का पूरा हिसाब व्हाट्सएप पर भेजें"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>सत्र सारांश</span>
            </button>

            <div className="bg-stone-950/70 border border-amber-400/40 px-3 py-1.5 rounded-xl text-right">
              <span className="text-[10px] text-stone-400 block leading-tight font-medium">
                {th.todayCash}
              </span>
              <span className="text-lg sm:text-xl font-black text-emerald-400">
                ₹{totalHaatCash}
              </span>
            </div>
            <div className="bg-stone-950/70 border border-amber-400/40 px-2.5 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-stone-400 block leading-tight font-medium">
                {th.todayBills}
              </span>
              <span className="text-lg sm:text-xl font-black text-amber-300">
                {todayHaatSales.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Temporary Previous Sale Notification Banner */}
      {lastSaleBanner && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-md border border-emerald-500 animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-200 shrink-0" />
            <span className="text-xs sm:text-sm font-bold">
              {th.billSuccess} (₹{lastSaleBanner.total})
            </span>
          </div>
          {lastSaleBanner.change > 0 && (
            <div className="text-xs sm:text-sm font-black bg-amber-400 text-stone-950 px-2.5 py-1 rounded-xl shadow-xs">
              वापस खुल्ला: ₹{lastSaleBanner.change}
            </div>
          )}
        </div>
      )}

      {/* Main Haat Grid: Large Touch Buttons on Left, Instant Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left Column: Top 12 Extra-Large Touch Tiles */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
            {haatFastItems.map(product => {
              const inCartItem = cart.find(c => c.product.id === product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => addItemToHaatCart(product)}
                  className={`village-card p-3 rounded-2xl text-left flex flex-col justify-between cursor-pointer transition-all active:scale-[0.96] min-h-[92px] sm:min-h-[105px] border-2 relative ${
                    inCartItem 
                      ? 'border-amber-500 bg-amber-50/70 shadow-sm ring-1 ring-amber-400/50' 
                      : 'border-stone-200 hover:border-amber-400/70 bg-white'
                  }`}
                >
                  {/* Cart count badge */}
                  {inCartItem && (
                    <span className="absolute -top-2 -right-2 bg-amber-700 text-white font-black text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                      {inCartItem.quantity}
                    </span>
                  )}

                  <div>
                    <span className="text-xs sm:text-sm font-black text-stone-950 leading-tight block line-clamp-2">
                      {language === 'hi' ? product.hindiName : product.name}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      प्रति {product.unit}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-200/80">
                    <span className="text-base sm:text-lg font-black text-amber-900">
                      ₹{product.sellingPrice}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-lg">
                      +1 जोड़ें
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Instant Cash Cart Pad */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <div className="village-card p-4 rounded-3xl border-2 border-amber-300/80 bg-white shadow-md flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-stone-200">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="font-black text-sm sm:text-base text-stone-950 m-0">
                  हाट चालू हिसाब ({cart.length})
                </h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => { setCart([]); setTenderCash(null); }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{th.clearCart}</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="py-2.5 min-h-[140px] max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-stone-400 space-y-1">
                  <div className="text-3xl">🛒</div>
                  <p className="text-xs font-semibold">बाईं ओर से सामान दबाएं</p>
                  <p className="text-[11px] text-stone-400">1-टैप में सीधे बिल बनता है</p>
                </div>
              ) : (
                cart.map(item => (
                  <div 
                    key={item.product.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="font-bold text-stone-900 truncate">
                        {language === 'hi' ? item.product.hindiName : item.product.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        ₹{item.product.sellingPrice} × {item.quantity}
                      </div>
                    </div>

                    {/* Plus / Minus Qty Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center font-black cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-black text-stone-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        className="w-6 h-6 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 flex items-center justify-center font-black cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="font-black text-stone-950 ml-2 w-12 text-right">
                        ₹{item.calculatedPrice}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Amount Display */}
            <div className="pt-3 border-t border-stone-200 space-y-2">
              <div className="flex items-center justify-between bg-amber-500/15 p-3 rounded-2xl border border-amber-500/30">
                <span className="font-black text-stone-800 text-sm">
                  कुल नकद देय:
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-950">
                  ₹{cartTotal}
                </span>
              </div>

              {/* Quick Cash Tender Presets */}
              {cartTotal > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-stone-600 block uppercase tracking-wider">
                    {th.quickTender}
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[cartTotal, 50, 100, 200, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTenderCash(amt)}
                        className={`py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                          tenderCash === amt
                            ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                            : 'bg-stone-100 text-stone-800 border-stone-300 hover:bg-stone-200'
                        }`}
                      >
                        {amt === cartTotal ? 'बराबर' : `₹${amt}`}
                      </button>
                    ))}
                    {tenderCash !== null && (
                      <button
                        type="button"
                        onClick={() => setTenderCash(null)}
                        className="py-1.5 rounded-lg text-xs font-bold text-stone-500 hover:text-stone-700 flex items-center justify-center cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Change to return alert */}
              {tenderCash !== null && tenderCash >= cartTotal && cartTotal > 0 && (
                <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">
                    {th.changeReturn}
                  </span>
                  <span className="text-lg font-black text-emerald-700">
                    ₹{changeToReturn}
                  </span>
                </div>
              )}

              {/* Auto Thermal Print Toggle */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={e => setAutoPrint(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <Printer className="w-3.5 h-3.5 text-stone-500" />
                  <span>{th.autoPrint}</span>
                </label>
              </div>

              {/* Big 1-Tap Cash Complete Button */}
              <button
                type="button"
                onClick={handleCompleteHaatSale}
                disabled={cart.length === 0}
                className={`w-full py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                  cart.length === 0
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white ring-2 ring-emerald-400/50 shadow-lg'
                }`}
              >
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                <span>{th.finishBill}{cartTotal})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Configure 12 Tiles Modal */}
      {isConfigureTilesOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-lg w-full shadow-2xl border border-amber-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-stone-950 text-base m-0">
                    हाट स्क्रीन के 12 बटन चुनें
                  </h3>
                  <p className="text-xs text-amber-800 font-bold m-0">
                    चुने हुए: {tempTileIds.length} / 12 सामान
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigureTilesOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter for products */}
            <div className="my-3">
              <input
                type="text"
                value={tileSearch}
                onChange={e => setTileSearch(e.target.value)}
                placeholder="सामान खोजें (उदा. गुड़, दाल, तेल)..."
                className="w-full p-2.5 bg-[#faf8f3] border border-amber-200 rounded-xl text-xs sm:text-sm font-semibold outline-hidden focus:border-amber-500"
              />
            </div>

            {/* Product Checkbox Selection List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh]">
              {products
                .filter(p => 
                  p.name.toLowerCase().includes(tileSearch.toLowerCase()) || 
                  p.hindiName.toLowerCase().includes(tileSearch.toLowerCase())
                )
                .map(p => {
                  const isChecked = !!p.id && tempTileIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleTileSelection(p.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-400/50' 
                          : 'bg-[#faf8f3] border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTileSelection(p.id)}
                          className="w-4 h-4 text-amber-600 rounded border-stone-300 pointer-events-none"
                        />
                        <div className="truncate">
                          <div className="text-xs sm:text-sm font-black text-stone-900 truncate">
                            {language === 'hi' ? p.hindiName : p.name}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {language === 'hi' ? p.name : p.hindiName} • स्टॉक: {p.stockQty} {p.unit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-emerald-800">
                          ₹{p.sellingPrice}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-stone-200 flex gap-2">
              <button
                type="button"
                onClick={() => setIsConfigureTilesOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveTiles}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-600 text-white cursor-pointer shadow-xs active:scale-95"
              >
                बटन सुरक्षित करें ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Quota Modal */}
      <DemoLimitModal
        isOpen={isDemoLimitOpen}
        onClose={() => setIsDemoLimitOpen(false)}
        onOpenRegister={() => setIsAuthModalOpen(true)}
        onOpenLogin={() => setIsAuthModalOpen(true)}
      />

      {/* Store Auth Modal */}
      <StoreAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

