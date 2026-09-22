import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Flashlight, FlashlightOff, AlertCircle, CheckCircle, Keyboard } from 'lucide-react';
import { db } from '../../db';
import type { Product } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (product: Product) => void;
}

// Global ambient shim for BarcodeDetector API
interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorShim {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorShim;
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

// Web Audio API beep sound for POS barcode confirmation
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, ctx.currentTime); // Crisp Kirana POS beep
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Ignore audio failures if restricted by user gesture policy
  }
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductScanned,
}) => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const animationFrameIdRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string>('');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [canTorch, setCanTorch] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [lastScannedMsg, setLastScannedMsg] = useState<{ name: string; price: number } | null>(null);
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState<boolean>(true);

  // Stop camera helper
  const stopCamera = () => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    isDetectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  // Find product and trigger callback
  const handleBarcodeMatched = useCallback(async (code: string) => {
    // Look up by barcode first, then by id if matches format
    let matched = await db.products.where('barcode').equals(code).first();
    if (!matched) {
      matched = await db.products.where('id').equals(code).first();
    }

    if (matched) {
      playBeep();
      onProductScanned(matched);
      setLastScannedMsg({
        name: language === 'hi' ? matched.hindiName : matched.name,
        price: matched.sellingPrice,
      });
      setTimeout(() => setLastScannedMsg(null), 2500);
    } else {
      setCameraError(`बारकोड "${code}" से कोई सामान नहीं मिला। कृपया स्टॉक लिस्ट में जोड़ें।`);
      setTimeout(() => setCameraError(''), 3500);
    }
  }, [language, onProductScanned]);

  // Continuous frame analysis
  const startScanLoop = useCallback((detector: BarcodeDetectorShim) => {
    const scanFrame = async () => {
      if (!isDetectingRef.current || !videoRef.current) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue.trim();
            if (raw) {
              await handleBarcodeMatched(raw);
              // Small debounce throttle before scanning next item
              await new Promise(r => setTimeout(r, 900));
            }
          }
        } catch {
          // Ignore transient detection errors on blurred frames
        }
      }

      if (isDetectingRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [handleBarcodeMatched]);

  const initCamera = useCallback(async () => {
    try {
      setCameraError('');
      setHasCamera(true);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
      if (capabilities.torch) {
        setCanTorch(true);
      }

      // Initialize BarcodeDetector loop
      if ('BarcodeDetector' in window && window.BarcodeDetector) {
        setIsBarcodeDetectorSupported(true);
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });

        isDetectingRef.current = true;
        startScanLoop(detector);
      } else {
        setIsBarcodeDetectorSupported(false);
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setCameraError('कैमरा चालू नहीं हो सका। कृपया अनुमति (Permission) दें या नीचे बारकोड नंबर डालें।');
    }
  }, [startScanLoop]);

  // Start camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setLastScannedMsg(null);
      setCameraError('');
      return;
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, initCamera]);

  // Manual barcode submission (or USB handheld scanner input)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    handleBarcodeMatched(clean);
    setManualCode('');
  };

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as unknown as { applyConstraints(c: unknown): Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="village-header-gradient text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-sm sm:text-base tracking-tight m-0">
              बारकोड स्कैनर (POS Scanner)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Viewport */}
        <div className="relative bg-black flex items-center justify-center overflow-hidden aspect-4/3">
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-stone-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-30 text-stone-500" />
              <p className="text-xs">कैमरा अनुपलब्ध है</p>
            </div>
          )}

          {/* Aiming Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-36 border-2 border-amber-400/80 rounded-2xl relative shadow-lg">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

              {/* Red laser scanning guide line */}
              <div className="w-full h-0.5 bg-red-500/80 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-sm" />
            </div>
          </div>

          {/* Flashlight button */}
          {canTorch && (
            <button
              onClick={toggleTorch}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-stone-900/70 text-white hover:bg-stone-800 cursor-pointer backdrop-blur-xs transition-colors"
              title={torchOn ? 'टॉर्च बंद' : 'टॉर्च चालू'}
            >
              {torchOn ? <Flashlight className="w-4 h-4 text-amber-400" /> : <FlashlightOff className="w-4 h-4" />}
            </button>
          )}

          {/* Success Overlay Pill */}
          {lastScannedMsg && (
            <div className="absolute bottom-3 left-3 right-3 bg-emerald-600/95 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-between shadow-lg backdrop-blur-xs animate-bounce">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">{lastScannedMsg.name}</span>
              </div>
              <span className="text-amber-200 shrink-0 font-bold ml-2">₹{lastScannedMsg.price} जोड़ दिया!</span>
            </div>
          )}
        </div>

        {/* Error / Warning Notice */}
        {/* Error / Warning Notice with Visual Permission Guide */}
        {cameraError && (
          <div className="bg-rose-50 border-y border-rose-200 px-4 py-3 text-xs text-rose-900 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="leading-tight">{cameraError}</span>
              </div>
              <button
                onClick={initCamera}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
              >
                पुनः प्रयास करें
              </button>
            </div>
            {!hasCamera && (
              <div className="bg-white/80 p-2.5 rounded-xl border border-rose-200 text-[11px] text-stone-700 space-y-1">
                <div className="font-bold text-stone-900">कैमरा अनुमति चालू करने के 3 आसान चरण:</div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-rose-700">1.</span>
                  <span>ब्राउज़र के ऊपर एड्रेस बार में 🔒 (Lock) या 'साइट सेटिंग्स' पर क्लिक करें।</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-rose-700">2.</span>
                  <span><strong>Camera (कैमरा)</strong> विकल्प को <strong>'Allow' (अनुमति दें)</strong> पर सेट करें।</span>
                </div>
                <div className="flex items-start gap-1">
                  <span className="font-bold text-rose-700">3.</span>
                  <span>ऊपर <strong>पुनः प्रयास करें</strong> दबाएं या पेज को रीफ्रेश करें।</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Barcode Entry Fallback (also accepts USB Barcode Scanners!) */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
          {!isBarcodeDetectorSupported && hasCamera && (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg leading-tight">
              💡 इस ब्राउज़र में ऑटो-डिटेक्टर नहीं है। कृपया नीचे बारकोड नंबर डालें या USB स्कैनर का उपयोग करें।
            </p>
          )}

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="बारकोड नंबर या USB स्कैनर..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-stone-300 rounded-xl focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-200 font-mono"
              />
            </div>
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shrink-0"
            >
              जोड़ें
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
            <span>दुकान के पैकेट सामान: पार्ले-जी, घड़ी, रिन, टाटा नमक</span>
            <button
              onClick={onClose}
              className="font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
            >
              पूर्ण
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

