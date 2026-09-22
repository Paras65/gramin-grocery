import React from 'react';
import { X, Check, Sparkles, Shield, Cloud, Smartphone, Printer, Store, MessageCircle, HelpCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoreAuth?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onOpenStoreAuth,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  const isLoggedIn = syncService.isLoggedIn();
  const subStatus = syncService.getSubscriptionStatus();
  const storeInfo = syncService.getStoreInfo();
  const sub = t.subscription;

  const handleUpgradeWhatsApp = () => {
    const shopName = storeInfo?.storeName || 'गाँव किराना स्टोर';
    const village = storeInfo?.village || 'गाँव';
    const message = encodeURIComponent(
      `नमस्ते Gramin Kirana टीम, मैं अपनी दुकान "${shopName}" (${village}) के लिए ग्रामिन प्रो (₹49/माह) प्लान लेना चाहता हूँ। कृपया जानकारी दें।`
    );
    window.open(`https://wa.me/919876543210?text=${message}`, '_blank');
  };

  const handleRegisterClick = () => {
    onClose();
    if (onOpenStoreAuth) {
      onOpenStoreAuth();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 sm:p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>पारदर्शी व ग्रामीण अनुकूल प्लान</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight m-0">
            {sub.modalTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 m-0 font-medium">
            {sub.modalSubtitle}
          </p>

          {isLoggedIn && storeInfo && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-800/90 border border-stone-700 text-xs text-stone-300">
              <span>🏪 {storeInfo.storeName} ({storeInfo.village})</span>
              <span className="text-stone-500">•</span>
              <span className="font-bold text-amber-400">
                {subStatus.isPro ? sub.currentPlanPro : sub.currentPlanFree}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-stone-800">
          {/* Pricing Tier Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Free Plan Card */}
            <div
              className={`rounded-3xl p-5 border-2 transition flex flex-col justify-between ${
                !subStatus.isPro && isLoggedIn
                  ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                  : 'border-stone-200 bg-stone-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-stone-900">
                    {sub.freePlanTitle}
                  </span>
                  {!subStatus.isPro && isLoggedIn && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide">
                      {sub.activeBadge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-stone-950">
                    {sub.freePlanPrice}
                  </span>
                  <span className="text-xs text-stone-500 font-bold">
                    / {sub.freePlanPeriod}
                  </span>
                </div>

                <p className="text-xs text-stone-600 mb-4 leading-relaxed font-medium">
                  {sub.freePlanDesc}
                </p>

                <div className="space-y-2 border-t border-stone-200 pt-3 text-xs text-stone-700 font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>100% ऑफ़लाइन बिलिंग (बिना इंटरनेट)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>असीमित ग्राहक बही-खाता व उधारी</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>कैमरा बारकोड स्कैनर व पाव/आधा किलो वजन</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>साप्ताहिक हाट-बाज़ार 1-टैप नकद मोड</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>ब्लूटूथ व 58mm थर्मल पर्ची प्रिंटर</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>शाम का गल्ला मिलान व WhatsApp रिपोर्ट</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                {isLoggedIn ? (
                  !subStatus.isPro ? (
                    <div className="w-full text-center py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xs">
                      ✓ चालू है (वर्तमान प्लान)
                    </div>
                  ) : (
                    <button
                      disabled
                      className="w-full text-center py-2.5 rounded-2xl bg-stone-200 text-stone-500 font-bold text-xs"
                    >
                      शामिल है
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    className="w-full py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shadow-sm active:scale-98"
                  >
                    {sub.startFreeBtn}
                  </button>
                )}
              </div>
            </div>

            {/* Pro Plan Card */}
            <div
              className={`rounded-3xl p-5 border-2 transition flex flex-col justify-between relative overflow-hidden ${
                subStatus.isPro && isLoggedIn
                  ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                  : 'border-amber-400 bg-amber-50/20'
              }`}
            >
              <div className="absolute -top-3 -right-3 bg-amber-500 text-stone-950 px-6 py-1 rotate-12 text-[10px] font-black shadow-xs">
                सुरक्षित क्लाउड
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                    {sub.proPlanTitle}
                  </span>
                  {subStatus.isPro && isLoggedIn && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black tracking-wide">
                      {sub.activeBadge}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 my-2">
                  <span className="text-3xl font-black text-stone-950">
                    {sub.proPlanPrice}
                  </span>
                  <span className="text-xs text-stone-600 font-bold">
                    / {sub.proPlanPeriod}
                  </span>
                </div>

                <p className="text-xs text-stone-600 mb-4 leading-relaxed font-medium">
                  {sub.proPlanDesc}
                </p>

                <div className="space-y-2 border-t border-amber-200/80 pt-3 text-xs text-stone-800 font-medium">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="font-bold">मुफ़्त प्लान की सब सुविधाएं शामिल</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>📲 WhatsApp तगादा ब्लास्ट — सभी उधारी ग्राहकों को 1-टैप याद दिलाएं</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>📊 माहवारी लाभ-हानि रिपोर्ट — असली मुनाफ़ा PDF में</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>🔔 कम स्टॉक सुबह अलर्ट — समय पर मंडी से माल मंगवाएं</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>👥 मुनीम/स्टाफ PIN लॉगिन — थोक भाव व मुनाफ़ा गुप्त</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>☁️ क्लाउड बैकअप — फोन टूटने पर भी 0 डेटा नुकसान</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>एक से अधिक मोबाइल/टैबलेट पर डेटा शेयरिंग</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3">
                {subStatus.isPro && isLoggedIn ? (
                  <div className="w-full text-center py-2.5 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-2xs">
                    ✓ सक्रिय प्रो प्लान
                  </div>
                ) : (
                  <button
                    onClick={handleUpgradeWhatsApp}
                    className="w-full py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-amber-400 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>{sub.upgradeBtn}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Feature Highlights Banner */}
          <div className="bg-[#faf8f3] rounded-3xl p-5 border border-amber-200/70 space-y-3">
            <h3 className="text-sm font-black text-stone-900 m-0 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>{sub.allFeaturesTitle}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-2xl border border-stone-200">
                <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sub.features.offline}</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-2xl border border-stone-200">
                <Printer className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sub.features.thermal}</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-2xl border border-stone-200">
                <Smartphone className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sub.features.pos}</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-2xl border border-stone-200">
                <Store className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sub.features.khata}</span>
              </div>
            </div>
          </div>

          {/* Non-Technical Guarantee Footer */}
          <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex items-center gap-3 text-stone-600 text-xs">
            <HelpCircle className="w-5 h-5 text-stone-500 flex-shrink-0" />
            <p className="m-0 leading-relaxed font-medium">
              <strong>गाँव की दुकान की गारंटी:</strong> मुफ़्त प्लान में भी आपकी दुकान का हिसाब-किताब कभी बंद नहीं होगा। इंटरनेट बंद होने पर भी कोई डेटा नहीं खोता।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

