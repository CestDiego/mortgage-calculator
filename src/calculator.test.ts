import { MortgageCalculator } from './calculator.js';
import type { MortgageInput } from './types.js';

// Helper function to format test results
function logTestResult(testName: string, passed: boolean, expected: any, actual: any, details?: string) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status}: ${testName}`);
  console.log(`  Expected: ${expected}`);
  console.log(`  Actual: ${actual}`);
  if (details) {
    console.log(`  Details: ${details}`);
  }
}

// Helper function to compare numbers with tolerance
function areNumbersClose(a: number, b: number, tolerance: number = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

// Test 1: Basic monthly payment calculation
function testBasicMonthlyPayment() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 300000,
    interestRate: 4.5,
    loanTermYears: 30,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayment = 1520.06; // Standard mortgage calculation
  const passed = areNumbersClose(results.regularPaymentAmount, expectedPayment);
  
  logTestResult(
    'Basic Monthly Payment Calculation',
    passed,
    expectedPayment,
    results.regularPaymentAmount.toFixed(2)
  );
}

// Test 2: Bi-weekly payment calculation
function testBiweeklyPayment() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 300000,
    interestRate: 4.5,
    loanTermYears: 30,
    paymentFrequency: 'biweekly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayment = 701.23; // Bi-weekly payment (calculated based on annual rate / 26)
  const passed = areNumbersClose(results.regularPaymentAmount, expectedPayment);
  
  logTestResult(
    'Bi-weekly Payment Calculation',
    passed,
    expectedPayment,
    results.regularPaymentAmount.toFixed(2),
    `Total payments: ${results.totalPayments}`
  );
}

// Test 3: Weekly payment calculation
function testWeeklyPayment() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 300000,
    interestRate: 4.5,
    loanTermYears: 30,
    paymentFrequency: 'weekly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayment = 350.01; // Approximately 1/4 of monthly payment
  const passed = areNumbersClose(results.regularPaymentAmount, expectedPayment, 1);
  
  logTestResult(
    'Weekly Payment Calculation',
    passed,
    expectedPayment,
    results.regularPaymentAmount.toFixed(2),
    `Total payments: ${results.totalPayments}`
  );
}

// Test 4: Extra payment calculations
function testExtraPayments() {
  const inputWithoutExtra: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 300000,
    interestRate: 4.5,
    loanTermYears: 30,
    paymentFrequency: 'monthly'
  };
  
  const inputWithExtra: MortgageInput = {
    ...inputWithoutExtra,
    extraPayment: 200
  };
  
  const calcWithout = new MortgageCalculator(inputWithoutExtra);
  const calcWith = new MortgageCalculator(inputWithExtra);
  
  const resultsWithout = calcWithout.calculate();
  const resultsWith = calcWith.calculate();
  
  const fewerPayments = resultsWith.totalPayments < resultsWithout.totalPayments;
  const lessInterest = resultsWith.totalInterest < resultsWithout.totalInterest;
  
  logTestResult(
    'Extra Payment Calculations',
    fewerPayments && lessInterest,
    'Fewer payments and less interest',
    `${resultsWith.totalPayments} payments, $${resultsWith.totalInterest.toFixed(2)} interest`,
    `Without extra: ${resultsWithout.totalPayments} payments, $${resultsWithout.totalInterest.toFixed(2)} interest`
  );
}

// Test 5: Zero interest rate edge case
function testZeroInterestRate() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 300000,
    interestRate: 0,
    loanTermYears: 30,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayment = 833.33; // 300000 / 360
  const expectedTotalInterest = 0;
  
  const paymentPassed = areNumbersClose(results.regularPaymentAmount, expectedPayment);
  const interestPassed = results.totalInterest === expectedTotalInterest;
  
  logTestResult(
    'Zero Interest Rate Edge Case',
    paymentPassed && interestPassed,
    `Payment: ${expectedPayment}, Interest: ${expectedTotalInterest}`,
    `Payment: ${results.regularPaymentAmount.toFixed(2)}, Interest: ${results.totalInterest}`
  );
}

// Test 6: Very short loan term (1 year)
function testShortLoanTerm() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 50000,
    interestRate: 4.5,
    loanTermYears: 1,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayments = 12;
  const paymentsPassed = results.totalPayments === expectedPayments;
  const balanceZero = results.amortizationSchedule[results.amortizationSchedule.length - 1].remainingBalance < 0.01;
  
  logTestResult(
    'Very Short Loan Term (1 year)',
    paymentsPassed && balanceZero,
    `${expectedPayments} payments, $0 balance`,
    `${results.totalPayments} payments, $${results.amortizationSchedule[results.amortizationSchedule.length - 1].remainingBalance.toFixed(2)} balance`
  );
}

// Test 7: Very long loan term (40 years)
function testLongLoanTerm() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 500000,
    interestRate: 4.5,
    loanTermYears: 40,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const expectedPayments = 480;
  const paymentsPassed = results.totalPayments === expectedPayments;
  const higherInterest = results.totalInterest > results.regularPaymentAmount * 200; // Interest should be substantial
  
  logTestResult(
    'Very Long Loan Term (40 years)',
    paymentsPassed && higherInterest,
    `${expectedPayments} payments with substantial interest`,
    `${results.totalPayments} payments, $${results.totalInterest.toFixed(2)} total interest`
  );
}

// Test 8: Verify total interest calculation
function testTotalInterestCalculation() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 200000,
    interestRate: 5,
    loanTermYears: 15,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  // Calculate expected total interest
  const totalPaid = results.regularPaymentAmount * results.totalPayments;
  const expectedTotalInterest = totalPaid - input.loanAmount;
  
  // Also verify from amortization schedule
  let scheduleInterest = 0;
  results.amortizationSchedule.forEach(payment => {
    scheduleInterest += payment.interestPayment;
  });
  
  const interestMatches = areNumbersClose(results.totalInterest, scheduleInterest);
  const expectedMatches = areNumbersClose(results.totalInterest, expectedTotalInterest, 100);
  
  logTestResult(
    'Total Interest Calculation',
    interestMatches && expectedMatches,
    `$${expectedTotalInterest.toFixed(2)} (from schedule: $${scheduleInterest.toFixed(2)})`,
    `$${results.totalInterest.toFixed(2)}`
  );
}

// Test 9: Verify payoff date calculation
function testPayoffDateCalculation() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 150000,
    interestRate: 3.5,
    loanTermYears: 20,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  const startDate = new Date();
  const expectedPayoffDate = new Date(startDate);
  expectedPayoffDate.setFullYear(expectedPayoffDate.getFullYear() + 20);
  
  const actualPayoffDate = results.payoffDate;
  const yearDiff = actualPayoffDate.getFullYear() - startDate.getFullYear();
  const monthDiff = actualPayoffDate.getMonth() - startDate.getMonth();
  const totalMonthDiff = yearDiff * 12 + monthDiff;
  
  // Should be close to 240 months (20 years)
  const passed = Math.abs(totalMonthDiff - 240) <= 1;
  
  logTestResult(
    'Payoff Date Calculation',
    passed,
    `~20 years from now`,
    `${yearDiff} years, ${monthDiff} months`,
    `Payoff date: ${actualPayoffDate.toLocaleDateString()}`
  );
}

// Test 10: Verify amortization schedule accuracy
function testAmortizationScheduleAccuracy() {
  const input: MortgageInput = {
    homePrice: 375000,
    downPaymentType: 'percentage',
    downPaymentValue: 20,
    loanAmount: 100000,
    interestRate: 6,
    loanTermYears: 5,
    paymentFrequency: 'monthly'
  };
  
  const calculator = new MortgageCalculator(input);
  const results = calculator.calculate();
  
  let testsPassed = true;
  const errors: string[] = [];
  
  // Test 1: First payment should have highest interest
  const firstPayment = results.amortizationSchedule[0];
  const expectedFirstInterest = (100000 * 0.06) / 12; // ~500
  if (!areNumbersClose(firstPayment.interestPayment, expectedFirstInterest)) {
    testsPassed = false;
    errors.push(`First interest payment incorrect: ${firstPayment.interestPayment} vs ${expectedFirstInterest}`);
  }
  
  // Test 2: Interest should decrease over time
  for (let i = 1; i < results.amortizationSchedule.length; i++) {
    if (results.amortizationSchedule[i].interestPayment > results.amortizationSchedule[i-1].interestPayment) {
      testsPassed = false;
      errors.push(`Interest increased at payment ${i}`);
      break;
    }
  }
  
  // Test 3: Principal should increase over time
  for (let i = 1; i < Math.min(results.amortizationSchedule.length - 1, 10); i++) {
    if (results.amortizationSchedule[i].principalPayment < results.amortizationSchedule[i-1].principalPayment) {
      testsPassed = false;
      errors.push(`Principal decreased at payment ${i}`);
      break;
    }
  }
  
  // Test 4: Balance should reach zero
  const finalBalance = results.amortizationSchedule[results.amortizationSchedule.length - 1].remainingBalance;
  if (finalBalance > 0.01) {
    testsPassed = false;
    errors.push(`Final balance not zero: ${finalBalance}`);
  }
  
  // Test 5: Total principal paid should equal loan amount
  const totalPrincipal = results.amortizationSchedule[results.amortizationSchedule.length - 1].totalPrincipalPaid;
  if (!areNumbersClose(totalPrincipal, input.loanAmount)) {
    testsPassed = false;
    errors.push(`Total principal ${totalPrincipal} != loan amount ${input.loanAmount}`);
  }
  
  logTestResult(
    'Amortization Schedule Accuracy',
    testsPassed,
    'All schedule checks pass',
    testsPassed ? 'All checks passed' : errors.join('; '),
    `${results.amortizationSchedule.length} total payments`
  );
}

// Run all tests
console.log('🏦 MORTGAGE CALCULATOR TEST SUITE 🏦');
console.log('=====================================');

testBasicMonthlyPayment();
testBiweeklyPayment();
testWeeklyPayment();
testExtraPayments();
testZeroInterestRate();
testShortLoanTerm();
testLongLoanTerm();
testTotalInterestCalculation();
testPayoffDateCalculation();
testAmortizationScheduleAccuracy();

console.log('\n=====================================');
console.log('Test suite complete!');