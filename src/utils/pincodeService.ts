/**
 * pincodeService.ts — Zero-API-Key Dynamic Postal Pincode Lookup
 * Uses India Post's public directory (api.postalpincode.in) with instant offline fallback
 * and caching for responsive rural onboarding.
 */

export interface PincodeLookupResult {
  pincode: string;
  district: string;
  block: string;
  state: string;
  villages: string[];
}

// In-memory cache for ultra-fast repeated lookups
const pincodeCache = new Map<string, PincodeLookupResult>();

// Offline fallback table for primary Chhattisgarh hub pincodes
const OFFLINE_PINCODE_MAP: Record<string, Omit<PincodeLookupResult, 'pincode'>> = {
  '493441': {
    district: 'रायपुर (Raipur)',
    block: 'आरंग (Arang)',
    state: 'छत्तीसगढ़',
    villages: ['आरंग', 'भानसोज', 'लखोली', 'गुल्लू', 'रसनी', 'समोदा', 'गौड़भाट', 'परसदा']
  },
  '492001': {
    district: 'रायपुर (Raipur)',
    block: 'रायपुर शहर',
    state: 'छत्तीसगढ़',
    villages: ['सदर बाज़ार', 'मालवीय रोड', 'फाफाडीह', 'तेलीबांधा', 'पंडरी', 'देवेंद्र नगर']
  },
  '493221': {
    district: 'रायपुर (Raipur)',
    block: 'अभनपुर (Abhanpur)',
    state: 'छत्तीसगढ़',
    villages: ['अभनपुर', 'गोबरा नवापारा', 'उपरवारा', 'खोखली', 'माणिकचौरी']
  },
  '491001': {
    district: 'दुर्ग (Durg)',
    block: 'दुर्ग शहर',
    state: 'छत्तीसगढ़',
    villages: ['दुर्ग', 'भिलाई', 'नेहरू नगर', 'सुपेला', 'पाटन']
  },
  '491111': {
    district: 'दुर्ग (Durg)',
    block: 'पाटन (Patan)',
    state: 'छत्तीसगढ़',
    villages: ['पाटन', 'जामगांव', 'रानीतराई', 'उतई', 'सेलूद']
  },
  '495001': {
    district: 'बिलासपुर (Bilaspur)',
    block: 'बिलासपुर शहर',
    state: 'छत्तीसगढ़',
    villages: ['गोल बाज़ार', 'तखतपुर', 'कोटा', 'बिल्हा', 'मस्तूरी']
  },
  '494001': {
    district: 'बस्तर (Bastar)',
    block: 'जगदलपुर (Jagdalpur)',
    state: 'छत्तीसगढ़',
    villages: ['जगदलपुर', 'बस्तर', 'तोकापाल', 'लोहंडीगुड़ा', 'बकावंड']
  },
  '491441': {
    district: 'राजनांदगांव (Rajnandgaon)',
    block: 'राजनांदगांव',
    state: 'छत्तीसगढ़',
    villages: ['राजनांदगांव', 'डोंगरगढ़', 'डोंगरगांव', 'चौकी', 'छुरिया']
  },
  '495668': {
    district: 'जांजगीर-चांपा (Janjgir)',
    block: 'चांपा',
    state: 'छत्तीसगढ़',
    villages: ['चांपा', 'जांजगीर', 'नैला', 'अकलतरा', 'सक्ती']
  }
};

/**
 * Lookup Indian postal pincode dynamically without an API key
 * Returns district, block, state, and village/post-office list.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLookupResult | null> {
  const clean = pincode.replace(/\D/g, '').trim();
  if (clean.length !== 6) return null;

  // 1. Check in-memory cache
  if (pincodeCache.has(clean)) {
    return pincodeCache.get(clean)!;
  }

  // 2. Query public India Post directory with 3.5s timeout guard
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://api.postalpincode.in/pincode/${clean}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.Status === 'Success' && Array.isArray(data[0].PostOffice)) {
        const offices = data[0].PostOffice;
        const primary = offices[0];
        
        // Extract distinct village/office names
        const villages: string[] = Array.from(
          new Set(offices.map((o: any) => o.Name).filter(Boolean))
        );

        const result: PincodeLookupResult = {
          pincode: clean,
          district: primary.District || '',
          block: primary.Block && primary.Block !== 'NA' ? primary.Block : primary.Division || primary.District || '',
          state: primary.State || 'India',
          villages
        };

        pincodeCache.set(clean, result);
        return result;
      }
    }
  } catch (err) {
    // Network offline or timeout - fallback safely
    console.warn('Public pincode lookup offline/aborted, checking local offline map:', err);
  }

  // 3. Fallback to offline map if available
  if (OFFLINE_PINCODE_MAP[clean]) {
    const fallback = {
      pincode: clean,
      ...OFFLINE_PINCODE_MAP[clean]
    };
    pincodeCache.set(clean, fallback);
    return fallback;
  }

  return null;
}

