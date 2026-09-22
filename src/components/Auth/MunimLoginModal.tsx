import React, { useState } from 'react';
import { X, Lock, UserCheck, AlertTriangle } from 'lucide-react';
import { syncService } from '../../services/syncService';

interface MunimLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MunimLoginModal: React.FC<MunimLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const store = syncService.getStoreInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('4 अंकों का PIN डालें');
      return;
    }
    const ok = await syncService.munimLogin(pin);
    if (ok) {
      setPin('');
      setError('');
      onSuccess();
    } else {
      setError('गलत PIN है। दुकानदार से पूछें।');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Lock className="w-4 h-4" />
            <span>मुनीम / स्टाफ लॉगिन</span>
          </div>
          <h2 className="text-lg font-black text-stone-100 m-0">काउंटर स्टाफ लॉगिन</h2>
          {store && (
            <p className="text-xs text-stone-400 mt-1">🏪 {store.storeName} — {store.village}</p>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-stone-600 leading-relaxed">
            मुनीम / काउंटर स्टाफ के लिए अलग 4-अंकी PIN से लॉगिन करें।<br />
            <span className="text-amber-700 font-bold">⚠️ रिपोर्ट, सेटिंग्स व बैकअप सीमित रहेगा।</span>
          </p>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">मुनीम PIN (4 अंक)</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              className="w-full border-2 border-stone-300 rounded-2xl px-4 py-3 text-xl font-black text-center tracking-[0.5em] focus:outline-none focus:border-amber-500 transition"
              placeholder="• • • •"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-xs text-rose-700 font-bold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm transition cursor-pointer shadow-sm active:scale-98 flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            मुनीम लॉगिन करें
          </button>

          {!store?.munimPin && (
            <p className="text-[10px] text-stone-400 text-center leading-snug">
              मुनीम PIN अभी सेट नहीं है। Settings → मुनीम PIN सेट करें (दुकानदार ही कर सकते हैं)।
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

