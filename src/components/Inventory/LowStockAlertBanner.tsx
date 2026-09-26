import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Send, Package, AlertTriangle } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { syncService } from '../../services/syncService';
import { openWhatsApp } from '../../utils/whatsapp';

interface LowStockAlertBannerProps {
  onDismiss: () => void;
}

export const LowStockAlertBanner: React.FC<LowStockAlertBannerProps> = ({ onDismiss }) => {
  const isPro = syncService.isPro();
  const isLoggedIn = syncService.isLoggedIn();

  const allProducts = useLiveQuery(() => db.products.toArray()) || [];

  const lowStockItems = useMemo(() => {
    return allProducts.filter(
      (p: Product) => p.stockQty <= p.minStockThreshold
    );
  }, [allProducts]);

  if (!isLoggedIn || lowStockItems.length === 0) return null;

  // Free plan: show max 3, PRO: show all
  const displayItems = isPro ? lowStockItems : lowStockItems.slice(0, 3);
  const hiddenCount = isPro ? 0 : Math.max(0, lowStockItems.length - 3);

  const handleWhatsApp = () => {
    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'दुकान';
    const today = new Date().toLocaleDateString('hi-IN');
    const lines = lowStockItems.map(
      (p: Product) => `• ${p.hindiName || p.name}: केवल ${p.stockQty} ${p.unit} बचा`
    );
    const msg =
      `🔔 *${shopName}* — कम स्टॉक सूचना (${today})\n\n` +
      lines.join('\n') +
      `\n\n📦 कुल ${lowStockItems.length} सामान जल्दी मंगवाएं।`;
    openWhatsApp(undefined, msg);
  };

  return (
    <div className="mx-2.5 sm:mx-5 mt-3 mb-0 rounded-2xl border border-amber-300 bg-amber-50 shadow-sm overflow-hidden">
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black text-amber-900">
              📦 {lowStockItems.length} सामान का स्टॉक कम है — आज मंगवाएं!
            </span>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-full text-amber-600 hover:bg-amber-200 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {displayItems.map((p: Product) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 rounded-full text-[10px] font-bold text-amber-900"
              >
                <Package className="w-2.5 h-2.5" />
                {p.hindiName || p.name}
                <span className="text-rose-600">{p.stockQty}{p.unit}</span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-[10px] font-bold text-amber-700">
                🔒 +{hiddenCount} और (PRO में देखें)
              </span>
            )}
          </div>

          <div className="mt-2.5 flex gap-2 flex-wrap">
            <button
              onClick={handleWhatsApp}
              disabled={!isPro}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer ${
                isPro
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-98'
                  : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
              title={isPro ? 'WhatsApp पर कम स्टॉक सूची भेजें' : 'PRO plan में उपलब्ध'}
            >
              <Send className="w-3 h-3" />
              {isPro ? 'WhatsApp पर भेजें' : '🔒 PRO: WhatsApp भेजें'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

