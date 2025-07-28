# Multi-Currency Mortgage Calculator Design Document

## 🌍 Overview

Adding multi-currency support to the mortgage calculator with user-defined exchange rates, allowing for flexible currency conversions without relying on external APIs.

## 🎯 Design Goals

1. **User Control**: Let users define their own exchange rates
2. **No API Dependency**: Work offline, no API keys needed
3. **Flexible Display**: View results in source or target currency
4. **Simple UX**: Don't overwhelm users who only need single currency

## 💡 Design Approach

### Option 1: Manual Exchange Rate Input (Recommended)
```
┌─────────────────────────────────────────────────┐
│ STEP 1: Property Details                        │
│                                                 │
│ Currency: [USD ▼] → [EUR ▼]                   │
│ Exchange Rate: [1 USD = ] [0.92] EUR           │
│ 💡 Today's rate: ~0.92 (verify with your bank) │
│                                                 │
│ Home Price: [$500,000] USD                     │
│            = €460,000 EUR                       │
│                                                 │
│ Down Payment: [20%] = $100,000 USD             │
│              = €92,000 EUR                      │
└─────────────────────────────────────────────────┘
```

### Option 2: Preset Exchange Rates with Override
```
┌─────────────────────────────────────────────────┐
│ Currency Settings ⚙️                             │
│                                                 │
│ From: [USD ▼] To: [EUR ▼]                     │
│                                                 │
│ Exchange Rate:                                  │
│ ⚪ Market Rate (API) - 0.92                    │
│ ⚫ Custom Rate: [0.95]                         │
│ ⚪ Bank Rate: [    ] + fees [2.5]%            │
│                                                 │
│ 💡 Banks often charge 2-3% above market rate   │
└─────────────────────────────────────────────────┘
```

### Option 3: Multi-Currency Display Toggle
```
┌─────────────────────────────────────────────────┐
│ YOUR MONTHLY PAYMENT                            │
│                                                 │
│ Display in: [⚫ USD] [⚪ EUR] [⚪ Both]         │
│                                                 │
│ $2,528.27 USD                                   │
│ €2,326.01 EUR                                   │
│                                                 │
│ Total Cost: $910,177.95 | €837,363.71          │
└─────────────────────────────────────────────────┘
```

## 📊 Implementation Details

### 1. **Currency Data Structure**
```typescript
interface CurrencyConfig {
  baseCurrency: string;        // e.g., "USD"
  targetCurrency?: string;     // e.g., "EUR"
  exchangeRate?: number;       // e.g., 0.92
  rateType: 'market' | 'custom' | 'bank';
  bankFeePercent?: number;     // e.g., 2.5
  lastUpdated?: Date;
}

interface MultiCurrencyResults extends MortgageResults {
  baseCurrency: string;
  amounts: {
    homePrice: CurrencyAmount;
    downPayment: CurrencyAmount;
    loanAmount: CurrencyAmount;
    monthlyPayment: CurrencyAmount;
    totalPayment: CurrencyAmount;
    totalInterest: CurrencyAmount;
  };
}

interface CurrencyAmount {
  base: number;        // Amount in base currency
  target?: number;     // Amount in target currency
  display: string;     // Formatted string
}
```

### 2. **UI Flow**

#### Minimal Mode (Default)
- Single currency selector
- No exchange rate visible
- Standard calculator behavior

#### Exchange Mode (Toggle)
- Two currency selectors appear
- Exchange rate input field
- Real-time conversion display
- "Flip currencies" button

### 3. **Popular Currency Pairs**
Pre-populate common scenarios:
- **Expat/Immigration**: USD ↔ EUR, GBP ↔ USD, AUD ↔ USD
- **Cross-border Property**: USD ↔ MXN, USD ↔ CAD, EUR ↔ GBP
- **Investment Property**: Local ↔ USD (international benchmark)

### 4. **Exchange Rate Helpers**

```yaml
Quick Actions:
- [Get Current Rate] → Opens exchange rate website
- [Use Bank Rate] → Adds typical bank margin
- [Save Rate] → Store for future use
- [Rate History] → Show saved rates

Rate Validation:
- Warning if rate seems unusual (>20% from typical)
- Show inverse rate for verification
- Date stamp when rate was entered
```

## 🎨 UI Components

### Currency Selector Design
```
┌─────────────────┐
│ 🇺🇸 USD ($) ▼   │  → Flag + Code + Symbol
├─────────────────┤
│ 🇪🇺 EUR (€)     │
│ 🇬🇧 GBP (£)     │
│ 🇨🇦 CAD (C$)    │
│ 🇦🇺 AUD (A$)    │
│ 🇲🇽 MXN (MX$)   │
│ 🇯🇵 JPY (¥)     │
│ 🇨🇳 CNY (¥)     │
│ 🇮🇳 INR (₹)     │
│ 🇧🇷 BRL (R$)    │
│ [+ Add Currency]│
└─────────────────┘
```

