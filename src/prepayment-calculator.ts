import Decimal from 'decimal.js';
import type { PaymentDetails } from './types';
import type { 
  PrepaymentStrategy, 
  PrepaymentEvent, 
  PrepaymentResults,
  SmartPrepaymentPlan
} from './prepayment-types';

export class PrepaymentCalculator {
  private monthlyPayment: Decimal;
  private interestRate: Decimal;
  private originalSchedule: PaymentDetails[];
  
  constructor(
    monthlyPayment: number,
    annualInterestRate: number,
    originalSchedule: PaymentDetails[]
  ) {
    this.monthlyPayment = new Decimal(monthlyPayment);
    this.interestRate = new Decimal(annualInterestRate).div(100).div(12);
    this.originalSchedule = originalSchedule;
  }
  
  calculateWithPrepayments(strategy: PrepaymentStrategy): PrepaymentResults {
    if (!strategy.enabled || 
        (strategy.recurringPayments.length === 0 && strategy.oneTimePayments.length === 0)) {
      // No prepayments, return original schedule info
      const lastPayment = this.originalSchedule[this.originalSchedule.length - 1];
      return {
        totalPrepayments: 0,
        interestSaved: 0,
        timeSaved: { years: 0, months: 0 },
        originalPayoffDate: lastPayment.paymentDate,
        newPayoffDate: lastPayment.paymentDate,
        modifiedSchedule: this.originalSchedule,
        prepaymentEvents: [],
        monthlyPaymentWithPrepayment: this.monthlyPayment.toNumber()
      };
    }
    
    // Create a map of all prepayment events
    const prepaymentMap = this.createPrepaymentMap(strategy);
    
    // Recalculate schedule with prepayments
    const modifiedSchedule: PaymentDetails[] = [];
    const prepaymentEvents: PrepaymentEvent[] = [];
    
    let balance = new Decimal(this.originalSchedule[0].remainingBalance + this.originalSchedule[0].principalPayment);
    let totalPrincipalPaid = new Decimal(0);
    let totalInterestPaid = new Decimal(0);
    let totalPrepayments = new Decimal(0);
    let paymentNumber = 1;
    
    while (balance.gt(0) && paymentNumber <= this.originalSchedule.length * 2) { // Safety limit
      const paymentDate = this.getPaymentDate(paymentNumber);
      const prepaymentAmount = prepaymentMap.get(this.dateKey(paymentDate)) || 0;
      
      // Calculate interest for this period
      const interestPayment = balance.mul(this.interestRate);
      let principalPayment = this.monthlyPayment.minus(interestPayment);
      
      // Add any prepayment to principal
      if (prepaymentAmount > 0) {
        principalPayment = principalPayment.plus(prepaymentAmount);
        totalPrepayments = totalPrepayments.plus(prepaymentAmount);
        
        // Record prepayment event
        prepaymentEvents.push({
          date: paymentDate,
          amount: prepaymentAmount,
          type: this.getPrepaymentType(strategy, paymentDate, prepaymentAmount),
          description: this.getPrepaymentDescription(strategy, paymentDate, prepaymentAmount),
          balanceAfter: balance.minus(principalPayment).toNumber(),
          interestSaved: 0 // Will calculate later
        });
      }
      
      // Don't overpay
      if (principalPayment.gt(balance)) {
        principalPayment = balance;
      }
      
      balance = balance.minus(principalPayment);
      totalPrincipalPaid = totalPrincipalPaid.plus(principalPayment);
      totalInterestPaid = totalInterestPaid.plus(interestPayment);
      
      modifiedSchedule.push({
        paymentNumber,
        paymentDate,
        paymentAmount: principalPayment.plus(interestPayment).toNumber(),
        principalPayment: principalPayment.toNumber(),
        interestPayment: interestPayment.toNumber(),
        extraPayment: prepaymentAmount,
        remainingBalance: balance.toNumber(),
        totalPrincipalPaid: totalPrincipalPaid.toNumber(),
        totalInterestPaid: totalInterestPaid.toNumber()
      });
      
      if (balance.lte(0)) break;
      paymentNumber++;
    }
    
    // Calculate savings
    const originalLastPayment = this.originalSchedule[this.originalSchedule.length - 1];
    const interestSaved = originalLastPayment.totalInterestPaid - totalInterestPaid.toNumber();
    const monthsSaved = this.originalSchedule.length - modifiedSchedule.length;
    const timeSaved = {
      years: Math.floor(monthsSaved / 12),
      months: monthsSaved % 12
    };
    
    // Update interest saved for each prepayment event
    const interestSavedPerPrepayment = interestSaved / prepaymentEvents.length;
    prepaymentEvents.forEach(event => {
      event.interestSaved = interestSavedPerPrepayment;
    });
    
    return {
      totalPrepayments: totalPrepayments.toNumber(),
      interestSaved,
      timeSaved,
      originalPayoffDate: originalLastPayment.paymentDate,
      newPayoffDate: modifiedSchedule[modifiedSchedule.length - 1].paymentDate,
      modifiedSchedule,
      prepaymentEvents,
      monthlyPaymentWithPrepayment: this.monthlyPayment.toNumber() + this.getAverageMonthlyPrepayment(strategy)
    };
  }
  
