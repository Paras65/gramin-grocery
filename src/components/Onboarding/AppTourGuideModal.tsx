import React, { useState } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Sparkles, 
  ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { UserRole } from '../../types';

interface AppTourGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPracticeBill: () => void;
  userRole?: UserRole;
}

export const AppTourGuideModal: React.FC<AppTourGuideModalProps> = ({
  isOpen,
  onClose,
  onStartPracticeBill,
  userRole = 'owner',
}) => {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slides = (t as any).tour?.slides || [];
  const totalSlides = slides.length || 4;

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onStartPracticeBill();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const current = slides[currentSlide] || {
    title: 'तुरंत बिलिंग',
    icon: '🧾',
    desc: 'सामान पर छूएं और 1-सेकंड में बिल बनाएं।',
    badge: 'तेज़ व आसान'
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-white/20 text-white shrink-0">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate m-0">
                {(t as any).tour?.modalTitle || 'ग्रामीण किराना — 1 मिनट में सीखें'}
              </h2>
              <p className="text-xs text-amber-100 font-medium truncate m-0">
                {(t as any).tour?.modalSubtitle || (userRole === 'munim' ? 'काउंटर मुनीम के लिए सरल सचित्र गाइड' : 'दुकानदार व मुनीम के लिए सरल सचित्र गाइड')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition shrink-0"
            title={(t as any).tour?.skipBtn || 'बंद करें'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Dots Indicator */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 bg-stone-50 border-b border-stone-100">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === idx ? 'w-8 bg-amber-600' : 'w-2 bg-stone-300 hover:bg-stone-400'
              }`}
              title={`स्लाइड ${idx + 1}`}
            />
          ))}
        </div>

        {/* Slide Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-center items-center text-center space-y-4">
          {/* Large Emoji / Icon Badge */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center text-4xl sm:text-5xl shadow-inner animate-bounce-subtle">
              {current.icon}
            </div>
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-xs">
              {current.badge}
            </span>
          </div>

          {/* Slide Heading & Description */}
          <div className="space-y-2 max-w-md">
            <h3 className="text-lg sm:text-xl font-black text-stone-900 tracking-tight m-0">
              {current.title}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed m-0">
              {current.desc}
            </p>
          </div>

          {/* Quick Pillar Bullets for Step Clarity */}
          <div className="w-full bg-[#fbf9f4] p-3 rounded-2xl border border-amber-100/90 text-left text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-stone-700">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold">
                {currentSlide === 0
                  ? 'सामान फोटो छुएं ➔ नकद/उधार चुनें ➔ बिल प्रिंट या WhatsApp'
                  : currentSlide === 1
                  ? 'पारा-मोहल्ला फिल्टर ➔ वादा तारीख ➔ 1-टैप तगादा'
                  : currentSlide === 2
                  ? 'पाव (250g) ➔ आधा किलो (500g) ➔ सुबह मंडी दर बदलें'
                  : 'शाम को नोट गिनें ➔ दिन भर की बिक्री मिलान ➔ गल्ला बंद'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-stone-500 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>100% ऑफ़लाइन सुरक्षित — इंटरनेट या बिजली न होने पर भी अटूट काम।</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200/90 flex flex-col gap-2.5 shrink-0">
          {/* Main Primary Action: Launch 1-Minute Practice Bill */}
          <button
            type="button"
            onClick={onStartPracticeBill}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
          >
            <span>{(t as any).tour?.startPracticeBtn || '🚀 1 मिनट का अभ्यास बिल बनाकर देखें'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Navigation & Skip Row */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                currentSlide === 0 
                  ? 'opacity-30 cursor-not-allowed text-stone-400' 
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{(t as any).tour?.prevBtn || 'पिछला'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer py-1 px-2"
            >
              {(t as any).tour?.skipBtn || '✕ बाद में सीखें'}
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 active:scale-95 text-white transition cursor-pointer flex items-center gap-1"
            >
              <span>{currentSlide === totalSlides - 1 ? 'शुरू करें 🚀' : (t as any).tour?.nextBtn || 'अगला'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

