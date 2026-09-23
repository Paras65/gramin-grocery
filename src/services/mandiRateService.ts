import { API_BASE } from '../utils/apiConfig';
import type { MandiBenchmarkRate } from '../types';

export const DEFAULT_CHHATTISGARH_BENCHMARK_RATES: MandiBenchmarkRate[] = [
  {
    id: 'mandi_sugar',
    commodity: 'शक्कर (Sugar M-30)',
    commodityKey: 'sugar',
    category: 'staples',
    unit: 'kg',
    benchmarkRate: 40,
    minRate: 39,
    maxRate: 42,
    trend: 'STABLE',
    advisory: 'स्थानीय मिलों से पर्याप्त आपूर्ति, थोक भाव स्थिर।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_soybean',
    commodity: 'सोयाबीन रिफाइंड तेल (Soybean Oil)',
    commodityKey: 'soybean_oil',
    category: 'oils',
    unit: 'liter',
    benchmarkRate: 125,
    minRate: 120,
    maxRate: 130,
    trend: 'RISING',
    advisory: 'अंतर्राष्ट्रीय तिलहन शुल्क के कारण थोक में ₹2-3 की तेज़ी।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_toor_dal',
    commodity: 'तुवर दाल फटका (Toor Dal)',
    commodityKey: 'toor_dal',
    category: 'pulses',
    unit: 'kg',
    benchmarkRate: 145,
    minRate: 140,
    maxRate: 152,
    trend: 'FALLING',
    advisory: 'नई देसी आवक शुरू होने से भाव में नरमी का रुख।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_chana_dal',
    commodity: 'चना दाल (Chana Dal)',
    commodityKey: 'chana_dal',
    category: 'pulses',
    unit: 'kg',
    benchmarkRate: 78,
    minRate: 75,
    maxRate: 82,
    trend: 'STABLE',
    advisory: 'मंडी में मांग व आपूर्ति संतुलित है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_atta',
    commodity: 'गेहूं आटा चक्की (Wheat Flour)',
    commodityKey: 'wheat_flour',
    category: 'grains',
    unit: 'kg',
    benchmarkRate: 28,
    minRate: 26,
    maxRate: 30,
    trend: 'STABLE',
    advisory: 'गोदामों से पर्याप्त गेहूं उपलब्ध, दरें सामान्य हैं।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_rice',
    commodity: 'चावल मोटा / उसना (Coarse Rice)',
    commodityKey: 'coarse_rice',
    category: 'grains',
    unit: 'kg',
    benchmarkRate: 32,
    minRate: 30,
    maxRate: 34,
    trend: 'STABLE',
    advisory: 'धान खरीदी के बाद मिलों से भरपूर स्टॉक उपलब्ध।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_potato',
    commodity: 'आलू नया (Fresh Potato)',
    commodityKey: 'potato',
    category: 'vegetables',
    unit: 'kg',
    benchmarkRate: 18,
    minRate: 15,
    maxRate: 22,
    trend: 'FALLING',
    advisory: 'लोकल बाड़ी व यूपी से बंपर आवक होने से भाव नीचे हैं।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_onion',
    commodity: 'प्याज नासिक (Nashik Onion)',
    commodityKey: 'onion',
    category: 'vegetables',
    unit: 'kg',
    benchmarkRate: 24,
    minRate: 22,
    maxRate: 28,
    trend: 'RISING',
    advisory: 'थोक मंडी में आवक थोड़ी धीमी है, 2-3 दिन बाद खरीदारी उचित।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_mustard_oil',
    commodity: 'सरसों तेल कच्ची घानी (Mustard Oil)',
    commodityKey: 'mustard_oil',
    category: 'oils',
    unit: 'liter',
    benchmarkRate: 140,
    minRate: 135,
    maxRate: 148,
    trend: 'STABLE',
    advisory: 'त्यौहारी मांग स्थिर है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
  {
    id: 'mandi_garlic',
    commodity: 'लहसुन देसी (Garlic)',
    commodityKey: 'garlic',
    category: 'spices',
    unit: 'kg',
    benchmarkRate: 110,
    minRate: 95,
    maxRate: 130,
    trend: 'RISING',
    advisory: 'माल सीमित आने से थोक भाव में तेज़ी है।',
    scope: 'STATE_WIDE',
    district: 'ALL',
  },
];

class MandiRateService {
  private cacheKey = 'gk_mandi_benchmark_rates';

  /**
   * Get cached rates from localStorage or fallback defaults
   */
  public getCachedRates(): MandiBenchmarkRate[] {
    if (typeof window === 'undefined') return DEFAULT_CHHATTISGARH_BENCHMARK_RATES;
    const raw = localStorage.getItem(this.cacheKey);
    if (!raw) return DEFAULT_CHHATTISGARH_BENCHMARK_RATES;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CHHATTISGARH_BENCHMARK_RATES;
    } catch {
      return DEFAULT_CHHATTISGARH_BENCHMARK_RATES;
    }
  }

  /**
   * Fetch current benchmark rates from server, with fallback to local cache
   */
  public async fetchBenchmarkRates(): Promise<MandiBenchmarkRate[]> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gk_auth_token') : null;
    const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const res = await fetch(`${API_BASE}/tenant/mandi-rates`, { headers });
      if (!res.ok) {
        return this.getCachedRates();
      }

      const data = await res.json();
      if (data?.rates && Array.isArray(data.rates) && data.rates.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.cacheKey, JSON.stringify(data.rates));
        }
        return data.rates;
      }
      return this.getCachedRates();
    } catch {
      return this.getCachedRates();
    }
  }

  /**
   * Match an inventory product or item row to a benchmark rate commodity
   */
  public matchBenchmarkRate(name: string, hindiName = '', rates: MandiBenchmarkRate[]): MandiBenchmarkRate | null {
    const text = `${name} ${hindiName}`.toLowerCase();

    // Specific staple matching dictionary
    const patterns: Array<{ keys: string[]; commodityKey: string }> = [
      { keys: ['शक्कर', 'चीनी', 'sugar', 'sakkar'], commodityKey: 'sugar' },
      { keys: ['सोयाबीन तेल', 'soyabean', 'soybean', 'refine'], commodityKey: 'soybean_oil' },
      { keys: ['सरसों तेल', 'sarso', 'mustard', 'rai tel'], commodityKey: 'mustard_oil' },
      { keys: ['तुवर', 'अरहर', 'toor', 'arhar', 'tuvar'], commodityKey: 'toor_dal' },
      { keys: ['चना दाल', 'chana dal', 'chana'], commodityKey: 'chana_dal' },
      { keys: ['गेहूं आटा', 'आटा', 'atta', 'flour', 'gehu atta'], commodityKey: 'wheat_flour' },
      { keys: ['चावल', 'मोटा चावल', 'उसना', 'rice'], commodityKey: 'coarse_rice' },
      { keys: ['आलू', 'potato', 'aloo'], commodityKey: 'potato' },
      { keys: ['प्याज', 'प्याज़', 'onion', 'pyaj'], commodityKey: 'onion' },
      { keys: ['लहसुन', 'garlic', 'lahsun'], commodityKey: 'garlic' },
    ];

    for (const pat of patterns) {
      if (pat.keys.some(k => text.includes(k))) {
        const found = rates.find(r => r.commodityKey === pat.commodityKey);
        if (found) return found;
      }
    }

    // Direct partial match on commodity name
    for (const rate of rates) {
      const commParts = rate.commodity.toLowerCase().split(/[\s()]+/);
      for (const part of commParts) {
        if (part.length >= 3 && text.includes(part)) {
          return rate;
        }
      }
    }

    return null;
  }

  /**
   * Compare proposed wholesale rate with Mandi benchmark rate
   */
  public compareRate(wholesaleRate: number, benchmarkRate: number) {
    if (!wholesaleRate || !benchmarkRate) {
      return { diff: 0, percent: 0, isHigher: false, isLower: false, isFair: true };
    }

    const diff = Math.round((wholesaleRate - benchmarkRate) * 100) / 100;
    const percent = Math.round((diff / benchmarkRate) * 100);
    const isHigher = diff > 0 && percent >= 3;
    const isLower = diff < 0 && percent <= -3;
    const isFair = !isHigher && !isLower;

    return { diff, percent, isHigher, isLower, isFair };
  }
}

export const mandiRateService = new MandiRateService();

