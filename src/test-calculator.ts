import { MortgageCalculator } from './calculator';
import type { MortgageInput } from './types';

// Test case 1: Basic monthly mortgage
const basicInput: MortgageInput = {
  homePrice: 375000,
  downPaymentType: 'percentage',
  downPaymentValue: 20,
  loanAmount: 300000,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly'
};

console.log('Test 1: Basic Monthly Mortgage');
console.log('Input:', basicInput);
const calculator1 = new MortgageCalculator(basicInput);
const results1 = calculator1.calculate();
console.log('Monthly Payment:', results1.regularPaymentAmount.toFixed(2));
console.log('Total Interest:', results1.totalInterest.toFixed(2));
console.log('Total Amount:', results1.totalAmount.toFixed(2));
console.log('---\n');

// Test case 2: With extra payments
const extraPaymentInput: MortgageInput = {
  homePrice: 375000,
  downPaymentType: 'percentage',
  downPaymentValue: 20,
  loanAmount: 300000,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly',
  extraPayment: 200
};

console.log('Test 2: Monthly Mortgage with Extra Payments');
console.log('Input:', extraPaymentInput);
const calculator2 = new MortgageCalculator(extraPaymentInput);
const results2 = calculator2.calculate();
console.log('Monthly Payment:', results2.regularPaymentAmount.toFixed(2));
console.log('Extra Payment:', extraPaymentInput.extraPayment);
console.log('Total Payments:', results2.totalPayments);
console.log('Years to Pay Off:', (results2.totalPayments / 12).toFixed(1));
console.log('Interest Saved:', (results1.totalInterest - results2.totalInterest).toFixed(2));
console.log('---\n');

// Test case 3: Biweekly payments
const biweeklyInput: MortgageInput = {
  homePrice: 375000,
  downPaymentType: 'percentage',
  downPaymentValue: 20,
  loanAmount: 300000,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'biweekly'
};

console.log('Test 3: Biweekly Mortgage');
console.log('Input:', biweeklyInput);
const calculator3 = new MortgageCalculator(biweeklyInput);
const results3 = calculator3.calculate();
console.log('Biweekly Payment:', results3.regularPaymentAmount.toFixed(2));
console.log('Total Payments:', results3.totalPayments);
console.log('Years to Pay Off:', (results3.totalPayments / 26).toFixed(1));
console.log('Interest Saved vs Monthly:', (results1.totalInterest - results3.totalInterest).toFixed(2));