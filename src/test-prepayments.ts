import { MortgageCalculator } from './calculator';
import { PrepaymentCalculator } from './prepayment-calculator';
import type { MortgageInput } from './types';
import type { PrepaymentStrategy } from './prepayment-types';

console.log('💰 Testing Prepayment Strategies 💰');
console.log('===================================\n');

// Base mortgage for testing
const baseInput: MortgageInput = {
  homePrice: 400000,
  downPaymentType: 'percentage',
  downPaymentValue: 20,
  loanAmount: 0,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly',
  currency: 'USD'
};

// Calculate base mortgage
const calculator = new MortgageCalculator(baseInput);
const baseResults = calculator.calculate();

console.log('Base Mortgage:');
console.log(`Loan Amount: $${baseResults.loanAmount.toLocaleString()}`);
console.log(`Monthly Payment: $${baseResults.regularPaymentAmount.toFixed(2)}`);
console.log(`Total Interest: $${baseResults.totalInterest.toFixed(2)}`);
console.log(`Payoff Date: ${baseResults.payoffDate.toLocaleDateString()}`);
console.log('---\n');

// Test 1: Monthly Extra Payment
console.log('Test 1: $500 Extra Monthly Payment');
console.log('----------------------------------');

const monthlyStrategy: PrepaymentStrategy = {
  id: 'monthly-extra',
  enabled: true,
  recurringPayments: [{
    amount: 500,
    frequency: 'monthly',
    startDate: new Date()
  }],
  oneTimePayments: []
};

const prepaymentCalc = new PrepaymentCalculator(
  baseResults.regularPaymentAmount,
  baseInput.interestRate,
  baseResults.amortizationSchedule
);

const monthlyResults = prepaymentCalc.calculateWithPrepayments(monthlyStrategy);

console.log(`Interest Saved: $${monthlyResults.interestSaved.toFixed(2)}`);
console.log(`Time Saved: ${monthlyResults.timeSaved.years} years, ${monthlyResults.timeSaved.months} months`);
console.log(`New Payoff Date: ${monthlyResults.newPayoffDate.toLocaleDateString()}`);
console.log(`Total Prepayments: $${monthlyResults.totalPrepayments.toLocaleString()}`);
console.log('---\n');

// Test 2: Annual Bonus Payments
console.log('Test 2: $10,000 Annual Bonus');
console.log('-----------------------------');

const annualStrategy: PrepaymentStrategy = {
  id: 'annual-bonus',
  enabled: true,
  recurringPayments: [{
    amount: 10000,
    frequency: 'annually',
    startDate: new Date(new Date().getFullYear(), 11, 15) // December
  }],
  oneTimePayments: []
};

const annualResults = prepaymentCalc.calculateWithPrepayments(annualStrategy);

console.log(`Interest Saved: $${annualResults.interestSaved.toFixed(2)}`);
console.log(`Time Saved: ${annualResults.timeSaved.years} years, ${annualResults.timeSaved.months} months`);
console.log(`New Payoff Date: ${annualResults.newPayoffDate.toLocaleDateString()}`);
console.log('---\n');

// Test 3: Mixed Strategy (Monthly + One-time)
console.log('Test 3: Mixed Strategy');
console.log('----------------------');
console.log('$200/month + $5,000 tax refund + $15,000 inheritance');

const mixedStrategy: PrepaymentStrategy = {
  id: 'mixed',
  enabled: true,
  recurringPayments: [{
    amount: 200,
    frequency: 'monthly',
    startDate: new Date()
  }],
  oneTimePayments: [
    {
      id: '1',
      date: new Date(new Date().getFullYear() + 1, 3, 15), // Next April
      amount: 5000,
      description: 'Tax Refund'
    },
    {
      id: '2',
      date: new Date(new Date().getFullYear() + 2, 6, 1), // In 2 years
      amount: 15000,
      description: 'Inheritance'
    }
  ]
};

const mixedResults = prepaymentCalc.calculateWithPrepayments(mixedStrategy);

console.log(`Interest Saved: $${mixedResults.interestSaved.toFixed(2)}`);
console.log(`Time Saved: ${mixedResults.timeSaved.years} years, ${mixedResults.timeSaved.months} months`);
console.log(`Total Prepayments: $${mixedResults.totalPrepayments.toLocaleString()}`);
console.log('\nPrepayment Events:');
mixedResults.prepaymentEvents.slice(0, 5).forEach(event => {
  console.log(`  ${event.date.toLocaleDateString()}: $${event.amount} - ${event.description}`);
});
console.log('  ... and more');
console.log('---\n');

// Test 4: Smart Plans
console.log('Test 4: Smart Prepayment Plans');
console.log('-------------------------------');

const smartPlans = prepaymentCalc.generateSmartPlans(1000, 'moderate');

smartPlans.forEach(plan => {
  console.log(`\n${plan.name} Plan:`);
  console.log(`  Monthly Extra: $${plan.monthlyExtra}`);
  console.log(`  Interest Saved: $${plan.totalInterestSaved.toFixed(2)}`);
  console.log(`  Time Saved: ${plan.timeSaved.years} years, ${plan.timeSaved.months} months`);
  console.log(`  Affordability Score: ${plan.affordabilityScore}/10`);
  if (plan.oneTimePayments.length > 0) {
    console.log('  One-time payments:');
    plan.oneTimePayments.forEach(p => {
      console.log(`    Month ${p.month}: $${p.amount} - ${p.description}`);
    });
  }
});

console.log('\n---');
console.log('Summary of Strategies:');
console.log(`1. No Prepayment: ${baseResults.totalInterest.toFixed(2)} interest`);
console.log(`2. $500/month: Save $${monthlyResults.interestSaved.toFixed(2)} (${((monthlyResults.interestSaved/baseResults.totalInterest)*100).toFixed(1)}%)`);
console.log(`3. $10k/year: Save $${annualResults.interestSaved.toFixed(2)} (${((annualResults.interestSaved/baseResults.totalInterest)*100).toFixed(1)}%)`);
console.log(`4. Mixed: Save $${mixedResults.interestSaved.toFixed(2)} (${((mixedResults.interestSaved/baseResults.totalInterest)*100).toFixed(1)}%)`);

console.log('\n✅ All prepayment tests completed!');