import Decimal from 'decimal.js';
import type { MortgageInput, MortgageResults, PaymentDetails } from './types';

export class MortgageCalculator {
  private input: MortgageInput;

  constructor(input: MortgageInput) {
    this.input = input;
  }

  calculate(): MortgageResults {
    // Calculate down payment amount
    const homePrice = new Decimal(this.input.homePrice);
    const downPaymentAmount = this.input.downPaymentType === 'percentage' 
      ? homePrice.mul(this.input.downPaymentValue).div(100)
      : new Decimal(this.input.downPaymentValue);
    
    // Calculate loan amount
    const loanAmount = homePrice.minus(downPaymentAmount);
    
    const annualRate = new Decimal(this.input.interestRate).div(100);
    
    const paymentsPerYear = this.getPaymentsPerYear();
    const periodicRate = annualRate.div(paymentsPerYear);
    const totalPayments = this.input.loanTermYears * paymentsPerYear;
    
    const regularPaymentAmount = this.calculatePayment(loanAmount, periodicRate, totalPayments);
    
    const amortizationSchedule = this.generateAmortizationSchedule(
      loanAmount,
      periodicRate,
      regularPaymentAmount,
      totalPayments
    );
    
    const lastPayment = amortizationSchedule[amortizationSchedule.length - 1];
    const totalAmount = lastPayment.totalPrincipalPaid + lastPayment.totalInterestPaid;
    
    return {
      homePrice: homePrice.toNumber(),
      downPaymentAmount: downPaymentAmount.toNumber(),
      loanAmount: loanAmount.toNumber(),
      regularPaymentAmount: regularPaymentAmount.toNumber(),
      totalPayments: amortizationSchedule.length,
      totalAmount: totalAmount,
      totalInterest: lastPayment.totalInterestPaid,
      amortizationSchedule,
      payoffDate: lastPayment.paymentDate
    };
  }

  private getPaymentsPerYear(): number {
    switch (this.input.paymentFrequency) {
      case 'monthly': return 12;
      case 'biweekly': return 26;
      case 'weekly': return 52;
      default: return 12;
    }
  }

  private calculatePayment(principal: Decimal, rate: Decimal, periods: number): Decimal {
    if (rate.eq(0)) {
      return principal.div(periods);
    }
    
    const numerator = principal.mul(rate).mul(rate.plus(1).pow(periods));
    const denominator = rate.plus(1).pow(periods).minus(1);
    
    return numerator.div(denominator);
  }

  private generateAmortizationSchedule(
    principal: Decimal,
    rate: Decimal,
    payment: Decimal,
    totalPayments: number
  ): PaymentDetails[] {
    const schedule: PaymentDetails[] = [];
    let balance = principal;
    let totalPrincipalPaid = new Decimal(0);
    let totalInterestPaid = new Decimal(0);
    const startDate = new Date();
    const extraPayment = new Decimal(this.input.extraPayment || 0);
    
    for (let i = 0; i < totalPayments && balance.gt(0); i++) {
      const interestPayment = balance.mul(rate);
      let principalPayment = payment.minus(interestPayment);
      
      // Add extra payment to principal
      principalPayment = principalPayment.plus(extraPayment);
      
      // Don't overpay
      if (principalPayment.gt(balance)) {
        principalPayment = balance;
      }
      
      balance = balance.minus(principalPayment);
      totalPrincipalPaid = totalPrincipalPaid.plus(principalPayment);
      totalInterestPaid = totalInterestPaid.plus(interestPayment);
      
      const paymentDate = this.calculatePaymentDate(startDate, i);
      
      schedule.push({
        paymentNumber: i + 1,
        paymentDate,
        paymentAmount: principalPayment.plus(interestPayment).toNumber(),
        principalPayment: principalPayment.toNumber(),
        interestPayment: interestPayment.toNumber(),
        extraPayment: extraPayment.toNumber(),
        remainingBalance: balance.toNumber(),
        totalPrincipalPaid: totalPrincipalPaid.toNumber(),
        totalInterestPaid: totalInterestPaid.toNumber()
      });
      
      if (balance.lte(0)) break;
    }
    
    return schedule;
  }

  private calculatePaymentDate(startDate: Date, paymentNumber: number): Date {
    const date = new Date(startDate);
    
    switch (this.input.paymentFrequency) {
      case 'monthly':
        date.setMonth(date.getMonth() + paymentNumber);
        break;
      case 'biweekly':
        date.setDate(date.getDate() + (paymentNumber * 14));
        break;
      case 'weekly':
        date.setDate(date.getDate() + (paymentNumber * 7));
        break;
    }
    
    return date;
  }
}