  generateSmartPlans(
    monthlyBudget: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): SmartPrepaymentPlan[] {
    const plans: SmartPrepaymentPlan[] = [];
    
    // Conservative plan
    if (riskTolerance === 'conservative' || riskTolerance === 'moderate' || riskTolerance === 'aggressive') {
      const conservativeMonthly = Math.min(monthlyBudget * 0.5, 200);
      const conservativeStrategy: PrepaymentStrategy = {
        id: 'conservative',
        enabled: true,
        recurringPayments: [{
          amount: conservativeMonthly,
          frequency: 'monthly',
          startDate: new Date()
        }],
        oneTimePayments: []
      };
      
      const conservativeResults = this.calculateWithPrepayments(conservativeStrategy);
      plans.push({
        id: 'conservative',
        name: 'Conservative',
        description: 'Steady extra payments within comfort zone',
        monthlyExtra: conservativeMonthly,
        oneTimePayments: [],
        totalInterestSaved: conservativeResults.interestSaved,
        timeSaved: conservativeResults.timeSaved,
        affordabilityScore: 9
      });
    }
    
    // Moderate plan
    if (riskTolerance === 'moderate' || riskTolerance === 'aggressive') {
      const moderateMonthly = Math.min(monthlyBudget * 0.75, 500);
      const moderateStrategy: PrepaymentStrategy = {
        id: 'moderate',
        enabled: true,
        recurringPayments: [{
          amount: moderateMonthly,
          frequency: 'monthly',
          startDate: new Date()
        }],
        oneTimePayments: [
          {
            id: '1',
            date: new Date(new Date().getFullYear() + 1, 3, 15), // Next April
            amount: 3000,
            description: 'Tax Refund'
          }
        ]
      };
      
      const moderateResults = this.calculateWithPrepayments(moderateStrategy);
      plans.push({
        id: 'moderate',
        name: 'Balanced',
        description: 'Monthly payments plus annual bonus',
        monthlyExtra: moderateMonthly,
        oneTimePayments: [{ month: 15, amount: 3000, description: 'Tax Refund' }],
        totalInterestSaved: moderateResults.interestSaved,
        timeSaved: moderateResults.timeSaved,
        affordabilityScore: 7
      });
    }
    
    // Aggressive plan
    if (riskTolerance === 'aggressive') {
      const aggressiveMonthly = monthlyBudget;
      const aggressiveStrategy: PrepaymentStrategy = {
        id: 'aggressive',
        enabled: true,
        recurringPayments: [{
          amount: aggressiveMonthly,
          frequency: 'monthly',
          startDate: new Date()
        }],
        oneTimePayments: [
          {
            id: '1',
            date: new Date(new Date().getFullYear() + 1, 3, 15),
            amount: 5000,
            description: 'Tax Refund'
          },
          {
            id: '2',
            date: new Date(new Date().getFullYear() + 1, 11, 15),
            amount: 10000,
            description: 'Year-end Bonus'
          }
        ]
      };
      
      const aggressiveResults = this.calculateWithPrepayments(aggressiveStrategy);
      plans.push({
        id: 'aggressive',
        name: 'Aggressive',
        description: 'Maximum prepayments for fastest payoff',
        monthlyExtra: aggressiveMonthly,
        oneTimePayments: [
          { month: 15, amount: 5000, description: 'Tax Refund' },
          { month: 23, amount: 10000, description: 'Year-end Bonus' }
        ],
        totalInterestSaved: aggressiveResults.interestSaved,
        timeSaved: aggressiveResults.timeSaved,
        affordabilityScore: 5
      });
    }
    
    return plans;
  }
  
