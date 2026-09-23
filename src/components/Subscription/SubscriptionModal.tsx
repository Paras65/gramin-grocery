import React, { useState } from 'react';
import { X, Check, Sparkles, Shield, Cloud, Smartphone, Printer, Store, MessageCircle, HelpCircle, Ticket, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const isLoggedIn = syncService.isLoggedIn();
  const subStatus = syncService.getSubscriptionStatus();
  const storeInfo = syncService.getStoreInfo();
  const sub = t.subscription;

  const handleUpgradeWhatsApp = () => {
    const shopName = storeInfo?.storeName || 'गाँव किराना स्टोर';
    const village = storeInfo?.village || 'गाँव';
    const message = encodeURIComponent(
      `नमस्ते Gramin Kirana टीम, मैं अपनी दुकान "${shopName}" (${village}) के लिए ग्रामिन प्रो (₹99/माह) प्लान लेना चाहता हूँ। कृपया जानकारी दें।`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleRegisterClick = () => {
    onClose();
    if (onOpenStoreAuth) {
      onOpenStoreAuth();
    }
  };

  const handleRedeemCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    const result = syncService.activateProWithKey(couponCode);
    setCouponFeedback({ success: result.success, message: result.message });
    if (result.success) {
      setCouponCode('');
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
                {subStatus.isPro ? sub.currentPlanPro : subStatus.isExpired ? 'योजना समाप्त (मुफ़्त मोड)' : sub.currentPlanFree}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-stone-800">
          {/* Graceful Expiry Notice Banner */}
          {subStatus.isExpired && isLoggedIn && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-amber-950 text-sm">
                    प्रो योजना की अवधि समाप्त हो चुकी है
                  </div>
                  <div className="text-amber-800 font-medium mt-0.5 leading-relaxed">
                    घबराएं नहीं! आपकी दुकान की ऑफ़लाइन बिलिंग, बही-खाता, पर्ची प्रिंटिंग और सभी दैनिक कार्य 100% मुफ़्त और सुरक्षित चल रहे हैं। प्रो सुविधाएं (क्लाउड बैकअप, WhatsApp तगादा) पुनः सक्रिय करने के लिए नवीनीकरण करें।
                  </div>
                </div>
              </div>
              <button
                onClick={handleUpgradeWhatsApp}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 transition flex items-center gap-1.5 shadow-xs self-end sm:self-auto cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>नवीनीकरण WhatsApp</span>
              </button>
            </div>
          )}

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
                  <div className="w-full text-center py-2.5 px-3 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-2xs space-y-1">
                    <div className="flex items-center justify-center gap-1.5 font-black">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✓ सक्रिय प्रो प्लान</span>
                      {subStatus.daysRemaining !== undefined && (
                        <span className="bg-amber-700/90 px-2 py-0.5 rounded-full text-[10px]">
                          {subStatus.daysRemaining} दिन शेष
                        </span>
                      )}
                    </div>
                    {subStatus.planExpiryDate && (
                      <div className="text-[10px] text-amber-100 font-medium">
                        वैधता: {new Date(subStatus.planExpiryDate).toLocaleDateString('hi-IN')}
                      </div>
                    )}
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

          {/* Offline Activation Code & Coupon Redemption */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-3xl p-4 sm:p-5 border border-amber-300/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-700">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-950 m-0">
                  कूपन या एक्टिवेशन कोड है? (Offline Voucher)
                </h4>
                <p className="text-[11px] text-stone-600 m-0 font-medium">
                  डिस्ट्रीब्यूटर या टीम द्वारा दिया गया कोड (जैसे: GRAMIN99, KIRANA-PRO-30) दर्ज कर तुरंत प्रो सक्रिय करें
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeemCoupon} className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="जैसे: GRAMIN99 या KIRANA365"
                className="flex-1 px-3 py-2 text-xs font-bold uppercase rounded-xl border border-stone-300 focus:outline-none focus:border-amber-500 bg-white tracking-wider"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 font-black text-xs rounded-xl transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                लागू करें
              </button>
            </form>

            {couponFeedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  couponFeedback.success
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                {couponFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{couponFeedback.message}</span>
              </div>
            )}
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

