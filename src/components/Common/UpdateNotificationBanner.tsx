import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
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
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md bg-stone-950 text-amber-300 px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/70 flex items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <p className="text-xs font-black text-white m-0">नया वर्शन उपलब्ध है!</p>
          <p className="text-[11px] text-stone-300 m-0">नई सुविधाएं व सुधार तुरंत लागू करें</p>
        </div>
      </div>
      <button
        onClick={handleRefresh}
        disabled={isUpdating}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer whitespace-nowrap"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
        <span>{isUpdating ? 'अपडेट हो रहा है...' : 'अभी अपडेट करें'}</span>
      </button>
    </aside>
  );
};

