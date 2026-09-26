import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { X, Send, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { syncService } from '../../services/syncService';
import { openWhatsApp } from '../../utils/whatsapp';

interface ExpiringSoonAlertBannerProps {
  onDismiss: () => void;
}

export const ExpiringSoonAlertBanner: React.FC<ExpiringSoonAlertBannerProps> = ({ onDismiss }) => {
  const isPro = syncService.isPro();
  const isLoggedIn = syncService.isLoggedIn();

  const allProducts = useLiveQuery(() => db.products.toArray()) || [];

  const { expiredItems, expiringSoonItems } = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const expired: Array<{ product: Product; daysDiff: number }> = [];
    const expiringSoon: Array<{ product: Product; daysDiff: number }> = [];

    allProducts.forEach((p: Product) => {
      if (!p.expiryDate || p.stockQty <= 0) return;
      const expDate = new Date(p.expiryDate);
      if (isNaN(expDate.getTime())) return;

      const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const diffDays = Math.round((expMidnight - todayMidnight) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        expired.push({ product: p, daysDiff: diffDays });
      } else if (diffDays <= 7) {
        expiringSoon.push({ product: p, daysDiff: diffDays });
      }
    });

    return { expiredItems: expired, expiringSoonItems: expiringSoon };
  }, [allProducts]);

  const totalAlertItems = expiredItems.length + expiringSoonItems.length;

  if (!isLoggedIn || totalAlertItems === 0) return null;

  // Combine: show expired first, then expiring soon
  const combined = [...expiredItems, ...expiringSoonItems];
  const displayList = isPro ? combined : combined.slice(0, 3);
  const hiddenCount = isPro ? 0 : Math.max(0, combined.length - 3);

  const handleWhatsAppDistributor = () => {
    const store = syncService.getStoreInfo();
    const shopName = store?.storeName || 'दुकान';
    const today = new Date().toLocaleDateString('hi-IN');

    const lines = combined.map(({ product, daysDiff }) => {
      const status = daysDiff <= 0 
        ? `⚠️ समय समाप्त (Expired)` 
        : daysDiff === 1 
        ? `⚠️ कल एक्सपायर होगा` 
        : `⚠️ ${daysDiff} दिन शेष`;
      return `• ${product.hindiName || product.name} (${product.stockQty} ${product.unit}) — ${status}`;
    });

    const msg =
      `📦 *${shopName}* — माल वापसी / एक्सपायरी क्लेम (${today})\n\n` +
      `आदरणीय डिस्ट्रीब्यूटर महोदय,\n` +
      `हमारी दुकान में निम्नलिखित सामान एक्सपायरी सीमा पर हैं। कृपया अगली डिलीवरी में वापसी/बदलाव सुनिश्चित करें:\n\n` +
      lines.join('\n') +
      `\n\nकुल प्रभावित सामान: ${combined.length}\n` +
      `— ${shopName}${store?.village ? ` (${store.village})` : ''}`;

    openWhatsApp(undefined, msg);
  };

  const hasExpired = expiredItems.length > 0;

  return (
    <div
      role="region"
      aria-label="सामान एक्सपायरी चेतावनी बैनर"
      className={`mx-2.5 sm:mx-5 mt-2.5 mb-0 rounded-2xl border shadow-xs overflow-hidden transition-all ${
        hasExpired
          ? 'border-rose-300 bg-rose-50/80 text-rose-950'
          : 'border-amber-300 bg-amber-50/80 text-amber-950'
      }`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="shrink-0 mt-0.5">
          <div
            className={`w-8 h-8 rounded-full border flex items-center justify-center ${
              hasExpired
                ? 'bg-rose-100 border-rose-300 text-rose-700'
                : 'bg-amber-100 border-amber-300 text-amber-700'
            }`}
          >
            {hasExpired ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-black">
              {hasExpired
                ? `🚨 ${expiredItems.length} सामान की डेट खत्म व ${expiringSoonItems.length} सामान 7 दिन में एक्सपायर!`
                : `⌛ ${expiringSoonItems.length} सामान अगले 7 दिनों में एक्सपायर होने वाले हैं!`}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition cursor-pointer"
              title="सूचना हटाएं"
              aria-label="सूचना बंद करें"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Product Badges List */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {displayList.map(({ product, daysDiff }) => {
              const isPast = daysDiff <= 0;
              return (
                <span
                  key={product.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isPast
                      ? 'bg-white border-rose-300 text-rose-900'
                      : 'bg-white border-amber-300 text-amber-900'
                  }`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[120px]">{product.hindiName || product.name}</span>
                  <span className="font-semibold text-stone-500">({product.stockQty}{product.unit})</span>
                  <span className={`px-1.5 py-0.2 rounded-full font-black ${isPast ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                    {isPast ? 'एक्सपायर' : `${daysDiff} दिन`}
                  </span>
                </span>
              );
            })}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-full text-[10px] font-bold text-amber-800">
                🔒 +{hiddenCount} और सामान (PRO में देखें)
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleWhatsAppDistributor}
              disabled={!isPro}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition cursor-pointer shadow-2xs ${
                isPro
                  ? 'bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95'
                  : 'bg-stone-200 text-stone-500 cursor-not-allowed'
              }`}
              title={isPro ? 'डिस्ट्रीब्यूटर को WhatsApp वापसी क्लेम भेजें' : 'प्रो प्लान में उपलब्ध'}
            >
              <Send className="w-3 h-3" />
              <span>{isPro ? '📲 डिस्ट्रीब्यूटर वापसी क्लेम (WhatsApp)' : '🔒 PRO: डिस्ट्रीब्यूटर वापसी क्लेम'}</span>
            </button>
            <span className="text-[11px] text-stone-600 font-medium hidden sm:inline">
              खराब माल होने से पहले रियायती दर पर बेचें या डीलर को वापस करें
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

