export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
  isUserOverride?: boolean;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  MXN: { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2 },
  COP: { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', decimals: 0 },
  ARS: { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso', decimals: 2 },
  CLP: { code: 'CLP', symbol: 'CL$', name: 'Chilean Peso', decimals: 0 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2 }
};

const CACHE_KEY = 'mortgageCalc_exchangeRates';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class CurrencyService {
  private static instance: CurrencyService;
  
  private constructor() {}
  
  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }
  
  async getExchangeRates(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    // Check cache first
    const cached = this.getCachedRates(baseCurrency);
    if (cached && !this.isCacheExpired(cached)) {
      return cached;
    }
    
    // Fetch from API
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      const rates: ExchangeRates = {
        base: data.base,
        date: data.date,
        rates: data.rates,
        timestamp: Date.now(),
        isUserOverride: false
      };
      
      // Cache the rates
      this.cacheRates(baseCurrency, rates);
      return rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      // Return cached data even if expired, or fallback rates
      return cached || this.getFallbackRates(baseCurrency);
    }
  }
  
  saveUserRate(fromCurrency: string, toCurrency: string, rate: number): void {
    const cached = this.getCachedRates(fromCurrency) || this.getFallbackRates(fromCurrency);
    cached.rates[toCurrency] = rate;
    cached.isUserOverride = true;
    cached.timestamp = Date.now();
    this.cacheRates(fromCurrency, cached);
  }
  
  clearUserOverrides(): void {
    localStorage.removeItem(CACHE_KEY);
  }
  
  formatCurrency(amount: number, currencyCode: string): string {
    const currency = CURRENCIES[currencyCode];
    if (!currency) return amount.toFixed(2);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals
    }).format(amount);
  }
  
  convertAmount(amount: number, fromCurrency: string, toCurrency: string, rates: ExchangeRates): number {
    if (fromCurrency === toCurrency) return amount;
    
    // If we have direct rate
    if (rates.base === fromCurrency && rates.rates[toCurrency]) {
      return amount * rates.rates[toCurrency];
    }
    
    // If we need to convert through base currency
    if (rates.base !== fromCurrency) {
      // First convert to base currency
      const toBase = amount / rates.rates[fromCurrency];
      // Then convert to target currency
      return toBase * rates.rates[toCurrency];
    }
    
    return amount;
  }
  
  private getCachedRates(baseCurrency: string): ExchangeRates | null {
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${baseCurrency}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Error reading cached rates:', error);
    }
    return null;
  }
  
  private cacheRates(baseCurrency: string, rates: ExchangeRates): void {
    try {
      localStorage.setItem(`${CACHE_KEY}_${baseCurrency}`, JSON.stringify(rates));
    } catch (error) {
      console.error('Error caching rates:', error);
    }
  }
  
  private isCacheExpired(cached: ExchangeRates): boolean {
    return Date.now() - cached.timestamp > CACHE_DURATION;
  }
  
  private getFallbackRates(baseCurrency: string): ExchangeRates {
    // Fallback rates (approximate as of 2024)
    const fallbackRates: Record<string, Record<string, number>> = {
      USD: {
        USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.35, AUD: 1.52, JPY: 148,
        CNY: 7.2, INR: 83, MXN: 17.1, BRL: 4.9, PEN: 3.7, COP: 3900,
        ARS: 850, CLP: 900, CHF: 0.87, SEK: 10.5, NOK: 10.6, DKK: 6.9,
        PLN: 4.0, RUB: 90, ZAR: 18.8, KRW: 1330, SGD: 1.34, HKD: 7.83,
        NZD: 1.63, THB: 35.5, MYR: 4.7, PHP: 56, IDR: 15600, VND: 24300,
        TRY: 30, ILS: 3.7, AED: 3.67, SAR: 3.75
      }
    };
    
    // Generate rates for other base currencies
    if (!fallbackRates[baseCurrency] && fallbackRates.USD[baseCurrency]) {
      const baseRateToUSD = fallbackRates.USD[baseCurrency];
      fallbackRates[baseCurrency] = { [baseCurrency]: 1 };
      
      for (const [currency, rate] of Object.entries(fallbackRates.USD)) {
        if (currency !== baseCurrency) {
          fallbackRates[baseCurrency][currency] = rate / baseRateToUSD;
        }
      }
    }
    
    return {
      base: baseCurrency,
      date: new Date().toISOString().split('T')[0],
      rates: fallbackRates[baseCurrency] || { [baseCurrency]: 1 },
      timestamp: Date.now(),
      isUserOverride: false
    };
  }
}