  private createPrepaymentMap(strategy: PrepaymentStrategy): Map<string, number> {
    const map = new Map<string, number>();
    
    // Add recurring payments
    strategy.recurringPayments.forEach(recurring => {
      const startDate = new Date(recurring.startDate);
      const endDate = recurring.endDate || new Date(2100, 0, 1); // Far future if no end date
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const key = this.dateKey(currentDate);
        map.set(key, (map.get(key) || 0) + recurring.amount);
        
        // Move to next payment date based on frequency
        switch (recurring.frequency) {
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          case 'quarterly':
            currentDate.setMonth(currentDate.getMonth() + 3);
            break;
          case 'annually':
            currentDate.setFullYear(currentDate.getFullYear() + 1);
            break;
        }
      }
    });
    
    // Add one-time payments
    strategy.oneTimePayments.forEach(oneTime => {
      const key = this.dateKey(new Date(oneTime.date));
      map.set(key, (map.get(key) || 0) + oneTime.amount);
    });
    
    return map;
  }
  
  private dateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }
  
  private getPaymentDate(paymentNumber: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + paymentNumber - 1);
    return date;
  }
  
  private getPrepaymentType(strategy: PrepaymentStrategy, date: Date, amount: number): 'recurring' | 'onetime' {
    // Check if this matches a one-time payment
    const dateStr = date.toISOString().split('T')[0];
    const isOneTime = strategy.oneTimePayments.some(p => 
      new Date(p.date).toISOString().split('T')[0] === dateStr && p.amount === amount
    );
    
    return isOneTime ? 'onetime' : 'recurring';
  }
  
  private getPrepaymentDescription(strategy: PrepaymentStrategy, date: Date, amount: number): string {
    // Check one-time payments first
    const dateStr = date.toISOString().split('T')[0];
    const oneTime = strategy.oneTimePayments.find(p => 
      new Date(p.date).toISOString().split('T')[0] === dateStr && p.amount === amount
    );
    
    if (oneTime) {
      return oneTime.description;
    }
    
    // Check recurring payments
    const recurring = strategy.recurringPayments.find(r => r.amount === amount);
    if (recurring) {
      switch (recurring.frequency) {
        case 'monthly': return 'Extra Monthly Payment';
        case 'quarterly': return 'Quarterly Extra Payment';
        case 'annually': return 'Annual Extra Payment';
      }
    }
    
    return 'Extra Payment';
  }
  
  private getAverageMonthlyPrepayment(strategy: PrepaymentStrategy): number {
    let total = 0;
    
    // Add recurring payments
    strategy.recurringPayments.forEach(r => {
      switch (r.frequency) {
        case 'monthly': total += r.amount; break;
        case 'quarterly': total += r.amount / 3; break;
        case 'annually': total += r.amount / 12; break;
      }
    });
    
    // Add one-time payments averaged over loan term
    const totalOneTime = strategy.oneTimePayments.reduce((sum, p) => sum + p.amount, 0);
    total += totalOneTime / this.originalSchedule.length;
    
    return total;
  }
}