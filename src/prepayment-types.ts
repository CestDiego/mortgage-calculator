export type PrepaymentFrequency = 'monthly' | 'quarterly' | 'annually' | 'onetime';

export interface RecurringPrepayment {
  amount: number;
  frequency: Exclude<PrepaymentFrequency, 'onetime'>;
  startDate: Date;
  endDate?: Date;
}

export interface OneTimePrepayment {
  id: string;
  date: Date;
  amount: number;
  description: string;
}

export interface PrepaymentStrategy {
  id: string;
  enabled: boolean;
  recurringPayments: RecurringPrepayment[];
  oneTimePayments: OneTimePrepayment[];
}

export interface PrepaymentEvent {
  date: Date;
  amount: number;
  type: 'recurring' | 'onetime';
  description: string;
  balanceAfter: number;
  interestSaved: number;
}

export interface PrepaymentResults {
  totalPrepayments: number;
  interestSaved: number;
  timeSaved: { years: number; months: number };
  originalPayoffDate: Date;
  newPayoffDate: Date;
  modifiedSchedule: any[]; // PaymentDetails[]
  prepaymentEvents: PrepaymentEvent[];
  monthlyPaymentWithPrepayment: number;
}

export interface PrepaymentTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultAmount?: number;
  frequency?: PrepaymentFrequency;
  timing?: string; // e.g., "April" for tax refunds
}

export const PREPAYMENT_TEMPLATES: PrepaymentTemplate[] = [
  {
    id: 'tax-refund',
    name: 'Tax Refund',
    icon: '💵',
    description: 'Annual tax refund payment',
    defaultAmount: 5000,
    frequency: 'annually',
    timing: 'April'
  },
  {
    id: 'work-bonus',
    name: 'Work Bonus',
    icon: '🎁',
    description: 'Year-end or performance bonus',
    defaultAmount: 10000,
    frequency: 'annually',
    timing: 'December'
  },
  {
    id: 'inheritance',
    name: 'Inheritance',
    icon: '💰',
    description: 'One-time windfall payment',
    defaultAmount: 25000,
    frequency: 'onetime'
  },
  {
    id: 'extra-monthly',
    name: 'Extra Monthly',
    icon: '📅',
    description: 'Additional monthly payment',
    defaultAmount: 500,
    frequency: 'monthly'
  },
  {
    id: 'quarterly-bonus',
    name: 'Quarterly Bonus',
    icon: '📊',
    description: 'Quarterly performance payment',
    defaultAmount: 2500,
    frequency: 'quarterly'
  },
  {
    id: 'stock-vesting',
    name: 'Stock Vesting',
    icon: '📈',
    description: 'Stock options or RSU vesting',
    defaultAmount: 15000,
    frequency: 'annually'
  }
];

export interface SmartPrepaymentPlan {
  id: string;
  name: string;
  description: string;
  monthlyExtra: number;
  oneTimePayments: { month: number; amount: number; description: string }[];
  totalInterestSaved: number;
  timeSaved: { years: number; months: number };
  affordabilityScore: number; // 1-10
}