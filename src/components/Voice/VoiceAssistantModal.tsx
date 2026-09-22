import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Check, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';
import { db } from '../../db';
import { startSpeechRecognition, isSpeechSupported, type ParsedVoiceIntent } from '../../utils/speech';
import { useLanguage } from '../../context/LanguageContext';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySearch: (query: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplySearch,
  onNavigateTab
}) => {
  const { language, t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedVoiceIntent | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      handleStartListening();
    } else {
      handleStopListening();
    }
  }, [isOpen]);

  const handleStartListening = () => {
    if (!isSpeechSupported()) {
      setErrorMsg('इस ब्राउज़र में आवाज़ पहचान (Web Speech) उपलब्ध नहीं है। Chrome या Edge का उपयोग करें।');
      return;
    }

    setErrorMsg('');
    setTranscript('');
    setParsedIntent(null);
    setIsListening(true);

    const instance = startSpeechRecognition(
      language,
      (text, parsed) => {
        setTranscript(text);
        setParsedIntent(parsed);
      },
      (err) => {
        setErrorMsg(`माइक त्रुटि: ${err}`);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    setRecognitionInstance(instance);
  };

  const handleStopListening = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (_) {}
    }
    setIsListening(false);
  };

  const handleExecuteIntent = async () => {
    if (!parsedIntent) return;

    if (parsedIntent.intentType === 'SEARCH' && parsedIntent.productQuery) {
      onApplySearch(parsedIntent.productQuery);
      onNavigateTab('pos');
      onClose();
    } else if ((parsedIntent.intentType === 'UDHAAR' || parsedIntent.intentType === 'JAMA') && parsedIntent.customerName && parsedIntent.amount) {
      // Find matching customer
      const customers = await db.customers.toArray();
      const match = customers.find(c => 
        c.name.toLowerCase().includes(parsedIntent.customerName!.toLowerCase())
      );

      if (match && match.id) {
        const newBal = parsedIntent.intentType === 'JAMA'
          ? Math.max(0, match.balanceDue - parsedIntent.amount)
          : match.balanceDue + parsedIntent.amount;

        await db.customers.update(match.id, {
          balanceDue: newBal,
          updatedAt: new Date().toISOString()
        });

        await db.transactions.add({
          id: 'txn_' + Math.random().toString(36).substring(2, 9),
          customerId: match.id,
          type: parsedIntent.intentType,
          amount: parsedIntent.amount,
          timestamp: new Date().toISOString(),
          note: `आवाज़ द्वारा दर्ज (${parsedIntent.rawText})`
        });

        alert(`सफलतापूर्वक दर्ज हुआ: ${match.name} का ₹${parsedIntent.amount} ${parsedIntent.intentType === 'JAMA' ? 'जमा' : 'उधार'} हुआ।`);
        onNavigateTab('khata');
        onClose();
      } else {
        alert(`ग्राहक "${parsedIntent.customerName}" नहीं मिला। कृपया बही-खाते में नाम चेक करें।`);
        onNavigateTab('khata');
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 text-center relative overflow-hidden">
        {/* Decorative ambient gradient */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              आवाज़ सहायक (Voice Helper)
            </span>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Big Mic Button with Audio Wave animation */}
          <div className="my-6 flex justify-center">
            <button
              onClick={isListening ? handleStopListening : handleStartListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white ring-8 ring-rose-200 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-100'
              }`}
            >
              {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
            </button>
          </div>

          <p className="font-semibold text-stone-800 text-sm mb-1">
            {isListening ? t.voice.listening : 'माइक बंद है। बोलने के लिए बटन दबाएं।'}
          </p>

          {/* Live Transcript Display */}
          <div className="min-h-[60px] bg-stone-50 p-3 rounded-2xl border border-stone-200 flex items-center justify-center text-center my-3">
            {transcript ? (
              <div className="space-y-1">
                <div className="text-xs text-stone-400">सुनाई दिया:</div>
                <div className="text-sm font-bold text-stone-900">"{transcript}"</div>
              </div>
            ) : (
              <span className="text-xs text-stone-400 italic">
                {errorMsg || 'उदा. "रमेश 200 उधार" या "सरसों तेल" बोलें...'}
              </span>
            )}
          </div>

          {/* Parsed Intent Card */}
          {parsedIntent && (
            <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl text-left text-xs mb-4 space-y-1.5">
              <div className="font-bold text-emerald-950 flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-700" />
                <span>कार्रवाई समझी गई:</span>
              </div>
              {parsedIntent.intentType === 'UDHAAR' && (
                <div className="text-stone-800">
                  ग्राहक: <b className="text-stone-900">{parsedIntent.customerName}</b> के खाते में <b className="text-rose-700">₹{parsedIntent.amount} उधार</b> जोड़ना।
                </div>
              )}
              {parsedIntent.intentType === 'JAMA' && (
                <div className="text-stone-800">
                  ग्राहक: <b className="text-stone-900">{parsedIntent.customerName}</b> का <b className="text-emerald-700">₹{parsedIntent.amount} जमा</b> करना।
                </div>
              )}
              {parsedIntent.intentType === 'SEARCH' && (
                <div className="text-stone-800">
                  बिलिंग में <b className="text-emerald-800">"{parsedIntent.productQuery}"</b> खोजना।
                </div>
              )}

              <button
                onClick={handleExecuteIntent}
                className="mt-2 w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <span>यह लागू करें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Help Tips */}
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-left text-[11px] text-amber-900 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>{t.voice.help}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

