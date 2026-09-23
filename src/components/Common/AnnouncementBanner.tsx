import React, { useEffect, useState, useCallback } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { syncService } from '../../services/syncService';
import type { PlatformAnnouncement } from '../../types';

export const AnnouncementBanner: React.FC = () => {
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null);

  const fetchAnnouncement = useCallback(async () => {
    try {
      const active = await adminService.getActiveAnnouncement();
      if (!active) {
        setAnnouncement(null);
        return;
      }

      // Check if user has already dismissed this specific announcement
      const id = active._id || active.id;
      const dismissedRaw = localStorage.getItem('gk_dismissed_announcements');
      if (dismissedRaw) {
        try {
          const dismissedIds: string[] = JSON.parse(dismissedRaw);
          if (id && dismissedIds.includes(id)) {
            setAnnouncement(null);
            return;
          }
        } catch {
          // ignore corrupted local storage
        }
      }

      setAnnouncement(active);
    } catch {
      setAnnouncement(null);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncement();

    // Re-check periodically every 3 minutes
    const interval = setInterval(fetchAnnouncement, 3 * 60 * 1000);

    // Re-check if store logs in or switches
    const unsubAuth = syncService.subscribeAuth(() => {
      fetchAnnouncement();
    });

    return () => {
      clearInterval(interval);
      unsubAuth();
    };
  }, [fetchAnnouncement]);

  const handleDismiss = () => {
    if (!announcement) return;
    const id = announcement._id || announcement.id;
    if (id) {
      try {
        const dismissedRaw = localStorage.getItem('gk_dismissed_announcements');
        const dismissedIds: string[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
        if (!dismissedIds.includes(id)) {
          dismissedIds.push(id);
          localStorage.setItem('gk_dismissed_announcements', JSON.stringify(dismissedIds.slice(-50)));
        }
      } catch {
        // ignore
      }
    }
    setAnnouncement(null);
  };

  if (!announcement) return null;

  // Visual configuration based on announcement type
  const themeConfig = {
    INFO: {
      bg: 'bg-gradient-to-r from-blue-900 to-indigo-950 text-blue-100 border-blue-500/60',
      badge: 'bg-blue-600 text-white',
      badgeLabel: 'सूचना',
      icon: <Info className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />,
    },
    WARNING: {
      bg: 'bg-gradient-to-r from-amber-950 to-orange-950 text-amber-100 border-amber-500/60',
      badge: 'bg-amber-600 text-stone-950 font-bold',
      badgeLabel: 'चेतावनी',
      icon: <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />,
    },
    ALERT: {
      bg: 'bg-gradient-to-r from-rose-950 to-red-950 text-rose-100 border-rose-500/70',
      badge: 'bg-rose-600 text-white font-bold',
      badgeLabel: 'महत्वपूर्ण अलर्ट',
      icon: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />,
    },
    SUCCESS: {
      bg: 'bg-gradient-to-r from-emerald-950 to-teal-950 text-emerald-100 border-emerald-500/60',
      badge: 'bg-emerald-600 text-white font-bold',
      badgeLabel: 'खुशखबरी / अपडेट',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />,
    },
  }[announcement.type || 'INFO'];

  return (
    <aside
      role="status"
      aria-label="प्लेटफ़ॉर्म घोषणा"
      className={`w-full px-4 py-3 border-b shadow-lg transition-all animate-slide-down ${themeConfig.bg}`}
    >
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {themeConfig.icon}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider ${themeConfig.badge}`}>
                {themeConfig.badgeLabel}
              </span>
              <h4 className="text-sm font-black text-white m-0 tracking-wide">
                {announcement.title}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed m-0 break-words whitespace-pre-wrap">
              {announcement.message}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          title="घोषणा हटाएं (Dismiss)"
          aria-label="घोषणा बंद करें"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};

