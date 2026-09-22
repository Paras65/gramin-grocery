// Browser Web Speech API helper for Hindi/English voice input

export interface ParsedVoiceIntent {
  rawText: string;
  intentType: 'UDHAAR' | 'JAMA' | 'SEARCH' | 'UNKNOWN';
  customerName?: string;
  amount?: number;
  productQuery?: string;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

export function parseVoiceInput(text: string): ParsedVoiceIntent {
  const clean = text.trim();

  // Check for Udhaar pattern: e.g., "रमेश 200 उधार" or "Ramesh 200 udhaar"
  const udhaarMatch = clean.match(/^([a-zA-Z\u0900-\u097F\s]+?)\s+(\d+)\s*(?:रुपया|रुपये|रूपए|rs|inr|रू)?\s*(?:उधार|udhar|udhaar|baaki|बाकी)/i);
  if (udhaarMatch) {
    return {
      rawText: clean,
      intentType: 'UDHAAR',
      customerName: udhaarMatch[1].trim(),
      amount: parseInt(udhaarMatch[2], 10)
    };
  }

  // Check for Jama pattern: e.g., "सुरेश 500 जमा" or "Suresh 500 jama"
  const jamaMatch = clean.match(/^([a-zA-Z\u0900-\u097F\s]+?)\s+(\d+)\s*(?:रुपया|रुपये|रूपए|rs|inr|रू)?\s*(?:जमा|jama|payment|pay)/i);
  if (jamaMatch) {
    return {
      rawText: clean,
      intentType: 'JAMA',
      customerName: jamaMatch[1].trim(),
      amount: parseInt(jamaMatch[2], 10)
    };
  }

  // Check for general search
  return {
    rawText: clean,
    intentType: 'SEARCH',
    productQuery: clean
  };
}

export function startSpeechRecognition(
  lang: 'hi' | 'cg' | 'en',
  onResult: (text: string, parsed: ParsedVoiceIntent) => void,
  onError: (err: string) => void,
  onEnd: () => void
) {
  const SpeechRec = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                    (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

  if (!SpeechRec) {
    onError('Speech recognition not supported in this browser.');
    return null;
  }

  const recognition = new SpeechRec();
  recognition.lang = lang === 'en' ? 'en-IN' : 'hi-IN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    const parsed = parseVoiceInput(transcript);
    onResult(transcript, parsed);
  };

  recognition.onerror = (event: any) => {
    onError(event.error || 'Speech recognition error');
  };

  recognition.onend = () => {
    onEnd();
  };

  try {
    recognition.start();
    return recognition;
  } catch (err) {
    onError('Could not start microphone');
    return null;
  }
}
