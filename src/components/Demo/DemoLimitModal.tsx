import React from 'react';
import { Sparkles, Store, ShieldCheck, X, Lock } from 'lucide-react';

interface DemoLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const DemoLimitModal: React.FC<DemoLimitModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-amber-400 overflow-hidden text-stone-900">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center mx-auto mb-2.5">
            <Sparkles className="w-6 h-6" />
          </div>

          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
            डेमो कोटा पूरा हुआ
          </span>
          <h2 className="text-lg sm:text-xl font-black text-stone-100 mt-2 m-0">
            15 डेमो बिल पूरे हो गए हैं!
          </h2>
          <p className="text-xs text-stone-300 mt-1 m-0 font-medium">
            आपने ग्रामीण किराना का डेमो सफ़लपूर्वक आज़मा लिया है।
          </p>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium text-center m-0">
            आगे बिना रुकावट बिलिंग जारी रखने के लिए अपनी असली दुकान का नाम जोड़ें। यह <strong>100% आजीवन मुफ़्त</strong> है!
          </p>

          <div className="bg-[#faf8f3] rounded-2xl p-3.5 border border-amber-200/80 space-y-2 text-xs text-stone-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>पर्ची व WhatsApp पर आपकी असली दुकान का नाम</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>आजीवन असीमित बिलिंग व ग्राहक उधारी खाता</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>बिना इंटरनेट (100% ऑफ़लाइन) सुरक्षित डेटा</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>+ अपनी दुकान मुफ़्त में जोड़ें (30 सेकंड) ➔</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="w-full py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>पहले से खाता है? यहाँ लॉगिन करें</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

