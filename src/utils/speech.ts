// Browser Web Speech API helper for Hindi/English voice input

export interface ParsedVoiceIntent {
  rawText: string;
  intentType: 'UDHAAR' | 'JAMA' | 'BILL_ITEM' | 'SEARCH' | 'UNKNOWN';
  customerName?: string;
  amount?: number;
  productQuery?: string;
  quantity?: number;
  unit?: string;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
}

// Rural dialect quantity parser (पाव, अधिया, पसेरी, बोरी, किलो)
export function parseRuralQuantity(text: string): { quantity: number; unit: string; product: string } | null {
  const clean = text.trim();

  // 1. पाव भर / एक पाव -> 0.25 kg
  const pavMatch = clean.match(/(?:एक\s+)?(?:पाव\s*भर|पाव|paav)\s+(.+)/i);
  if (pavMatch) {
    return { quantity: 0.25, unit: 'kg', product: pavMatch[1].trim() };
  }

  // 2. आधा किलो / अधिया -> 0.5 kg
  const adhiyaMatch = clean.match(/(?:आधा\s+किलो|अधिया|adhiya|aadha\s+kilo)\s+(.+)/i);
  if (adhiyaMatch) {
    return { quantity: 0.5, unit: 'kg', product: adhiyaMatch[1].trim() };
  }

  // 3. तीन पाव -> 0.75 kg
  const teenPavMatch = clean.match(/(?:तीन\s+पाव|teen\s+paav)\s+(.+)/i);
  if (teenPavMatch) {
    return { quantity: 0.75, unit: 'kg', product: teenPavMatch[1].trim() };
  }

  // 4. पसेरी -> 5 kg
  const paseriMatch = clean.match(/(?:एक\s+)?(?:पसेरी|paseri)\s+(.+)/i);
  if (paseriMatch) {
    return { quantity: 5, unit: 'kg', product: paseriMatch[1].trim() };
  }

  // 5. बोरी / कट्टा -> 50 kg
  const boriMatch = clean.match(/(?:एक\s+)?(?:बोरी|कट्टा|bori)\s+(.+)/i);
  if (boriMatch) {
    return { quantity: 50, unit: 'kg', product: boriMatch[1].trim() };
  }

  // 6. N किलो / लीटर / पैकेट -> e.g. "दो किलो शक्कर" or "2 किलो शक्कर"
  const hindiNumbers: Record<string, number> = {
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
    'छह': 6, 'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10
  };
  const numQtyMatch = clean.match(/^(\d+|एक|दो|तीन|चार|पांच|पाँच|छह|सात|आठ|नौ|दस)\s+(किलो|लीटर|पैकेट|kg|liter|packet)\s+(.+)/i);
  if (numQtyMatch) {
    const rawNum = numQtyMatch[1].toLowerCase();
    const qty = hindiNumbers[rawNum] || parseFloat(rawNum) || 1;
    const rawUnit = numQtyMatch[2].toLowerCase();
    const unit = (rawUnit === 'लीटर' || rawUnit === 'liter') ? 'liter' : (rawUnit === 'पैकेट' || rawUnit === 'packet') ? 'packet' : 'kg';
    return { quantity: qty, unit, product: numQtyMatch[3].trim() };
  }

  return null;
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

  // Check for Rural quantity bill item pattern
  const ruralQty = parseRuralQuantity(clean);
  if (ruralQty) {
    return {
      rawText: clean,
      intentType: 'BILL_ITEM',
      productQuery: ruralQty.product,
      quantity: ruralQty.quantity,
      unit: ruralQty.unit
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
