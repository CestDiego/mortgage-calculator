import { MortgageCalculator } from './calculator';
import type { MortgageInput, MortgageResults } from './types';

export interface ComparisonScenario {
  id: string;
  name: string;
  input: MortgageInput;
  results?: MortgageResults;
}

export interface ReverseCalculatorInput {
  targetPayment: number;
  homePrice?: number;
  downPaymentType: 'percentage' | 'fixed';
  downPaymentValue?: number;
  interestRate: number;
  loanTermYears: number;
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
}

export interface ReverseCalculatorResult {
  maxHomePrice?: number;
  maxLoanAmount: number;
  requiredDownPayment?: number;
  estimatedPayment: number;
}

export class ComparisonManager {
  private scenarios: ComparisonScenario[] = [];

  addScenario(scenario: ComparisonScenario): void {
    const calculator = new MortgageCalculator(scenario.input);
    scenario.results = calculator.calculate();
    this.scenarios.push(scenario);
  }

  removeScenario(id: string): void {
    this.scenarios = this.scenarios.filter(s => s.id !== id);
  }

  getScenarios(): ComparisonScenario[] {
    return this.scenarios;
  }

  clearScenarios(): void {
    this.scenarios = [];
  }
}

export class ReverseCalculator {
  calculateMaxAffordability(input: ReverseCalculatorInput): ReverseCalculatorResult {
    const paymentsPerYear = this.getPaymentsPerYear(input.paymentFrequency);
    const periodicRate = input.interestRate / 100 / paymentsPerYear;
    const totalPayments = input.loanTermYears * paymentsPerYear;
    
    // Calculate max loan amount based on target payment
    const maxLoanAmount = this.calculateMaxLoanAmount(
      input.targetPayment,
      periodicRate,
      totalPayments
    );
    
    let result: ReverseCalculatorResult = {
      maxLoanAmount,
      estimatedPayment: input.targetPayment
    };
    
    // If home price is provided, calculate required down payment
    if (input.homePrice) {
      result.requiredDownPayment = Math.max(0, input.homePrice - maxLoanAmount);
    } else if (input.downPaymentValue !== undefined) {
      // Calculate max home price based on down payment
      if (input.downPaymentType === 'percentage') {
        // maxHomePrice = maxLoanAmount / (1 - downPaymentPercentage/100)
        const downPaymentDecimal = input.downPaymentValue / 100;
        result.maxHomePrice = maxLoanAmount / (1 - downPaymentDecimal);
        result.requiredDownPayment = result.maxHomePrice * downPaymentDecimal;
      } else {
        // Fixed down payment
        result.maxHomePrice = maxLoanAmount + input.downPaymentValue;
        result.requiredDownPayment = input.downPaymentValue;
      }
    }
    
    return result;
  }
  
  private calculateMaxLoanAmount(payment: number, rate: number, periods: number): number {
    if (rate === 0) {
      return payment * periods;
    }
    
    // P = L[c(1 + c)^n]/[(1 + c)^n - 1]
    // Solving for L: L = P[(1 + c)^n - 1]/[c(1 + c)^n]
    const onePlusRate = 1 + rate;
    const onePlusRatePowN = Math.pow(onePlusRate, periods);
    
    return payment * (onePlusRatePowN - 1) / (rate * onePlusRatePowN);
  }
  
  private getPaymentsPerYear(frequency: 'monthly' | 'biweekly' | 'weekly'): number {
    switch (frequency) {
      case 'monthly': return 12;
      case 'biweekly': return 26;
      case 'weekly': return 52;
      default: return 12;
    }
  }
}