import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { pwaService } from '../../services/pwaService';

export const UpdateNotificationBanner: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unsub = pwaService.subscribeUpdate((hasUpdate) => {
      setShowUpdate(hasUpdate);
    });
    return () => unsub();
  }, []);

  if (!showUpdate) return null;

  const handleRefresh = () => {
    setIsUpdating(true);
    pwaService.applyUpdate();
  };

  return (
    <aside
      aria-label="ऐप अपडेट सूचना"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-stone-950 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/70 flex items-center justify-between gap-2.5 animate-slide-down"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-black text-white m-0 truncate">नया वर्शन उपलब्ध है!</p>
          <p className="text-[11px] text-stone-300 m-0 truncate">सुधार तुरंत लागू करें</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleRefresh}
          disabled={isUpdating}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'अपडेट...' : 'अभी अपडेट करें'}</span>
        </button>
        <button
          onClick={() => setShowUpdate(false)}
          className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
          title="बाद में याद दिलाएं"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

