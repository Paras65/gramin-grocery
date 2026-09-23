import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import { 
  Search, Trash2, CheckCircle, Share2, 
  CreditCard, Banknote, QrCode, ShoppingBag,
  ArrowRight, X, Scale, Printer, Scan, Plus
} from 'lucide-react';
import { db } from '../../db';
import type { CartItem, Customer, PaymentMode, Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { printReceipt } from '../../utils/thermalPrint';
import { generateQRCodeSVG, buildUpiPayUrl } from '../../utils/qrCode';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { DemoLimitModal } from '../Demo/DemoLimitModal';
import { StoreAuthModal } from '../Auth/StoreAuthModal';
import { syncService } from '../../services/syncService';
import { formatDate } from '../../utils/formatters';
import { openWhatsApp } from '../../utils/whatsapp';

interface QuickBillingProps {
  initialSearchQuery?: string;
  onSwitchToHaat?: () => void;
}

export const QuickBilling: React.FC<QuickBillingProps> = ({ initialSearchQuery = '', onSwitchToHaat }) => {
  const { language, t } = useLanguage();
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [activeLooseProduct, setActiveLooseProduct] = useState<Product | null>(null);
  const [selectedWeight, setSelectedWeight] = useState<number>(1);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState<boolean>(false);
  const [isDemoLimitOpen, setIsDemoLimitOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customQty, setCustomQty] = useState<string>('1');
  const [customUnit, setCustomUnit] = useState<string>('piece');
  const [saveCustomToCatalog, setSaveCustomToCatalog] = useState<boolean>(true);

  // Dynamic Market Rate States
  const [looseRate, setLooseRate] = useState<number | string>('');
  const [saveLooseRateToCatalog, setSaveLooseRateToCatalog] = useState<boolean>(false);
  const [editingCartRateIndex, setEditingCartRateIndex] = useState<number | null>(null);
  const [tempCartRate, setTempCartRate] = useState<string>('');
  const [saveCartRateToCatalog, setSaveCartRateToCatalog] = useState<boolean>(false);

  // Discount, Split Payment & Store UPI states
  const [discount, setDiscount] = useState<string>('');
  const [splitCashPaid, setSplitCashPaid] = useState<string>('');
  const [storeUpiId, setStoreUpiId] = useState<string>(() => localStorage.getItem('gk_store_upi_id') || '');
  const [isEditingUpi, setIsEditingUpi] = useState<boolean>(false);
  const [tempUpiInput, setTempUpiInput] = useState<string>('');

  // Completed bill receipt modal
  const [lastCompletedBill, setLastCompletedBill] = useState<{
    items: CartItem[];
    total: number;
    discount?: number;
    originalTotal?: number;
    paymentMode: PaymentMode;
    splitPayment?: { cash: number; udhaar: number };
    customer?: Customer;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Categories list with intuitive visual icons
  const categories = [
    { id: 'all', label: t.pos.allCategories, icon: '✨' },
    { id: 'staples', label: t.pos.categoryNames.staples, icon: '🌾' },
    { id: 'pulses', label: t.pos.categoryNames.pulses, icon: '🍲' },
    { id: 'oils', label: t.pos.categoryNames.oils, icon: '🪔' },
    { id: 'spices', label: t.pos.categoryNames.spices, icon: '🌶️' },
    { id: 'snacks', label: t.pos.categoryNames.snacks, icon: '🍪' },
    { id: 'hygiene', label: t.pos.categoryNames.hygiene, icon: '🧼' },
    { id: 'dairy', label: t.pos.categoryNames.dairy, icon: '🥛' },
    { id: 'rural_special', label: t.pos.categoryNames.rural_special, icon: '🌿' },
  ];

  // Desktop Alt+1..9 category shortcut keys for ultra-fast billing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key) - 1;
        if (categories[idx]) {
          e.preventDefault();
          setSelectedCategory(categories[idx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categories]);

  // Filtered products
  const filteredProducts = products.filter((p: Product) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.hindiName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Loose item weights presets (100g छटांक, 250g पाव, 500g आधा किलो, 1kg, 2kg, 5kg)
  const loosePresets = [
    { label: '100g (छटांक)', value: 0.1 },
    { label: '250g (पाव)', value: 0.25 },
    { label: '500g (आधा किलो)', value: 0.5 },
    { label: '1 kg (एक किलो)', value: 1.0 },
    { label: '2 kg', value: 2.0 },
    { label: '5 kg', value: 5.0 },
  ];

  const handleProductClick = (product: Product) => {
    if (product.isLoose) {
      setActiveLooseProduct(product);
      setLooseRate(product.sellingPrice);
      setSaveLooseRateToCatalog(false);
      setSelectedWeight(1.0);
    } else {
      addToCart(product, 1);
    }
  };

  const addToCart = (product: Product, qty: number, customRate?: number) => {
    const effectiveRate = customRate !== undefined ? customRate : product.sellingPrice;
    setCart(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        item.product.isLoose === product.isLoose &&
        (item.customRate === customRate || (item.customRate === undefined && customRate === undefined))
      );
      if (existingIndex > -1 && !product.isLoose) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + qty;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          calculatedPrice: Math.round(newQty * effectiveRate * 100) / 100
        };
        return updated;
      } else {
        const calculatedPrice = Math.round(qty * effectiveRate * 100) / 100;
        return [...prev, { product, quantity: qty, calculatedPrice, customRate }];
      }
    });
  };

  const confirmLooseAdd = async () => {
    if (activeLooseProduct && selectedWeight > 0) {
      const parsedRate = parseFloat(String(looseRate));
      const effectiveRate = !isNaN(parsedRate) && parsedRate > 0 ? parsedRate : activeLooseProduct.sellingPrice;

      if (saveLooseRateToCatalog && activeLooseProduct.id && effectiveRate !== activeLooseProduct.sellingPrice) {
        try {
          await db.products.update(activeLooseProduct.id, {
            sellingPrice: effectiveRate,
            updatedAt: new Date().toISOString()
          });
        } catch (err) {
          console.error('Failed to update catalog product sellingPrice:', err);
        }
      }

      addToCart(
        activeLooseProduct, 
        selectedWeight, 
        effectiveRate !== activeLooseProduct.sellingPrice ? effectiveRate : undefined
      );
      setActiveLooseProduct(null);
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customPrice);
    const qtyNum = parseFloat(customQty) || 1;
    if (!customName.trim() || isNaN(priceNum) || priceNum <= 0) return;

    const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
    const newProduct: Product = {
      id: prodId,
      name: customName.trim(),
      hindiName: customName.trim(),
      category: 'rural_special',
      purchasePrice: Math.round(priceNum * 0.8),
      sellingPrice: priceNum,
      stockQty: saveCustomToCatalog ? 25 : 0,
      unit: customUnit as 'kg' | 'g' | 'liter' | 'packet' | 'piece' | 'pouch',
      minStockThreshold: 5,
      isLoose: customUnit === 'kg',
    };

    if (saveCustomToCatalog) {
      await db.products.add(newProduct);
    }

    addToCart(newProduct, qtyNum);

    setIsCustomModalOpen(false);
    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
    setCustomUnit('piece');
  };

  const updateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      const effectiveRate = item.customRate !== undefined ? item.customRate : item.product.sellingPrice;
      const roundedQty = Math.round(newQty * 100) / 100;
      updated[index] = {
        ...item,
        quantity: roundedQty,
        calculatedPrice: Math.round(roundedQty * effectiveRate * 100) / 100
      };
      return updated;
    });
  };

  const handleUpdateCartItemRate = async (index: number, newRate: number, saveToCatalog: boolean) => {
    const item = cart[index];
    if (!item) return;

    setCart(prev => {
      const updated = [...prev];
      const current = updated[index];
      const roundedPrice = Math.round(current.quantity * newRate * 100) / 100;
      updated[index] = {
        ...current,
        customRate: newRate,
        calculatedPrice: roundedPrice
      };
      return updated;
    });

    if (saveToCatalog && item.product.id) {
      try {
        await db.products.update(item.product.id, {
          sellingPrice: newRate,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to update product rate in db:', err);
      }
    }
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const totalBillAmount = Math.round(cart.reduce((sum, item) => sum + item.calculatedPrice, 0) * 100) / 100;
  const discountAmount = Math.min(totalBillAmount, Math.max(0, parseFloat(discount) || 0));
  const finalBillAmount = Math.max(0, Math.round((totalBillAmount - discountAmount) * 100) / 100);
  const totalCartItemsCount = cart.reduce((sum, item) => sum + (item.product.isLoose ? 1 : item.quantity), 0);

  const parsedSplitCash = paymentMode === 'UDHAAR'
    ? Math.min(finalBillAmount, Math.max(0, parseFloat(splitCashPaid) || 0))
    : 0;
  const netUdhaarAmount = paymentMode === 'UDHAAR'
    ? Math.max(0, Math.round((finalBillAmount - parsedSplitCash) * 100) / 100)
    : 0;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentBalance = selectedCustomer?.balanceDue || 0;
  const projectedBalance = paymentMode === 'UDHAAR'
    ? Math.round((currentBalance + netUdhaarAmount) * 100) / 100
    : currentBalance;
  const customerCreditLimit = selectedCustomer?.creditLimit ?? 2000;
  const isCreditLimitExceeded = Boolean(
    paymentMode === 'UDHAAR' && 
    selectedCustomer && 
    projectedBalance > customerCreditLimit
  );

  // Save Store UPI ID inline
  const handleSaveStoreUpi = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleaned = tempUpiInput.trim();
    if (!cleaned || !cleaned.includes('@')) {
      alert('कृपया मान्य UPI ID दर्ज करें (उदा. 98261XXXXX@ybl या name@oksbi)');
      return;
    }
    localStorage.setItem('gk_store_upi_id', cleaned);
    setStoreUpiId(cleaned);
    setIsEditingUpi(false);
  };

  const handleFinishBill = async () => {
    if (cart.length === 0) return;

    if (await syncService.isDemoQuotaReached()) {
      setIsDemoLimitOpen(true);
      return;
    }

    if (paymentMode === 'UDHAAR') {
      if (!selectedCustomerId || !selectedCustomer) {
        alert(language === 'hi' ? 'कृपया उधार खाते के लिए ग्राहक चुनें!' : 'Please select a customer for Udhaar credit!');
        return;
      }

      if (isCreditLimitExceeded) {
        const excess = Math.round((projectedBalance - customerCreditLimit) * 100) / 100;
        const proceed = window.confirm(
          `⚠️ उधारी सीमा पार (Credit Limit Exceeded)!\n\n` +
          `ग्राहक: ${selectedCustomer.name}\n` +
          `वर्तमान उधारी: ₹${currentBalance}\n` +
          (parsedSplitCash > 0 ? `यह बिल: ₹${finalBillAmount} (₹${parsedSplitCash} नकद दिया, ₹${netUdhaarAmount} नया उधार)\n` : `यह बिल: ₹${finalBillAmount}\n`) +
          `नया बकाया होगा: ₹${projectedBalance}\n` +
          `स्वीकृत सीमा: ₹${customerCreditLimit}\n` +
          `(सीमा से ₹${excess} अधिक)\n\n` +
          `क्या आप फिर भी यह उधार बिल दर्ज करना चाहते हैं?`
        );
        if (!proceed) return;
      }
    }

    const timestamp = new Date().toISOString();
    const saleId = 'sale_' + Math.random().toString(36).substring(2, 9);
    const splitPaymentObj = (paymentMode === 'UDHAAR' && parsedSplitCash > 0)
      ? { cash: parsedSplitCash, udhaar: netUdhaarAmount }
      : undefined;

    // Atomic multi-table ACID transaction
    await db.transaction('rw', [db.sales, db.customers, db.transactions, db.products], async () => {
      await db.sales.add({
        id: saleId,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer?.name,
        items: cart.map(it => ({
          productId: it.product.id,
          name: it.product.name,
          hindiName: it.product.hindiName,
          quantity: it.quantity,
          unit: it.product.unit,
          unitPrice: it.customRate !== undefined ? it.customRate : it.product.sellingPrice,
          total: it.calculatedPrice,
        })),
        totalAmount: finalBillAmount,
        discount: discountAmount > 0 ? discountAmount : undefined,
        paymentMode,
        splitPayment: splitPaymentObj,
        timestamp
      });

      if (paymentMode === 'UDHAAR' && selectedCustomer && selectedCustomer.id) {
        await db.customers.update(selectedCustomer.id, {
          balanceDue: projectedBalance,
          updatedAt: timestamp
        });

        const itemsSummary = cart.map(it => `${it.product.hindiName || it.product.name} (${it.quantity}${it.product.unit}${it.customRate !== undefined ? ` @₹${it.customRate}` : ''})`).join(', ');
        
        let txnNote = 'दुकान बिल खरीदारी';
        if (parsedSplitCash > 0) {
          txnNote = `दुकान बिल (₹${parsedSplitCash} नकद जमा, ₹${netUdhaarAmount} उधार)`;
        } else if (discountAmount > 0) {
          txnNote = `दुकान बिल खरीदारी (₹${discountAmount} छूट लागू)`;
        }

        await db.transactions.add({
          id: 'txn_' + Math.random().toString(36).substring(2, 9),
          customerId: selectedCustomer.id,
          type: 'UDHAAR',
          amount: netUdhaarAmount,
          timestamp,
          note: txnNote,
          billItemsSummary: itemsSummary
        });
      }

      for (const item of cart) {
        if (item.product.id) {
          const currentProd = await db.products.get(item.product.id);
          if (currentProd) {
            const updatedStock = Math.max(0, currentProd.stockQty - item.quantity);
            await db.products.update(item.product.id, { stockQty: Math.round(updatedStock * 100) / 100 });
          }
        }
      }
    });

    try {
      confetti({
        particleCount: 45,
        spread: 55,
        origin: { y: 0.8 }
      });
    } catch (_) {}

    setLastCompletedBill({
      items: [...cart],
      total: finalBillAmount,
      originalTotal: totalBillAmount,
      discount: discountAmount > 0 ? discountAmount : undefined,
      paymentMode,
      splitPayment: splitPaymentObj,
      customer: selectedCustomer,
      timestamp
    });

    setCart([]);
    setDiscount('');
    setSplitCashPaid('');
    setSelectedCustomerId('');
    setPaymentMode('CASH');
    setIsMobileCartOpen(false);
  };

  const generateWhatsAppShare = () => {
    if (!lastCompletedBill) return;
    const { items, total, originalTotal, discount: billDiscount, paymentMode, customer, timestamp } = lastCompletedBill;

    const dateStr = formatDate(timestamp, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let text = `🛒 *ग्रामीण किराना स्टोर - बिल पर्ची*\n`;
    text += `📅 तारीख: ${dateStr}\n`;
    if (customer) {
      text += `👤 ग्राहक: ${customer.name} (${customer.para})\n`;
    }
    text += `---------------------------\n`;
    items.forEach((it, idx) => {
      const rate = it.customRate !== undefined ? it.customRate : it.product.sellingPrice;
      text += `${idx + 1}. ${it.product.hindiName || it.product.name} - ${it.quantity} ${it.product.unit} (@₹${rate}) = ₹${it.calculatedPrice}\n`;
    });
    text += `---------------------------\n`;
    if (billDiscount && billDiscount > 0) {
      text += `📦 सकल मूल्य: ₹${originalTotal || (total + billDiscount)}\n`;
      text += `🎁 छूट / बट्टा: -₹${billDiscount}\n`;
    }
    text += `💰 *कुल देय योग: ₹${total}*\n`;
    text += `💳 भुगतान: ${paymentMode === 'CASH' ? 'नकद (Cash)' : paymentMode === 'UDHAAR' ? 'उधार खाता (Credit)' : 'ऑनलाइन (UPI)'}\n`;

    if (paymentMode === 'UDHAAR' && customer) {
      if (lastCompletedBill.splitPayment && lastCompletedBill.splitPayment.cash > 0) {
        text += `💵 नकद भुगतान प्राप्त: ₹${lastCompletedBill.splitPayment.cash}\n`;
        text += `📝 खाते में शेष उधार: ₹${lastCompletedBill.splitPayment.udhaar}\n`;
      }
      const addedToBalance = lastCompletedBill.splitPayment ? lastCompletedBill.splitPayment.udhaar : total;
      text += `⚠️ *खाते में कुल बकाया: ₹${customer.balanceDue + addedToBalance}*\n`;
    }
    text += `🙏 धन्यवाद! फिर पधारें।`;

    if (!syncService.isLoggedIn()) {
      text += `\n---------------------------\n⚠️ *[नमूना बिल / DEMO]* अपनी दुकान जोड़ने हेतु ऐप में मुफ़्त रजिस्टर करें।`;
    }

    openWhatsApp(customer?.phone, text);
  };

  // Reusable Cart Content Component (Used in desktop column and mobile bottom sheet)
  const renderCartContent = (isMobileSheet = false) => (
    <div className={`flex flex-col ${isMobileSheet ? 'h-full' : 'h-[calc(100vh-140px)]'}`}>
      {/* Cart Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-amber-600" />
          <h2 className="font-black text-base text-stone-900 m-0">
            {t.pos.cartTitle}
          </h2>
          {cart.length > 0 && (
            <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.length} प्रकार
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-rose-700 hover:text-rose-800 flex items-center gap-1 font-bold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.pos.clearCart}</span>
            </button>
          )}
          {isMobileSheet && (
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="p-1 rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-2 pr-1">
        {cart.some(it => it.product.stockQty <= 0) && (
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-950 font-bold flex items-center gap-1.5">
            <span>⚠️</span>
            <span>कुछ सामान का स्टॉक 0 है — क्या नया माल आया है?</span>
          </div>
        )}
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <ShoppingBag className="w-12 h-12 text-stone-300 stroke-[1.5] mb-2" />
            <p className="text-xs sm:text-sm font-medium">{t.pos.emptyCart}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">सामान पर क्लिक करके बिल में जोड़ें</p>
          </div>
        ) : (
          cart.map((item, idx) => (
            <div
              key={`${item.product.id}-${idx}`}
              className="p-2.5 rounded-xl bg-[#faf8f3] border border-amber-200/50 flex flex-col gap-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                      {language === 'hi' ? item.product.hindiName : item.product.name}
                    </span>
                    {item.product.stockQty <= 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0" title="स्टॉक में 0 है — अतिरिक्त बिक्री">
                        ⚠️ 0 स्टॉक
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[11px] text-stone-600 font-medium">
                      ₹{item.customRate !== undefined ? item.customRate : item.product.sellingPrice} /{item.product.unit}
                    </span>
                    {item.customRate !== undefined && item.customRate !== item.product.sellingPrice && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                        नया भाव
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (editingCartRateIndex === idx) {
                          setEditingCartRateIndex(null);
                        } else {
                          setEditingCartRateIndex(idx);
                          setTempCartRate(String(item.customRate !== undefined ? item.customRate : item.product.sellingPrice));
                          setSaveCartRateToCatalog(false);
                        }
                      }}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                      title="दर बदलें"
                    >
                      {editingCartRateIndex === idx ? 'बंद करें ✕' : '✏️ भाव बदलें'}
                    </button>
                  </div>
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQty(idx, item.quantity - (item.product.isLoose ? 0.25 : 1))}
                    className="w-7 h-7 rounded-lg bg-stone-200/90 hover:bg-stone-300 flex items-center justify-center font-black text-stone-800 text-sm cursor-pointer active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="text-xs font-black text-stone-900 w-14 text-center">
                    {item.quantity} {item.product.unit}
                  </span>
                  <button
                    onClick={() => updateCartQty(idx, item.quantity + (item.product.isLoose ? 0.25 : 1))}
                    className="w-7 h-7 rounded-lg bg-stone-200/90 hover:bg-stone-300 flex items-center justify-center font-black text-stone-800 text-sm cursor-pointer active:scale-95"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* Price */}
                <div className="text-right min-w-[55px]">
                  <div className="font-black text-stone-950 text-sm">
                    ₹{item.calculatedPrice}
                  </div>
                </div>

                <button
                  onClick={() => removeFromCart(idx)}
                  className="text-stone-400 hover:text-rose-600 p-1 cursor-pointer"
                  title="हटाएं"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Rate Editor */}
              {editingCartRateIndex === idx && (
                <div className="p-2 bg-amber-50 rounded-xl border border-amber-300/80 space-y-1.5 animate-fade-in text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-stone-700 text-[11px]">
                      {t.pos.todayRate || 'आज का भाव'} (₹/{item.product.unit}):
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-black text-stone-700">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        autoFocus
                        value={tempCartRate}
                        onChange={e => setTempCartRate(e.target.value)}
                        className="w-20 p-1 bg-white border border-amber-400 rounded-lg font-black text-amber-950 text-right outline-hidden focus:border-amber-600 shadow-2xs"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-amber-950 select-none">
                    <input
                      type="checkbox"
                      checked={saveCartRateToCatalog}
                      onChange={e => setSaveCartRateToCatalog(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 scale-90"
                    />
                    <span>💾 {t.pos.saveToCatalog || 'आगे के लिए भी सुरक्षित करें'}</span>
                  </label>
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setEditingCartRateIndex(null)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                    >
                      रद्द
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const parsed = parseFloat(tempCartRate);
                        if (!isNaN(parsed) && parsed > 0) {
                          await handleUpdateCartItemRate(idx, parsed, saveCartRateToCatalog);
                        }
                        setEditingCartRateIndex(null);
                      }}
                      className="px-2.5 py-0.5 text-[10px] font-black rounded-md bg-emerald-700 text-white hover:bg-emerald-600 cursor-pointer shadow-2xs"
                    >
                      लागू करें ✓
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bill Summary & Payment Controls */}
      <div className="pt-3 border-t border-stone-200 space-y-3 shrink-0">
        {/* Bill Discount & Quick Round-Off */}
        {cart.length > 0 && (
          <div className="bg-[#faf8f3] p-2.5 rounded-xl border border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
                <span>🏷️ छूट / बट्टा (Discount):</span>
                {discountAmount > 0 && (
                  <span className="text-rose-700 font-black text-xs">-₹{discountAmount}</span>
                )}
              </span>
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscount('')}
                  className="text-[10px] text-stone-500 hover:text-rose-700 font-bold underline cursor-pointer"
                >
                  छूट हटाएं (₹0)
                </button>
              )}
            </div>

            {/* Quick Round-Off Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {totalBillAmount % 1 !== 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const change = Math.round((totalBillAmount % 1) * 100) / 100;
                    setDiscount(String(change));
                  }}
                  className="text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-1 rounded-lg cursor-pointer active:scale-95 transition-all"
                  title="सिक्के छोड़कर पूरा रुपया बनाएं"
                >
                  🪙 सिक्के छोड़ें (-₹{(Math.round((totalBillAmount % 1) * 100) / 100).toFixed(2)})
                </button>
              )}
              {[1, 2, 5].map(amt => {
                if (totalBillAmount <= amt) return null;
                const isSelected = discountAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiscount(isSelected ? '' : String(amt))}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer active:scale-95 transition-all ${
                      isSelected
                        ? 'bg-amber-700 text-white border-amber-800 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-50'
                    }`}
                  >
                    -₹{amt}
                  </button>
                );
              })}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-stone-500 font-semibold">अन्य ₹:</span>
                <input
                  type="number"
                  min="0"
                  max={totalBillAmount}
                  step="any"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-16 p-1 text-xs bg-white border border-stone-300 rounded-lg text-right font-black text-amber-900 outline-hidden focus:border-amber-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Total Display */}
        <div className="bg-amber-500/10 px-3.5 py-2.5 rounded-xl border border-amber-500/30">
          {discountAmount > 0 ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-stone-600 font-semibold">
                <span>सकल सामान मूल्य:</span>
                <span>₹{totalBillAmount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-rose-700 font-bold">
                <span>छूट / बट्टा लागू:</span>
                <span>-₹{discountAmount}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-200">
                <span className="font-bold text-stone-900 text-xs sm:text-sm">
                  {t.pos.totalPayable} (Net):
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-950">
                  ₹{finalBillAmount}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-800 text-xs sm:text-sm">
                {t.pos.totalPayable}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-900">
                ₹{finalBillAmount}
              </span>
            </div>
          )}
        </div>

        {/* Payment Mode Selector */}
        <div>
          <label className="text-[11px] font-bold text-stone-600 block mb-1.5 uppercase tracking-wider">
            {t.pos.paymentMode}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMode('CASH')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border cursor-pointer transition-all ${
                paymentMode === 'CASH'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-400/40'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{t.pos.cash}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('UDHAAR')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border cursor-pointer transition-all ${
                paymentMode === 'UDHAAR'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-1 ring-rose-400/40'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{t.pos.udhaar}</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('UPI')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border cursor-pointer transition-all ${
                paymentMode === 'UPI'
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs ring-1 ring-indigo-400/40'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>{t.pos.upi}</span>
            </button>
          </div>
        </div>

        {/* Customer Select Dropdown (For Udhaar or UPI tracking) */}
        {(paymentMode === 'UDHAAR' || paymentMode === 'UPI') && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
              <span>{t.pos.selectCustomer}:</span>
              {paymentMode === 'UDHAAR' && (
                <span className="text-[10px] text-rose-600 font-bold">* जरूरी है</span>
              )}
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2 text-xs font-semibold text-stone-900 outline-hidden focus:border-amber-500"
            >
              <option value="">-- ग्राहक चुनें / Select Customer --</option>
              {customers.map((c: Customer) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.para}) - बकाया: ₹{c.balanceDue} | सीमा: ₹{c.creditLimit ?? 2000}
                </option>
              ))}
            </select>

            {/* Udhaar Credit Limit Guard Indicator */}
            {paymentMode === 'UDHAAR' && selectedCustomer && (
              <div className={`p-2 rounded-xl text-xs border ${
                isCreditLimitExceeded 
                  ? 'bg-rose-50 border-rose-300 text-rose-950' 
                  : 'bg-[#faf8f3] border-amber-200/80 text-stone-700'
              }`}>
                <div className="flex items-center justify-between text-[11px]">
                  <span>वर्तमान बकाया: <b>₹{currentBalance}</b></span>
                  <span>उधारी सीमा: <b>₹{customerCreditLimit}</b></span>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-stone-200/60 font-bold">
                  <span>नया बकाया होगा:</span>
                  <span className={isCreditLimitExceeded ? 'text-rose-700 font-black' : 'text-stone-900 font-black'}>
                    ₹{projectedBalance}
                  </span>
                </div>
                {isCreditLimitExceeded && (
                  <div className="mt-1 pt-1 border-t border-rose-200 text-[10px] text-rose-800 font-black flex items-center gap-1">
                    <span>⚠️ उधारी सीमा से ₹{Math.round((projectedBalance - customerCreditLimit) * 100) / 100} अधिक! बिल पूरा करने पर पुष्टि ली जाएगी।</span>
                  </div>
                )}
              </div>
            )}

            {/* Split Payment Section (Partial Cash + Partial Udhaar) */}
            {paymentMode === 'UDHAAR' && selectedCustomer && (
              <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                    <span>💵 नकद भुगतान अभी (Split Cash):</span>
                  </span>
                  {parsedSplitCash > 0 && (
                    <button
                      type="button"
                      onClick={() => setSplitCashPaid('')}
                      className="text-[10px] text-amber-800 hover:text-rose-700 underline font-bold cursor-pointer"
                    >
                      पूरा उधार (₹0 नकद)
                    </button>
                  )}
                </div>

                {/* Quick Split Cash Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {finalBillAmount >= 200 && (
                    <button
                      type="button"
                      onClick={() => setSplitCashPaid(String(Math.floor(finalBillAmount / 2)))}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer active:scale-95 transition-all ${
                        parsedSplitCash === Math.floor(finalBillAmount / 2)
                          ? 'bg-amber-700 text-white border-amber-800'
                          : 'bg-white text-stone-700 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      आधा (₹{Math.floor(finalBillAmount / 2)})
                    </button>
                  )}
                  {[100, 200, 500].filter(amt => amt < finalBillAmount).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSplitCashPaid(parsedSplitCash === amt ? '' : String(amt))}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer active:scale-95 transition-all ${
                        parsedSplitCash === amt
                          ? 'bg-amber-700 text-white border-amber-800'
                          : 'bg-white text-stone-700 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] text-stone-600 font-semibold">नकद ₹:</span>
                    <input
                      type="number"
                      min="0"
                      max={finalBillAmount}
                      step="any"
                      value={splitCashPaid}
                      onChange={e => setSplitCashPaid(e.target.value)}
                      placeholder="0"
                      className="w-20 p-1 text-xs bg-white border border-stone-300 rounded-lg text-right font-black text-emerald-900 outline-hidden focus:border-amber-600"
                    />
                  </div>
                </div>

                {parsedSplitCash > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-amber-200 text-[11px] font-black">
                    <span className="text-emerald-800">नकद मिला: ₹{parsedSplitCash}</span>
                    <span className="text-rose-800">खाते में उधार: ₹{netUdhaarAmount}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dynamic Offline UPI QR Code Card */}
        {paymentMode === 'UPI' && (
          <div className="p-3 bg-white rounded-2xl border border-indigo-200 shadow-xs space-y-2">
            {storeUpiId && !isEditingUpi ? (
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1 text-[11px] font-black text-indigo-900">
                    <QrCode className="w-3.5 h-3.5 text-indigo-700" />
                    <span>PhonePe / GPay / Paytm QR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTempUpiInput(storeUpiId);
                      setIsEditingUpi(true);
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer underline"
                  >
                    बदलें ✏️
                  </button>
                </div>

                {/* QR Code SVG */}
                <div
                  className="p-2 bg-white rounded-xl border border-indigo-100 shadow-2xs flex items-center justify-center my-1"
                  dangerouslySetInnerHTML={{
                    __html: generateQRCodeSVG(
                      buildUpiPayUrl(
                        storeUpiId,
                        syncService.getStoreInfo()?.storeName || 'ग्रामीण किराना',
                        finalBillAmount
                      ),
                      140
                    )
                  }}
                />

                <div className="mt-1 text-center">
                  <div className="text-xs font-black text-indigo-950">
                    ग्राहक से <span className="text-emerald-700 text-sm font-black">₹{finalBillAmount}</span> स्कैन कराएं
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium">
                    UPI: <span className="font-semibold text-stone-700">{storeUpiId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-1">
                  <span>📱</span>
                  <span>दुकानदार की UPI ID (PhonePe/GPay) दर्ज करें:</span>
                </div>
                <p className="text-[10px] text-stone-500 m-0">
                  UPI ID डालते ही ग्राहक के लिए ₹{finalBillAmount} का स्वचालित QR कोड बन जाएगा।
                </p>
                <form onSubmit={handleSaveStoreUpi} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    required
                    value={tempUpiInput}
                    onChange={e => setTempUpiInput(e.target.value)}
                    placeholder="उदा. 98261XXXXX@ybl"
                    className="flex-1 p-2 bg-[#faf8f3] border border-stone-300 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs px-3 py-2 rounded-xl cursor-pointer"
                  >
                    सुरक्षित करें
                  </button>
                  {storeUpiId && isEditingUpi && (
                    <button
                      type="button"
                      onClick={() => setIsEditingUpi(false)}
                      className="bg-stone-100 text-stone-600 text-xs px-2 rounded-xl"
                    >
                      रद्द
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* Submit Bill Button */}
        <button
          onClick={handleFinishBill}
          disabled={cart.length === 0}
          className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.99] cursor-pointer ${
            cart.length === 0
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white ring-1 ring-emerald-400/40'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>
            {t.pos.finishBill} (₹{finalBillAmount})
            {paymentMode === 'UDHAAR' && parsedSplitCash > 0 ? ` [₹${parsedSplitCash} नकद + ₹${netUdhaarAmount} उधार]` : ''}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column: Product Selection Grid (7 cols on desktop, full width on mobile/tablet) */}
      <div className="lg:col-span-7 space-y-3">
        {/* Search Bar & Quick Clear */}
        {/* Search Bar & Barcode Scanner Button */}
        <div className="village-card p-2 rounded-2xl flex items-center gap-2 bg-white">
          <Search className="w-5 h-5 text-stone-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.pos.searchPlaceholder}
            className="w-full bg-transparent border-none outline-hidden text-sm sm:text-base text-stone-900 placeholder:text-stone-400 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-1 rounded-lg font-semibold cursor-pointer shrink-0"
            >
              हटाएं
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (searchQuery.trim()) {
                setCustomName(searchQuery.trim());
              }
              setIsCustomModalOpen(true);
            }}
            className="bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-950 border border-amber-300/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 transition-all"
            title="दुकान का कोई भी खुला या अन्य सामान सीधे बिल में जोड़ें"
          >
            <Plus className="w-4 h-4 text-amber-800" />
            <span className="hidden sm:inline">सामान</span>
          </button>
          <button
            type="button"
            onClick={() => setIsBarcodeScannerOpen(true)}
            className="bg-amber-100 hover:bg-amber-200 active:scale-95 text-amber-900 border border-amber-300/80 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            title="कैमरा बारकोड स्कैनर (Barcode Scanner)"
          >
            <Scan className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">बारकोड</span>
          </button>
          {onSwitchToHaat && (
            <button
              type="button"
              onClick={onSwitchToHaat}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-xs transition-all"
              title="साप्ताहिक हाट-बाजार मोड चालू करें"
            >
              <span>🎪</span>
              <span className="hidden sm:inline">हाट मोड</span>
            </button>
          )}
        </div>

        {/* Categories Grid Matrix (Zero-Scroll 3-Col Mobile, 5-Col Desktop) */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-1.5">
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors text-center ${
                selectedCategory === cat.id
                  ? 'bg-amber-700 text-white shadow-xs ring-1 ring-amber-400/50'
                  : 'bg-white text-stone-700 border border-stone-200/90 hover:bg-amber-50/60'
              }`}
              title={`${cat.label} (Alt + ${idx + 1})`}
            >
              <span className="text-xs shrink-0">{cat.icon}</span>
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Product Grid: 2 cols on mobile, 3 cols on tablet/desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[calc(100vh-270px)] lg:max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
          {filteredProducts.map((product: Product) => {
            const isLow = product.stockQty <= product.minStockThreshold;
            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`village-card p-3 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between relative active:scale-[0.98] ${
                  isLow ? 'border-amber-300' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-bold text-stone-950 text-sm leading-snug line-clamp-1">
                      {language === 'hi' ? product.hindiName : product.name}
                    </span>
                    {product.isLoose ? (
                      <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                        खुला
                      </span>
                    ) : (
                      <span className="text-[10px] bg-stone-100 text-stone-600 font-medium px-1 rounded shrink-0">
                        पैक
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {language === 'hi' ? product.name : product.hindiName}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-1.5 border-t border-stone-100">
                  <div className="text-emerald-800 font-black text-base sm:text-lg tracking-tight">
                    ₹{product.sellingPrice}
                    <span className="text-[10px] font-normal text-stone-500">/{product.unit}</span>
                  </div>
                  <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isLow ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-100 text-stone-600'
                  }`}>
                    स्टॉक: {product.stockQty}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-2 sm:col-span-3 text-center py-10 px-4 bg-white/80 rounded-3xl border border-dashed border-amber-300 shadow-2xs">
              <p className="text-sm font-black text-stone-800 m-0">
                {searchQuery ? `'${searchQuery}' नाम का कोई सामान नहीं मिला` : 'इस श्रेणी में कोई सामान नहीं है'}
              </p>
              <p className="text-xs text-stone-500 mt-1 mb-3">
                आप इसे तुरंत बिल में जोड़ सकते हैं और चाहें तो दुकान स्टॉक में भी हमेशा के लिए सुरक्षित रख सकते हैं।
              </p>
              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) setCustomName(searchQuery.trim());
                  setIsCustomModalOpen(true);
                }}
                className="bg-amber-700 hover:bg-amber-800 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया / खुला सामान तुरंत बिल में जोड़ें</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active Cart / Bill (Visible on Desktop / Tablets >= lg) */}
      <div className="hidden lg:block lg:col-span-5">
        <div className="village-card rounded-2xl p-4 sticky top-16 bg-white">
          {renderCartContent(false)}
        </div>
      </div>

      {/* Mobile Floating Bottom Cart Pill (Visible on phones & tablets when cart has items) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-fade-in">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-stone-950 text-white p-3 rounded-2xl shadow-xl border border-amber-500/50 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-500 text-stone-950 font-black text-xs px-2.5 py-1 rounded-xl">
                {totalCartItemsCount} सामान
              </div>
              <div className="text-left">
                <div className="text-[10px] text-stone-400 font-medium">कुल बिल</div>
                <div className="text-base font-black text-amber-400 leading-tight">
                  ₹{finalBillAmount}
                  {discountAmount > 0 && (
                    <span className="text-[10px] text-rose-300 font-bold ml-1">
                      (-₹{discountAmount})
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs">
              <span>बिल देखें</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Bottom Sheet / Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex flex-col justify-end p-2 sm:p-4">
          <div className="bg-white rounded-3xl p-4 max-h-[85vh] flex flex-col shadow-2xl border border-amber-300 animate-slide-up">
            {renderCartContent(true)}
          </div>
        </div>
      )}

      {/* Loose Item Weight Selector Modal */}
      {activeLooseProduct && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="font-black text-stone-950 text-base m-0">
                  {language === 'hi' ? activeLooseProduct.hindiName : activeLooseProduct.name}
                </h3>
              </div>
              <button 
                onClick={() => setActiveLooseProduct(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Dynamic Market Rate for Loose Item */}
            <div className="bg-[#faf8f3] p-2.5 rounded-2xl border border-amber-200/80 mb-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                  <span>🏷️ {t.pos.todayRate || 'आज का भाव'}:</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-stone-700">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={looseRate}
                    onChange={e => setLooseRate(e.target.value)}
                    className="w-20 p-1.5 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-black text-amber-950 text-right outline-hidden focus:border-amber-500 shadow-2xs"
                  />
                  <span className="text-xs font-bold text-stone-600">/{activeLooseProduct.unit}</span>
                </div>
              </div>

              {Number(looseRate) > 0 && Number(looseRate) !== activeLooseProduct.sellingPrice && (
                <label className="flex items-center gap-2 pt-1.5 border-t border-amber-200/60 cursor-pointer text-[11px] font-bold text-amber-950 select-none">
                  <input
                    type="checkbox"
                    checked={saveLooseRateToCatalog}
                    onChange={e => setSaveLooseRateToCatalog(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 scale-95"
                  />
                  <span>💾 {t.pos.saveToCatalog || 'आगे के लिए भी नया भाव सुरक्षित करें'}</span>
                </label>
              )}
            </div>

            <label className="text-xs font-bold text-stone-700 block mb-2">
              {t.pos.looseSelector}
            </label>

            {/* Brass Weight Preset Tokens */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {loosePresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setSelectedWeight(preset.value)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                    selectedWeight === preset.value
                      ? 'bg-amber-700 text-white border-amber-700 shadow-xs ring-1 ring-amber-400/50'
                      : 'bg-[#faf8f3] text-stone-800 border-amber-200/60 hover:bg-amber-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Weight / Number Input */}
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                अन्य वजन (वजन लिखें):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={selectedWeight}
                  onChange={e => setSelectedWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-xl text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                />
                <span className="text-xs font-bold text-stone-600">{activeLooseProduct.unit}</span>
              </div>
            </div>

            {/* Price Preview Box */}
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-600 font-medium">तय वजन:</span>
                <div className="font-black text-stone-900 text-sm">{selectedWeight} {activeLooseProduct.unit}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-600 font-medium">कुल कीमत:</span>
                <div className="font-black text-emerald-800 text-lg">
                  ₹{Math.round(selectedWeight * (Number(looseRate) > 0 ? Number(looseRate) : activeLooseProduct.sellingPrice) * 100) / 100}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveLooseProduct(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={confirmLooseAdd}
                className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-700 text-white hover:bg-emerald-600 shadow-sm cursor-pointer"
              >
                बिल में जोड़ें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bill Receipt & WhatsApp Modal */}
      {lastCompletedBill && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm sm:max-w-md w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-stone-950 text-base m-0">
                  {t.pos.billSuccess}
                </h3>
              </div>
              <button
                onClick={() => setLastCompletedBill(null)}
                className="text-stone-400 hover:text-stone-700 p-1 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bill Preview Content */}
            <div className="my-3 bg-[#faf8f3] p-3.5 rounded-2xl text-xs space-y-2 border border-amber-200/60">
              {lastCompletedBill.customer && (
                <div className="font-bold text-stone-900 pb-1.5 border-b border-stone-200 flex justify-between">
                  <span>ग्राहक: {lastCompletedBill.customer.name}</span>
                  <span className="text-stone-600 font-medium">{lastCompletedBill.customer.para}</span>
                </div>
              )}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {lastCompletedBill.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-stone-800">
                    <span>
                      {it.product.hindiName || it.product.name} ({it.quantity} {it.product.unit}
                      {it.customRate !== undefined ? ` @₹${it.customRate}` : ''})
                    </span>
                    <span className="font-bold">₹{it.calculatedPrice}</span>
                  </div>
                ))}
              </div>
              {lastCompletedBill.discount && lastCompletedBill.discount > 0 ? (
                <div className="pt-2 border-t border-stone-200 space-y-1">
                  <div className="flex justify-between text-stone-600 font-medium">
                    <span>सकल सामान मूल्य:</span>
                    <span>₹{lastCompletedBill.originalTotal || (lastCompletedBill.total + lastCompletedBill.discount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>छूट / बट्टा:</span>
                    <span>-₹{lastCompletedBill.discount}</span>
                  </div>
                  <div className="flex justify-between font-black text-stone-950 text-base pt-1 border-t border-stone-200">
                    <span>कुल भुगतान:</span>
                    <span className="text-emerald-800">₹{lastCompletedBill.total}</span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-stone-200 flex justify-between font-black text-stone-950 text-base">
                  <span>कुल भुगतान:</span>
                  <span className="text-emerald-800">₹{lastCompletedBill.total}</span>
                </div>
              )}
              {lastCompletedBill.splitPayment && lastCompletedBill.splitPayment.cash > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs font-bold space-y-1">
                  <div className="flex justify-between text-emerald-800">
                    <span>💵 नकद भुगतान:</span>
                    <span>₹{lastCompletedBill.splitPayment.cash}</span>
                  </div>
                  <div className="flex justify-between text-rose-800">
                    <span>📝 खाते में उधार दर्ज:</span>
                    <span>₹{lastCompletedBill.splitPayment.udhaar}</span>
                  </div>
                </div>
              )}
              <div className="text-[11px] text-stone-500 font-medium">
                भुगतान माध्यम: {lastCompletedBill.paymentMode === 'CASH' ? 'नकद (Cash)' : lastCompletedBill.paymentMode === 'UDHAAR' ? (lastCompletedBill.splitPayment && lastCompletedBill.splitPayment.cash > 0 ? `मिश्रित भुगतान (₹${lastCompletedBill.splitPayment.cash} नकद + ₹${lastCompletedBill.splitPayment.udhaar} उधार)` : 'उधार खाता (Credit)') : 'ऑनलाइन (UPI)'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                onClick={generateWhatsAppShare}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.pos.printShare}</span>
              </button>

              <button
                onClick={async () => {
                  if (!lastCompletedBill) return;
                  const store = syncService.getStoreInfo();
                  await printReceipt({
                    storeName: store?.storeName || (store as any)?.name || 'ग्रामीण किराना',
                    storeAddress: store?.village ? `गाँव: ${store.village}` : undefined,
                    date: new Date(lastCompletedBill.timestamp).toLocaleDateString('hi-IN'),
                    time: new Date(lastCompletedBill.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
                    items: lastCompletedBill.items.map(it => ({
                      name: it.product.hindiName || it.product.name,
                      quantity: it.quantity,
                      unit: it.product.unit,
                      total: it.calculatedPrice,
                    })),
                    total: lastCompletedBill.total,
                    discount: lastCompletedBill.discount,
                    originalTotal: lastCompletedBill.originalTotal,
                    paymentMode: lastCompletedBill.paymentMode === 'CASH' ? 'नकद (Cash)' : lastCompletedBill.paymentMode === 'UDHAAR' ? 'उधार (Credit)' : 'ऑनलाइन (UPI)',
                    splitCash: lastCompletedBill.splitPayment?.cash,
                    splitUdhaar: lastCompletedBill.splitPayment?.udhaar,
                    customerName: lastCompletedBill.customer?.name,
                    oldBalance: lastCompletedBill.customer?.balanceDue,
                    newBalance: lastCompletedBill.customer ? (lastCompletedBill.paymentMode === 'UDHAAR' ? lastCompletedBill.customer.balanceDue + (lastCompletedBill.splitPayment ? lastCompletedBill.splitPayment.udhaar : lastCompletedBill.total) : lastCompletedBill.customer.balanceDue) : undefined,
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>🖨️ पर्ची प्रिंट करें (58mm / BT)</span>
              </button>

              <button
                onClick={() => setLastCompletedBill(null)}
                className="w-full py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer"
              >
                नया बिल शुरू करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onProductScanned={(scannedProduct) => {
          handleProductClick(scannedProduct);
        }}
      />

      {/* Demo Quota Reached Modal */}
      <DemoLimitModal
        isOpen={isDemoLimitOpen}
        onClose={() => setIsDemoLimitOpen(false)}
        onOpenRegister={() => setIsAuthModalOpen(true)}
        onOpenLogin={() => setIsAuthModalOpen(true)}
      />

      {/* Ad-Hoc / Custom Item Modal */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-black text-stone-950 text-base m-0">
                  सामान सीधे बिल में जोड़ें
                </h3>
              </div>
              <button
                onClick={() => setIsCustomModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="mt-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  सामान का नाम: *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="उदा. गुड़, नारियल, अगरबत्ती"
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    दर / कीमत (₹): *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="50"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-black text-amber-950 outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    मात्रा (Qty): *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customQty}
                    onChange={e => setCustomQty(e.target.value)}
                    placeholder="1"
                    className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  इकाई (Unit):
                </label>
                <select
                  value={customUnit}
                  onChange={e => setCustomUnit(e.target.value)}
                  className="w-full p-2.5 bg-[#faf8f3] border border-amber-200/80 rounded-xl text-xs font-bold text-stone-900 outline-hidden focus:border-amber-500"
                >
                  <option value="piece">piece (नग / पैकेट)</option>
                  <option value="kg">kg (किलो)</option>
                  <option value="packet">packet (पैकेट)</option>
                  <option value="liter">liter (लीटर)</option>
                  <option value="pouch">pouch (पाउच)</option>
                </select>
              </div>

              {/* Save to Catalog Toggle */}
              <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/70">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                  <input
                    type="checkbox"
                    checked={saveCustomToCatalog}
                    onChange={e => setSaveCustomToCatalog(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <span>📦 दुकान स्टॉक लिस्ट में भी जोड़ें (Save to catalog)</span>
                </label>
                <p className="text-[10px] text-stone-500 mt-1 pl-6 m-0">
                  इसे चालू रखने पर यह सामान भविष्य में भी स्टॉक लिस्ट व सर्च में दिखाई देगा।
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-amber-700 hover:bg-amber-600 text-white cursor-pointer shadow-xs active:scale-95"
                >
                  बिल में जोड़ें ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Registration & Login Modal */}
      <StoreAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
