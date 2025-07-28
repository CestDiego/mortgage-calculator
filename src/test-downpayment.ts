import { MortgageCalculator } from './calculator';
import type { MortgageInput } from './types';

console.log('🏠 Testing Down Payment Calculations 🏠');
console.log('=====================================\n');

// Test 1: Percentage-based down payment (20%)
const test1Input: MortgageInput = {
  homePrice: 500000,
  downPaymentType: 'percentage',
  downPaymentValue: 20,
  loanAmount: 0, // Will be calculated
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly',
  currency: 'USD'
};

console.log('Test 1: 20% Down Payment on $500,000 Home');
console.log('Home Price:', test1Input.homePrice.toLocaleString());
console.log('Down Payment:', test1Input.downPaymentValue + '%');

const calc1 = new MortgageCalculator(test1Input);
const results1 = calc1.calculate();

console.log('\nResults:');
console.log('Down Payment Amount: $' + results1.downPaymentAmount.toFixed(2));
console.log('Loan Amount: $' + results1.loanAmount.toFixed(2));
console.log('Monthly Payment: $' + results1.regularPaymentAmount.toFixed(2));
console.log('Total Interest: $' + results1.totalInterest.toFixed(2));
console.log('---\n');

// Test 2: Fixed down payment amount
const test2Input: MortgageInput = {
  homePrice: 500000,
  downPaymentType: 'fixed',
  downPaymentValue: 75000,
  loanAmount: 0,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly',
  currency: 'USD'
};

console.log('Test 2: $75,000 Fixed Down Payment on $500,000 Home');
console.log('Home Price:', test2Input.homePrice.toLocaleString());
console.log('Down Payment: $' + test2Input.downPaymentValue.toLocaleString());

const calc2 = new MortgageCalculator(test2Input);
const results2 = calc2.calculate();

console.log('\nResults:');
console.log('Down Payment Amount: $' + results2.downPaymentAmount.toFixed(2));
console.log('Down Payment Percentage: ' + ((results2.downPaymentAmount / results2.homePrice) * 100).toFixed(1) + '%');
console.log('Loan Amount: $' + results2.loanAmount.toFixed(2));
console.log('Monthly Payment: $' + results2.regularPaymentAmount.toFixed(2));
console.log('Total Interest: $' + results2.totalInterest.toFixed(2));
console.log('---\n');

// Test 3: Minimum down payment (5%)
const test3Input: MortgageInput = {
  homePrice: 300000,
  downPaymentType: 'percentage',
  downPaymentValue: 5,
  loanAmount: 0,
  interestRate: 7.0,
  loanTermYears: 30,
  paymentFrequency: 'monthly',
  currency: 'USD'
};

console.log('Test 3: 5% Down Payment on $300,000 Home');
console.log('Home Price:', test3Input.homePrice.toLocaleString());
console.log('Down Payment:', test3Input.downPaymentValue + '%');

const calc3 = new MortgageCalculator(test3Input);
const results3 = calc3.calculate();

console.log('\nResults:');
console.log('Down Payment Amount: $' + results3.downPaymentAmount.toFixed(2));
console.log('Loan Amount: $' + results3.loanAmount.toFixed(2));
console.log('Monthly Payment: $' + results3.regularPaymentAmount.toFixed(2));
console.log('Total Interest: $' + results3.totalInterest.toFixed(2));

// Compare savings with different down payments
console.log('\n=====================================');
console.log('📊 Down Payment Comparison Summary 📊');
console.log('=====================================\n');

console.log('Impact of down payment size on $500,000 home:');
console.log('20% down: $' + results1.regularPaymentAmount.toFixed(2) + '/month, $' + results1.totalInterest.toFixed(2) + ' total interest');
console.log('15% down: $' + results2.regularPaymentAmount.toFixed(2) + '/month, $' + results2.totalInterest.toFixed(2) + ' total interest');

const interestSavings = results2.totalInterest - results1.totalInterest;
console.log('\nBy putting 20% down instead of 15%, you save:');
console.log('- $' + (results2.regularPaymentAmount - results1.regularPaymentAmount).toFixed(2) + ' per month');
console.log('- $' + interestSavings.toFixed(2) + ' in total interest');

console.log('\n✅ All down payment calculations completed successfully!');