### Exchange Rate Input
```
┌────────────────────────────────────┐
│ Exchange Rate:                     │
│ 1 [USD ▼] = [0.92000] [EUR ▼]    │
│                                    │
│ ↔️ Flip | 📋 Copy | 📅 Today?     │
└────────────────────────────────────┘
```

## 🔧 Features

### 1. **Smart Defaults**
- Detect user's locale for default currency
- Remember last used currencies
- Auto-fill common exchange rates

### 2. **Validation & Helpers**
- Validate exchange rate reasonableness
- Show purchasing power indicators
- Currency-specific formatting (decimals, thousands)

### 3. **Export Options**
- CSV includes both currencies
- PDF shows selected display currency
- Share link includes exchange rate

### 4. **Advanced Features**
- **Scenario Comparison**: Compare properties in different countries
- **Exchange Rate Sensitivity**: Show how rate changes affect affordability
- **Income Conversion**: Convert salary for DTI calculations

## 💾 Data Storage

### LocalStorage Schema
```javascript
{
  "mortgageCalc_currencies": {
    "default": "USD",
    "recent": ["USD", "EUR", "GBP"],
    "rates": {
      "USD_EUR": {
        "rate": 0.92,
        "date": "2024-01-15",
        "type": "custom"
      }
    }
  }
}
```

## 🌐 Free Exchange Rate Options (If Needed)

### Client-Side APIs (No Server Required):

1. **ExchangeRate-API** (Free tier: 1,500 requests/month)
   ```javascript
   fetch('https://api.exchangerate-api.com/v4/latest/USD')
   ```

2. **Fixer.io** (Free tier: 100 requests/month)
   ```javascript
   fetch('https://api.fixer.io/latest?base=USD&access_key=YOUR_KEY')
   ```

3. **CurrencyAPI** (Free tier: 300 requests/month)
   ```javascript
   fetch('https://api.currencyapi.com/v3/latest?apikey=YOUR_KEY')
   ```

4. **European Central Bank** (Free, XML format)
   ```javascript
   fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml')
   ```

### Fallback Strategy
```javascript
// Fallback exchange rates (updated quarterly)
const FALLBACK_RATES = {
  'USD': { 'EUR': 0.92, 'GBP': 0.79, 'CAD': 1.35, 'AUD': 1.52 },
  'EUR': { 'USD': 1.09, 'GBP': 0.86, 'CHF': 0.98 },
  // ... more pairs
  'lastUpdated': '2024-01-15'
};
```

## 🚀 Implementation Phases

### Phase 1: Basic Multi-Currency (2 days)
- Currency selectors
- Manual exchange rate input
- Display toggle (base/target/both)
- Update calculations

### Phase 2: Enhanced UX (1 day)
- Exchange rate validation
- Quick actions (flip, today's rate)
- Save/load rates
- Better formatting

### Phase 3: Advanced Features (2 days)
- Multi-currency comparison
- Rate sensitivity analysis
- API integration (optional)
- Export with currencies

## 🎯 Benefits

1. **Flexibility**: Users control exchange rates based on their actual situation
2. **Accuracy**: Bank rates often differ from market rates
3. **Privacy**: No external API calls with financial data
4. **Offline**: Works without internet connection
5. **Educational**: Shows true cost in familiar currency

## 🤔 Considerations

### Pros of Manual Rates:
- User knows their actual bank rate
- No API limits or keys
- Works offline
- More accurate for user's situation

### Cons of Manual Rates:
- User must look up rates
- Rates can become outdated
- More input required

### Hybrid Approach:
- Offer both manual and API options
- Cache API rates locally
- Show "last updated" clearly
- Let advanced users override

## 📝 Example Use Cases

1. **US Citizen Buying in Mexico**
   - Income in USD, property in MXN
   - Bank charges 3% conversion fee
   - Wants to see monthly payment in USD

2. **European Investing in US Property**
   - Comparing properties in different states
   - Income in EUR, loans in USD
   - Needs to factor exchange rate risk

3. **International Remote Worker**
   - Paid in USD, buying locally
   - Wants to ensure affordability
   - Exchange rate fluctuations matter

## 💡 Final Recommendation

**Implement Manual Exchange Rate Input** with these features:
1. Optional currency conversion (hidden by default)
2. User enters their own exchange rate
3. Display results in either or both currencies
4. Save rates for future use
5. Provide links to check current rates
6. Add "bank rate calculator" (market + fee%)

This approach gives users full control while keeping the interface simple for those who don't need currency conversion.