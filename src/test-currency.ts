import { MortgageCalculator } from './calculator';
import { CurrencyService } from './currency-service';
import type { MortgageInput } from './types';

async function testCurrencyCalculations() {
  console.log('💱 Testing Multi-Currency Mortgage Calculator 💱');
  console.log('==============================================\n');

  const currencyService = CurrencyService.getInstance();

  // Test 1: USD to EUR conversion
  console.log('Test 1: $500,000 home with USD loan, displayed in EUR');
  console.log('----------------------------------------------');
  
  // Fetch exchange rates
  const usdRates = await currencyService.getExchangeRates('USD');
  const usdToEur = usdRates.rates.EUR || 0.92;
  console.log(`Exchange rate: 1 USD = ${usdToEur} EUR`);
  
  const test1Input: MortgageInput = {
    homePrice: 500000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 0,
    interestRate: 6.5,
    loanTermYears: 30,
    paymentFrequency: 'monthly',
    currency: 'USD',
    displayCurrency: 'EUR',
    exchangeRate: usdToEur
  };

  const calc1 = new MortgageCalculator(test1Input);
  const results1 = calc1.calculate();

  console.log('\nResults in USD:');
  console.log(`Home Price: ${currencyService.formatCurrency(results1.homePrice, 'USD')}`);
  console.log(`Down Payment: ${currencyService.formatCurrency(results1.downPaymentAmount, 'USD')}`);
  console.log(`Loan Amount: ${currencyService.formatCurrency(results1.loanAmount, 'USD')}`);
  console.log(`Monthly Payment: ${currencyService.formatCurrency(results1.regularPaymentAmount, 'USD')}`);
  console.log(`Total Interest: ${currencyService.formatCurrency(results1.totalInterest, 'USD')}`);

  if (results1.convertedAmounts) {
    console.log('\nConverted to EUR:');
    console.log(`Home Price: ${currencyService.formatCurrency(results1.convertedAmounts.homePrice, 'EUR')}`);
    console.log(`Down Payment: ${currencyService.formatCurrency(results1.convertedAmounts.downPaymentAmount, 'EUR')}`);
    console.log(`Loan Amount: ${currencyService.formatCurrency(results1.convertedAmounts.loanAmount, 'EUR')}`);
    console.log(`Monthly Payment: ${currencyService.formatCurrency(results1.convertedAmounts.regularPaymentAmount, 'EUR')}`);
    console.log(`Total Interest: ${currencyService.formatCurrency(results1.convertedAmounts.totalInterest, 'EUR')}`);
  }

  // Test 2: PEN to USD conversion
  console.log('\n\nTest 2: S/1,500,000 home in Peru, displayed in USD');
  console.log('----------------------------------------------');
  
  // const penRates = await currencyService.getExchangeRates('PEN');
  const penToUsd = 1 / (usdRates.rates.PEN || 3.7);
  console.log(`Exchange rate: 1 PEN = ${penToUsd.toFixed(4)} USD`);
  
  const test2Input: MortgageInput = {
    homePrice: 1500000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 0,
    interestRate: 8.5,
    loanTermYears: 20,
    paymentFrequency: 'monthly',
    currency: 'PEN',
    displayCurrency: 'USD',
    exchangeRate: penToUsd
  };

  const calc2 = new MortgageCalculator(test2Input);
  const results2 = calc2.calculate();

  console.log('\nResults in PEN:');
  console.log(`Home Price: ${currencyService.formatCurrency(results2.homePrice, 'PEN')}`);
  console.log(`Monthly Payment: ${currencyService.formatCurrency(results2.regularPaymentAmount, 'PEN')}`);

  if (results2.convertedAmounts) {
    console.log('\nConverted to USD:');
    console.log(`Home Price: ${currencyService.formatCurrency(results2.convertedAmounts.homePrice, 'USD')}`);
    console.log(`Monthly Payment: ${currencyService.formatCurrency(results2.convertedAmounts.regularPaymentAmount, 'USD')}`);
  }

  // Test 3: User override rate
  console.log('\n\nTest 3: User Override Exchange Rate');
  console.log('----------------------------------------------');
  
  // Save user rate
  currencyService.saveUserRate('USD', 'EUR', 0.95);
  
  const test3Input: MortgageInput = {
    homePrice: 300000,
    downPaymentType: 'percentage',
    downPaymentValue: 15,
    loanAmount: 0,
    interestRate: 7.0,
    loanTermYears: 30,
    paymentFrequency: 'monthly',
    currency: 'USD',
    displayCurrency: 'EUR',
    exchangeRate: 0.95  // User's bank rate
  };

  const calc3 = new MortgageCalculator(test3Input);
  const results3 = calc3.calculate();

  console.log('Using bank rate: 1 USD = 0.95 EUR (vs market ~0.92)');
  console.log(`Monthly Payment USD: ${currencyService.formatCurrency(results3.regularPaymentAmount, 'USD')}`);
  console.log(`Monthly Payment EUR: ${currencyService.formatCurrency(results3.convertedAmounts?.regularPaymentAmount || 0, 'EUR')}`);

  // Test 4: Multiple currency formatting
  console.log('\n\nTest 4: Currency Formatting Examples');
  console.log('----------------------------------------------');
  
  const testAmount = 1234567.89;
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'PEN', 'MXN', 'INR', 'CNY'];
  
  currencies.forEach(curr => {
    console.log(`${curr}: ${currencyService.formatCurrency(testAmount, curr)}`);
  });

  console.log('\n✅ All currency tests completed!');
}

// Run tests
testCurrencyCalculations().catch(console.error);