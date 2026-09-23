import React, { useState, useEffect } from 'react';
import { 
  X, Check, Sparkles, Shield, Cloud, Store, 
  MessageCircle, HelpCircle, Ticket, CheckCircle2, AlertCircle, 
  QrCode, Copy, ExternalLink, RefreshCw, Clock, CheckCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../context/LanguageContext';
import { syncService } from '../../services/syncService';
import type { PaymentClaim } from '../../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStoreAuth?: () => void;
}

type DurationMonths = 1 | 3 | 12;

interface PlanOption {
  months: DurationMonths;
  price: number;
  label: string;
  monthlyRate: string;
  discountBadge?: string;
  popular?: boolean;
}

const DURATION_OPTIONS: PlanOption[] = [
  { months: 1, price: 99, label: '1 महीना', monthlyRate: '₹99/माह' },
  { months: 3, price: 269, label: '3 महीने', monthlyRate: '₹89/माह', discountBadge: '10% छूट', popular: true },
  { months: 12, price: 999, label: '1 वर्ष (12 माह)', monthlyRate: '₹83/माह', discountBadge: '16% भारी छूट' },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  onOpenStoreAuth,
}) => {
  const { t } = useLanguage();
  const [selectedDuration, setSelectedDuration] = useState<DurationMonths>(3);
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [activeClaim, setActiveClaim] = useState<PaymentClaim | null>(null);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Voucher / Coupon states
  const [showVoucherBox, setShowVoucherBox] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const isLoggedIn = syncService.isLoggedIn();
  const isMunim = syncService.isMunimSession();
  const subStatus = syncService.getSubscriptionStatus();
  const storeInfo = syncService.getStoreInfo();
  const sub = t.subscription;

  // Platform UPI ID & Name (Server-Enforced with local fallback)
  const [platformUpiId, setPlatformUpiId] = useState<string | null>(
    (import.meta as any).env?.VITE_PLATFORM_UPI_ID || null
  );
  const [platformUpiName, setPlatformUpiName] = useState<string>('GraminKirana');

  // Load server-side configuration and existing claim status when modal opens
  useEffect(() => {
    if (isOpen) {
      syncService.getSubscriptionConfig().then((cfg) => {
        if (cfg?.isConfigured && cfg.upiId) {
          setPlatformUpiId(cfg.upiId);
          if (cfg.upiName) {
            setPlatformUpiName(cfg.upiName.replace(/[^a-zA-Z0-9]/g, ''));
          }
        } else {
          setPlatformUpiId(null);
        }
      }).catch(console.warn);

      if (isLoggedIn) {
        loadClaimStatus();
      }
    }
  }, [isOpen, isLoggedIn]);

  const loadClaimStatus = async () => {
    try {
      setLoadingClaim(true);
      const claim = await syncService.getPaymentClaimStatus();
      setActiveClaim(claim);
      // Auto-refresh store subscription in real-time if approved
      if (claim?.status === 'APPROVED') {
        await syncService.triggerSync();
      }
    } catch (err) {
      console.warn('Could not fetch claim status:', err);
    } finally {
      setLoadingClaim(false);
    }
  };

  if (!isOpen) return null;

  const currentPlanConfig = DURATION_OPTIONS.find(d => d.months === selectedDuration) || DURATION_OPTIONS[0];

  // Dynamic UPI URL payload: NPCI compliant (alphanumeric, max 25 chars without special symbols)
  const cleanStoreName = (storeInfo?.storeName || 'Shop').replace(/[^a-zA-Z0-9]/g, '').slice(0, 15);
  const upiNote = `Pro${currentPlanConfig.months}M${cleanStoreName}`;
  const upiUri = platformUpiId
    ? `upi://pay?pa=${platformUpiId}&pn=${encodeURIComponent(platformUpiName)}&am=${currentPlanConfig.price}&cu=INR&tn=${upiNote}`
    : '';

  const handleCopyUpiId = () => {
    if (!platformUpiId) return;
    navigator.clipboard.writeText(platformUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleUpgradeWhatsApp = () => {
    const shopName = storeInfo?.storeName || 'गाँव किराना स्टोर';
    const village = storeInfo?.village || 'गाँव';
    const message = encodeURIComponent(
      `नमस्ते Gramin Kirana टीम, मैं अपनी दुकान "${shopName}" (${village}) के लिए ग्रामिन प्रो (${currentPlanConfig.label} - ₹${currentPlanConfig.price}) अपग्रेड करना चाहता हूँ। कृपया सहायता करें।`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleRegisterClick = () => {
    onClose();
    if (onOpenStoreAuth) {
      onOpenStoreAuth();
    }
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUtr = utrNumber.trim().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    if (!cleanUtr || cleanUtr.length < 10) {
      setClaimFeedback({
        success: false,
        message: 'कृपया सही 12-अंकों का UTR / UPI रेफरेंस नंबर दर्ज करें।',
      });
      return;
    }

    if (isMunim) {
      setClaimFeedback({
        success: false,
        message: 'सुरक्षा प्रतिबंध: केवल दुकान संचालक (मालिक) ही प्रो प्लान का भुगतान सबमिट कर सकते हैं।',
      });
      return;
    }

    try {
      setIsSubmittingClaim(true);
      setClaimFeedback(null);
      const claim = await syncService.submitPaymentClaim(currentPlanConfig.price, currentPlanConfig.months, cleanUtr);
      setActiveClaim(claim);
      setClaimFeedback({
        success: true,
        message: 'भुगतान UTR सफलतापूर्वक सबमिट हो गया! सत्यापन पूरा होते ही आपका प्रो प्लान सक्रिय हो जाएगा।',
      });
      setUtrNumber('');
    } catch (err: any) {
      setClaimFeedback({
        success: false,
        message: err.message || 'क्लेम सबमिट करने में विफल। कृपया पुनः प्रयास करें।',
      });
    } finally {
      setIsSubmittingClaim(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-950 text-white p-4 sm:p-5 relative flex-shrink-0 border-b border-amber-500/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 transition cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>डायरेक्ट UPI गेटवे • पारदर्शी ग्रामीण प्लान</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-stone-100 tracking-tight m-0">
            {sub.modalTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 m-0 font-medium">
            PhonePe, Google Pay, Paytm या BHIM से सीधे QR स्कैन कर तुरंत प्रो सक्रिय करें
          </p>

          {isLoggedIn && storeInfo && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 flex-wrap">
              <span>🏪 {storeInfo.storeName} ({storeInfo.village})</span>
              <span className="text-stone-500">•</span>
              <span className="font-bold text-amber-400">
                {subStatus.isPro ? sub.currentPlanPro : subStatus.isExpired ? 'योजना समाप्त (मुफ़्त मोड)' : sub.currentPlanFree}
              </span>
              {subStatus.daysRemaining !== undefined && subStatus.isPro && (
                <span className="text-emerald-400 font-semibold">({subStatus.daysRemaining} दिन शेष)</span>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-5 text-stone-800">
          {/* Demo Mode Notice */}
          {!isLoggedIn && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>डेमो काउंटर:</strong> अपनी वास्तविक दुकान के लिए प्रो प्लान सक्रिय करने हेतु पहले दुकान पंजीकृत या लॉगिन करें।
                </span>
              </div>
              <button
                type="button"
                onClick={handleRegisterClick}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                दुकान जोड़ें / लॉगिन
              </button>
            </div>
          )}

          {/* Active / Pending Claim Notice */}
          {activeClaim && activeClaim.status === 'PENDING' && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2 shadow-xs">
              <div className="flex items-center justify-between font-black">
                <span className="flex items-center gap-1.5 text-amber-900 text-sm">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>⏳ सत्यापन समीक्षाधीन (Verification in Progress)</span>
                </span>
                <span className="bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  लंबित
                </span>
              </div>
              <p className="m-0 leading-relaxed text-stone-700">
                UTR <strong>{activeClaim.utrNumber}</strong> (राशि: <strong>₹{activeClaim.amount}</strong>) का बैंक मिलान किया जा रहा है। 
                स्वीकृत होते ही प्रो प्लान स्वतः सक्रिय हो जाएगा।
              </p>
              <div className="flex items-center justify-between pt-1 text-[11px] text-stone-500 border-t border-amber-200">
                <span>सबमिट दिनांक: {new Date(activeClaim.createdAt).toLocaleString('hi-IN')}</span>
                <button
                  type="button"
                  onClick={loadClaimStatus}
                  disabled={loadingClaim}
                  className="flex items-center gap-1 text-amber-800 font-bold hover:underline cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingClaim ? 'animate-spin' : ''}`} />
                  <span>स्थिति जांचें</span>
                </button>
              </div>
            </div>
          )}

          {activeClaim && activeClaim.status === 'REJECTED' && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>पिछला भुगतान क्लेम अस्वीकृत हुआ</span>
              </div>
              <p className="m-0 text-stone-700">
                कारण: {activeClaim.rejectionReason || 'बैंक खाते में भुगतान प्राप्त नहीं हुआ।'} कृपया सही UTR नंबर पुनः दर्ज करें।
              </p>
            </div>
          )}

          {/* Munim Role Notice Guard */}
          {isMunim && (
            <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-300/80 text-xs text-amber-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>मुनीम मोड सक्रिय:</strong> भुगतान क्लेम व प्रो अपग्रेड केवल दुकान संचालक (मालिक) द्वारा सबमिट किया जा सकता है।
              </span>
            </div>
          )}

          {/* Duration Selection Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs sm:text-sm font-black text-stone-900">
                १. प्रो प्लान अवधि चुनें (Select Plan Duration)
              </label>
              {subStatus.isPro && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  ✓ दिन जुड़ेंगे (No Day Lost)
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = selectedDuration === opt.months;
                return (
                  <button
                    key={opt.months}
                    type="button"
                    onClick={() => setSelectedDuration(opt.months)}
                    className={`relative p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/60 shadow-xs ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                    }`}
                  >
                    {opt.discountBadge && (
                      <span className="absolute -top-2.5 right-2 px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-xs">
                        {opt.discountBadge}
                      </span>
                    )}
                    <div>
                      <div className="text-xs font-black text-stone-900">{opt.label}</div>
                      <div className="text-base sm:text-lg font-black text-stone-950 mt-0.5">
                        ₹{opt.price}
                      </div>
                    </div>
                    <div className="text-[10px] text-stone-600 font-semibold mt-1">
                      {opt.monthlyRate}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic UPI Payment Card OR Graceful Fallback Notice */}
          {platformUpiId ? (
            <div className="bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-stone-100 m-0">
                      २. UPI QR स्कैन करें (Direct Dynamic Gateway)
                    </h3>
                    <p className="text-[11px] text-amber-300 m-0 font-medium">
                      कुल देय राशि: <strong className="text-white text-xs">₹{currentPlanConfig.price}</strong> ({currentPlanConfig.label})
                    </p>
                  </div>
                </div>

                {/* UPI ID Badge with Copy */}
                <button
                  type="button"
                  onClick={handleCopyUpiId}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-stone-700"
                  title="UPI ID कॉपी करें"
                >
                  {copiedUpi ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">कॉपी हो गई!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>{platformUpiId}</span>
                    </>
                  )}
                </button>
              </div>

              {/* QR Code & Mobile 1-Tap CTA Box */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
                {/* High Contrast QR Code */}
                <div className="bg-white p-3 rounded-2xl shadow-md shrink-0 flex items-center justify-center">
                  <QRCodeSVG
                    value={upiUri}
                    size={160}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d97706'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E",
                      x: undefined,
                      y: undefined,
                      height: 28,
                      width: 28,
                      excavate: true,
                    }}
                  />
                </div>

                {/* Instructions & 1-Tap Mobile Button */}
                <div className="space-y-3 flex-1 text-center sm:text-left w-full">
                  <div className="text-xs text-stone-300 space-y-1 font-medium leading-relaxed">
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start text-amber-300 font-bold">
                      <span>📱 किसी भी UPI ऐप से स्कैन करें:</span>
                    </div>
                    <p className="m-0 text-stone-400 text-[11px]">
                      PhonePe, Google Pay, Paytm, BHIM, CRED या कोई भी बैंक ऐप खोलें और यह QR स्कैन करें।
                    </p>
                  </div>

                  {/* Mobile Deep Link Button */}
                  <a
                    href={upiUri}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-98 no-underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>📲 1-टैप UPI ऐप खोलें (Mobile App)</span>
                  </a>

                  <div className="text-[10px] text-stone-500 text-center sm:text-left">
                    भुगतान पूरा होने पर बैंक SMS या ऐप रसीद में <strong>12-अंकों का UTR / रेफरेंस नंबर</strong> देखें।
                  </div>
                </div>
              </div>

              {/* Step 3: Enter 12-Digit UTR */}
              <form onSubmit={handleSubmitClaim} className="space-y-2.5 pt-2 border-t border-stone-800">
                <label className="text-xs font-black text-stone-200 block">
                  ३. भुगतान के बाद 12-अंकों का UTR / UPI Ref नंबर दर्ज करें:
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 18).toUpperCase())}
                    placeholder="उदा: 425689123456 (12 अंक)"
                    disabled={isSubmittingClaim || isMunim}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-amber-300 font-mono text-sm tracking-wider focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingClaim || isMunim || utrNumber.trim().length < 10}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 ${
                      isSubmittingClaim || isMunim || utrNumber.trim().length < 10
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                    }`}
                  >
                    {isSubmittingClaim ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>सत्यापन हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>भुगतान क्लेम सबमिट करें</span>
                      </>
                    )}
                  </button>
                </div>

                {claimFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      claimFeedback.success
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950/80 text-rose-300 border border-rose-700'
                    }`}
                  >
                    {claimFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{claimFeedback.message}</span>
                  </div>
                )}
              </form>
            </div>
          ) : (
            <div className="bg-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-lg border border-amber-500/30 space-y-4 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-100 m-0">
                    डायरेक्ट UPI QR गेटवे जल्द उपलब्ध होगा
                  </h3>
                  <p className="text-xs text-amber-200/90 m-0 mt-0.5">
                    प्लेटफ़ॉर्म चालू खाता अभी सेटअप में है। आप अभी भी तुरंत प्रो प्लान सक्रिय कर सकते हैं!
                  </p>
                </div>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed m-0 bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800">
                अपनी दुकान के लिए <strong>ग्रामिन प्रो</strong> सक्रिय करने के लिए कृपया हमारे <strong>WhatsApp हेल्पलाइन</strong> पर संपर्क करें या अधिकृत डिस्ट्रीब्यूटर से प्राप्त <strong>ऑफ़लाइन वाउचर / कूपन कोड</strong> का उपयोग करें।
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleUpgradeWhatsApp}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp पर संपर्क करें (तुरंत एक्टिवेशन)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowVoucherBox(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-stone-700 active:scale-95"
                >
                  <Ticket className="w-4 h-4 text-amber-400" />
                  <span>वाउचर कोड दर्ज करें</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Support & Offline Voucher Dropdown */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={handleUpgradeWhatsApp}
              className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp सहायता केंद्र (Help & Support)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVoucherBox(!showVoucherBox)}
              className="text-xs text-stone-600 font-bold flex items-center gap-1 hover:text-stone-900 cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-600" />
              <span>{showVoucherBox ? 'कूपन बॉक्स छिपाएं' : 'कूपन या वाउचर कोड है?'}</span>
            </button>
          </div>

          {/* Voucher Box Section (Collapsible) */}
          {showVoucherBox && (
            <div className="bg-amber-50/70 rounded-2xl p-4 border border-amber-300/80 space-y-2.5 animate-fadeIn">
              <div className="text-xs font-black text-amber-950">
                ऑफलाइन कूपन या एक्टिवेशन कोड (Voucher Code)
              </div>
              <p className="text-[11px] text-stone-600 m-0">
                डिस्ट्रीब्यूटर द्वारा दिया गया प्रोमो कोड (जैसे: GRAMIN99, KIRANA-PRO-30) दर्ज करें:
              </p>
              <form onSubmit={handleRedeemCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="उदा: GRAMIN99"
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
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
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
          )}

          {/* Feature Highlights Grid */}
          <div className="bg-[#faf8f3] rounded-3xl p-4 sm:p-5 border border-amber-200/70 space-y-3">
            <h3 className="text-sm font-black text-stone-900 m-0 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>प्रो प्लान में क्या-क्या मिलेगा?</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                <MessageCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">📲 WhatsApp तगादा ब्लास्ट — उधारी वसूली संदेश</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                <Cloud className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">☁️ सुरक्षित क्लाउड बैकअप — मोबाइल बदलने पर 0 डेटा नुकसान</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                <Store className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">👥 मुनीम PIN सुरक्षा — थोक खरीद भाव व लाभ गुप्त</span>
              </div>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-stone-200">
                <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">🔔 सुबह का कम-स्टॉक अलर्ट — मंडी खरीदारी आसान</span>
              </div>
            </div>
          </div>

          {/* Non-Technical Village Guarantee */}
          <div className="p-3.5 rounded-2xl bg-stone-100 border border-stone-200 flex items-center gap-3 text-stone-600 text-xs">
            <HelpCircle className="w-5 h-5 text-stone-500 flex-shrink-0" />
            <p className="m-0 leading-relaxed font-medium">
              <strong>गाँव की दुकान की गारंटी:</strong> यदि आप प्रो नहीं भी लेते हैं, तब भी आपकी ऑफ़लाइन बिलिंग, बही-खाता, और पर्ची प्रिंटिंग हमेशा 100% मुफ़्त और चालू रहेगी।
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
