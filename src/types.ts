export interface MortgageInput {
  homePrice: number;
  downPaymentType: 'percentage' | 'fixed';
  downPaymentValue: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  paymentFrequency: 'monthly' | 'biweekly' | 'weekly';
  extraPayment?: number;
}

export interface PaymentDetails {
  paymentNumber: number;
  paymentDate: Date;
  paymentAmount: number;
  principalPayment: number;
  interestPayment: number;
  extraPayment: number;
  remainingBalance: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
}

export interface MortgageResults {
  homePrice: number;
  downPaymentAmount: number;
  loanAmount: number;
  regularPaymentAmount: number;
  totalPayments: number;
  totalAmount: number;
  totalInterest: number;
  amortizationSchedule: PaymentDetails[];
  payoffDate: Date;
}