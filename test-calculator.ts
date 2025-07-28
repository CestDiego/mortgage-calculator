import { MortgageCalculator } from './src/calculator';

// Test the calculator with sample data
const input = {
  loanAmount: 300000,
  interestRate: 6.5,
  loanTermYears: 30,
  paymentFrequency: 'monthly' as const,
  extraPayment: 100
};

const calculator = new MortgageCalculator(input);
const results = calculator.calculate();

console.log('Mortgage Calculator Test Results:');
console.log('=================================');
console.log(`Loan Amount: $${input.loanAmount.toLocaleString()}`);
console.log(`Interest Rate: ${input.interestRate}%`);
console.log(`Loan Term: ${input.loanTermYears} years`);
console.log(`Payment Frequency: ${input.paymentFrequency}`);
console.log(`Extra Payment: $${input.extraPayment}`);
console.log('\nResults:');
console.log(`Regular Payment: $${results.regularPaymentAmount.toFixed(2)}`);
console.log(`Total Payments: ${results.totalPayments}`);
console.log(`Total Amount Paid: $${results.totalAmount.toFixed(2)}`);
console.log(`Total Interest: $${results.totalInterest.toFixed(2)}`);
console.log(`Payoff Date: ${results.payoffDate.toLocaleDateString()}`);
console.log(`\nFirst Payment Breakdown:`);
console.log(`Principal: $${results.amortizationSchedule[0].principalPayment.toFixed(2)}`);
console.log(`Interest: $${results.amortizationSchedule[0].interestPayment.toFixed(2)}`);