import './style.css';
import { MortgageCalculator } from './calculator';
import type { MortgageInput, MortgageResults, PaymentDetails } from './types';
import { Chart, registerables } from 'chart.js';
import { ComparisonManager, ReverseCalculator } from './comparison';
import type { ComparisonScenario, ReverseCalculatorInput } from './comparison';
import { CurrencyService, CURRENCIES } from './currency-service';
import type { ExchangeRates } from './currency-service';
import { PrepaymentCalculator } from './prepayment-calculator';
import type { 
  PrepaymentStrategy, 
  OneTimePrepayment,
  PrepaymentResults
} from './prepayment-types';
import { PREPAYMENT_TEMPLATES } from './prepayment-types';
Chart.register(...registerables);

// Global variables
let currentResults: MortgageResults | null = null;
let currentInput: MortgageInput | null = null;
let paymentChart: Chart<"doughnut", number[], string> | null = null;
let balanceChart: Chart<"line", {x: string, y: number}[], unknown> | null = null;
let comparisonChart: Chart<"bar", number[], string> | null = null;
let prepaymentTimelineChart: Chart<"bar", number[], string> | null = null;
const comparisonManager = new ComparisonManager();
const reverseCalculator = new ReverseCalculator();
const currencyService = CurrencyService.getInstance();
let currentExchangeRates: ExchangeRates | null = null;

// Prepayment state
let currentPrepaymentStrategy: PrepaymentStrategy = {
  id: 'default',
  enabled: false,
  recurringPayments: [],
  oneTimePayments: []
};
let currentPrepaymentResults: PrepaymentResults | null = null;

// Initialize the app
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <h1 class="text-4xl font-bold text-gray-800 mb-8 text-center">Mortgage Calculator</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Input Form -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <form id="mortgage-form" class="space-y-6">
          <!-- STEP 1: Property Details -->
          <div class="space-y-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <h2 class="text-lg font-semibold text-gray-800">Property Details</h2>
            </div>
            
            <!-- Currency Selector -->
            <div>
              <label for="currency" class="block text-sm font-medium text-gray-700 mb-1">
                Currency
                <span class="inline-block ml-1 text-gray-400 cursor-help" title="Select the currency for your mortgage">
                  <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </label>
              <select
                id="currency"
                name="currency"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                ${Object.entries(CURRENCIES).map(([code, info]) => 
                  `<option value="${code}" ${code === 'USD' ? 'selected' : ''}>${info.symbol} ${code} - ${info.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <!-- Currency Conversion Toggle -->
            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="showCurrencyConversion"
                  name="showCurrencyConversion"
                  class="text-blue-600 focus:ring-blue-500 rounded"
                />
                <span class="text-sm font-medium text-gray-700">Show currency conversion</span>
              </label>
            </div>
            
            <!-- Currency Conversion Options (Hidden by default) -->
            <div id="currencyConversionSection" class="hidden space-y-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label for="displayCurrency" class="block text-sm font-medium text-gray-700 mb-1">
                  Display Currency
                </label>
                <select
                  id="displayCurrency"
                  name="displayCurrency"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  ${Object.entries(CURRENCIES).map(([code, info]) => 
                    `<option value="${code}" ${code === 'EUR' ? 'selected' : ''}>${info.symbol} ${code} - ${info.name}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div>
                <label for="exchangeRate" class="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Rate
                  <span class="text-xs text-gray-500 ml-1" id="exchangeRateLabel">(1 USD = ? EUR)</span>
                </label>
                <div class="flex gap-2">
                  <div class="relative flex-1">
                    <input
                      type="number"
                      id="exchangeRate"
                      name="exchangeRate"
                      value="0.92"
                      min="0.0001"
                      step="0.0001"
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span id="userOverrideIndicator" class="hidden absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-600" title="User-defined rate">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                    </span>
                  </div>
                  <button
                    type="button"
                    id="fetchLatestRate"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-sm font-medium whitespace-nowrap"
                  >
                    <span id="fetchRateText">Fetch Latest</span>
                    <span id="fetchRateLoading" class="hidden">
                      <svg class="animate-spin h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  </button>
                </div>
                <p class="mt-1 text-xs text-gray-500" id="rateLastUpdated"></p>
              </div>
            </div>
            
            <!-- Prepayment Strategy Section (Collapsible) -->
            <div class="pt-4 border-t border-gray-200">
              <button
                type="button"
                id="toggle-prepayment"
                class="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <span class="font-semibold">Prepayment Strategy</span>
                  <span id="prepayment-status" class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Disabled</span>
                </span>
                <svg id="prepayment-chevron" class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              
              <div id="prepayment-section" class="hidden mt-4 space-y-4">
                <!-- Enable/Disable Toggle -->
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="enablePrepayment"
                    name="enablePrepayment"
                    class="text-green-600 focus:ring-green-500 rounded"
                  />
                  <span class="text-sm font-medium text-gray-700">Enable prepayment strategy</span>
                </label>
                
                <!-- Tab Interface -->
                <div id="prepayment-tabs-container" class="opacity-50 transition-opacity">
                  <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8" aria-label="Tabs">
                      <button
                        type="button"
                        data-tab="recurring"
                        class="prepayment-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                      >
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Recurring
                      </button>
                      <button
                        type="button"
                        data-tab="onetime"
                        class="prepayment-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                      >
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        One-Time
                      </button>
                      <button
                        type="button"
                        data-tab="smart"
                        class="prepayment-tab border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm"
                      >
                        <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        Smart Plans
                      </button>
                    </nav>
                  </div>
                  
                  <!-- Tab Content -->
                  <div class="mt-4">
                    <!-- Recurring Tab -->
                    <div id="recurring-tab" class="prepayment-tab-content">
                      <div class="space-y-4">
                        <div>
                          <label for="recurringAmount" class="block text-sm font-medium text-gray-700 mb-1">
                            Extra Payment Amount
                          </label>
                          <div class="relative">
                            <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" id="recurringAmountSymbol">$</span>
                            <input
                              type="number"
                              id="recurringAmount"
                              name="recurringAmount"
                              value="0"
                              min="0"
                              step="50"
                              class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label for="recurringFrequency" class="block text-sm font-medium text-gray-700 mb-1">
                            Frequency
                          </label>
                          <select
                            id="recurringFrequency"
                            name="recurringFrequency"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="annually">Annually</option>
                          </select>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <label for="recurringStartDate" class="block text-sm font-medium text-gray-700 mb-1">
                              Start Date
                            </label>
                            <input
                              type="date"
                              id="recurringStartDate"
                              name="recurringStartDate"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label for="recurringEndDate" class="block text-sm font-medium text-gray-700 mb-1">
                              End Date (Optional)
                            </label>
                            <input
                              type="date"
                              id="recurringEndDate"
                              name="recurringEndDate"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- One-Time Tab -->
                    <div id="onetime-tab" class="prepayment-tab-content hidden">
                      <div class="space-y-4">
                        <!-- Quick Templates -->
                        <div>
                          <p class="text-sm font-medium text-gray-700 mb-2">Quick Templates</p>
                          <div class="grid grid-cols-3 gap-2">
                            ${PREPAYMENT_TEMPLATES.slice(0, 6).map(template => `
                              <button
                                type="button"
                                class="prepayment-template p-2 text-xs border border-gray-300 rounded-md hover:border-green-500 hover:bg-green-50 transition-colors"
                                data-template-id="${template.id}"
                              >
                                <span class="block text-lg mb-1">${template.icon}</span>
                                <span class="block font-medium">${template.name}</span>
                              </button>
                            `).join('')}
                          </div>
                        </div>
                        
                        <!-- One-Time Payments List -->
                        <div>
                          <div class="flex justify-between items-center mb-2">
                            <p class="text-sm font-medium text-gray-700">One-Time Payments</p>
                            <button
                              type="button"
                              id="add-onetime-payment"
                              class="text-sm text-green-600 hover:text-green-700 font-medium"
                            >
                              + Add Payment
                            </button>
                          </div>
                          <div id="onetime-payments-list" class="space-y-2">
                            <p class="text-sm text-gray-500 text-center py-4">No one-time payments added yet</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Smart Plans Tab -->
                    <div id="smart-tab" class="prepayment-tab-content hidden">
                      <div class="space-y-4">
                        <p class="text-sm text-gray-600 mb-4">Choose a prepayment plan based on your risk tolerance and budget</p>
                        <div id="smart-plans-container" class="grid grid-cols-1 gap-4">
                          <!-- Plans will be dynamically inserted here -->
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Impact Summary -->
                  <div id="prepayment-impact" class="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 hidden">
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      <div class="flex-1">
                        <p class="text-sm font-semibold text-green-800">Prepayment Impact</p>
                        <div class="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span class="text-green-700">Interest Saved:</span>
                            <span id="impact-interest-saved" class="font-bold text-green-800 ml-1">$0</span>
                          </div>
                          <div>
                            <span class="text-green-700">Time Saved:</span>
                            <span id="impact-time-saved" class="font-bold text-green-800 ml-1">0 months</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label for="homePrice" class="block text-sm font-medium text-gray-700 mb-1">
                Home Price
                <span class="inline-block ml-1 text-gray-400 cursor-help" title="The total purchase price of the property">
                  <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" id="homePriceSymbol">$</span>
                <input
                  type="number"
                  id="homePrice"
                  name="homePrice"
                  value="400000"
                  min="1000"
                  step="1000"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Down Payment Type
              </label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input
                    type="radio"
                    name="downPaymentType"
                    value="percentage"
                    checked
                    class="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Percentage</span>
                </label>
                <label class="flex items-center">
                  <input
                    type="radio"
                    name="downPaymentType"
                    value="fixed"
                    class="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-sm text-gray-700">Fixed Amount</span>
                </label>
              </div>
            </div>
            
            <div>
              <label for="downPaymentValue" class="block text-sm font-medium text-gray-700 mb-1">
                <span id="downPaymentLabel">Down Payment (%)</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" id="downPaymentPrefix">%</span>
                <input
                  type="number"
                  id="downPaymentValue"
                  name="downPaymentValue"
                  value="20"
                  min="0"
                  step="0.1"
                  class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <p class="mt-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded">
                <span class="font-medium">Your loan amount will be:</span> 
                <span id="loanAmountDisplay" class="font-semibold text-blue-700">$320,000</span>
              </p>
            </div>
          </div>
          
          <!-- STEP 2: Loan Details -->
          <div class="space-y-4 pt-4 border-t border-gray-200">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <h2 class="text-lg font-semibold text-gray-800">Loan Details</h2>
            </div>
            
            <div>
              <label for="interestRate" class="block text-sm font-medium text-gray-700 mb-1">
                Interest Rate
                <span class="inline-block ml-1 text-gray-400 cursor-help" title="Annual interest rate for your mortgage">
                  <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </label>
              <div class="relative">
                <input
                  type="number"
                  id="interestRate"
                  name="interestRate"
                  value="6.5"
                  min="0"
                  max="30"
                  step="0.1"
                  class="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            
            <div>
              <label for="loanTermYears" class="block text-sm font-medium text-gray-700 mb-1">
                Loan Term
              </label>
              <select
                id="loanTermYears"
                name="loanTermYears"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="15">15 years</option>
                <option value="20">20 years</option>
                <option value="30" selected>30 years</option>
              </select>
            </div>
            
            <div>
              <label for="paymentFrequency" class="block text-sm font-medium text-gray-700 mb-1">
                Payment Frequency
                <span class="inline-block ml-1 text-gray-400 cursor-help" title="How often you'll make payments. Bi-weekly and weekly payments can save you money on interest">
                  <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </label>
              <select
                id="paymentFrequency"
                name="paymentFrequency"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          
          <!-- Optional: Extra Payments (Collapsible) -->
          <div class="pt-4 border-t border-gray-200">
            <button
              type="button"
              id="toggle-extra-payments"
              class="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span class="flex items-center gap-2">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Show Advanced Options
              </span>
              <svg id="extra-payments-chevron" class="w-5 h-5 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            
            <div id="extra-payments-section" class="hidden mt-4 space-y-4">
              <div>
                <label for="extraPayment" class="block text-sm font-medium text-gray-700 mb-1">
                  Extra Payment per Period
                  <span class="inline-block ml-1 text-gray-400 cursor-help" title="Additional amount paid with each regular payment to reduce principal faster">
                    <svg class="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                    </svg>
                  </span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" id="extraPaymentSymbol">$</span>
                  <input
                    type="number"
                    id="extraPayment"
                    name="extraPayment"
                    value="0"
                    min="0"
                    step="10"
                    class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p class="mt-1 text-xs text-gray-500">Making extra payments can significantly reduce your total interest</p>
              </div>
            </div>
          </div>
          
          <!-- Hidden loan amount field for form submission -->
          <input
            type="hidden"
            id="loanAmount"
            name="loanAmount"
            value="320000"
          />
          
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition duration-200 font-semibold text-base shadow-sm"
            >
              Calculate Mortgage
            </button>
            <button
              type="button"
              id="add-comparison"
              class="bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 transition duration-200 font-medium shadow-sm"
              title="Add to comparison"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
      
      <!-- Results Summary -->
      <div class="bg-white rounded-lg shadow-md p-6">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Results</h2>
        <div id="results-summary" class="space-y-4">
          <div class="text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <p class="text-gray-500">Enter loan details and click Calculate to see your results</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Collapsible Sections -->
    <div class="mt-8 space-y-4">
      <!-- Payment Breakdown Section -->
      <div id="payment-breakdown-section" class="hidden bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          id="toggle-payment-breakdown"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 class="text-lg font-semibold text-gray-800">View Payment Breakdown</h3>
          <svg id="payment-breakdown-chevron" class="w-5 h-5 text-gray-400 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="payment-breakdown-content" class="hidden">
          <div class="p-6 pt-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 class="text-base font-medium text-gray-700 mb-3">Payment Distribution</h4>
              <canvas id="payment-chart"></canvas>
            </div>
            <div>
              <h4 class="text-base font-medium text-gray-700 mb-3">Balance Over Time</h4>
              <canvas id="balance-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Prepayment Timeline Section -->
      <div id="prepayment-timeline-section" class="hidden bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          id="toggle-prepayment-timeline"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 class="text-lg font-semibold text-gray-800">Prepayment Timeline</h3>
          <svg id="prepayment-timeline-chevron" class="w-5 h-5 text-gray-400 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="prepayment-timeline-content" class="hidden">
          <div class="p-6 pt-0">
            <h4 class="text-base font-medium text-gray-700 mb-3">Prepayment Schedule & Impact</h4>
            <canvas id="prepayment-timeline-chart"></canvas>
            <div id="prepayment-events-list" class="mt-4 space-y-2 max-h-48 overflow-y-auto">
              <!-- Prepayment events will be listed here -->
            </div>
          </div>
        </div>
      </div>
      
      <!-- Amortization Schedule Section -->
      <div id="amortization-section" class="hidden bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          id="toggle-amortization"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 class="text-lg font-semibold text-gray-800">See Amortization Schedule</h3>
          <svg id="amortization-chevron" class="w-5 h-5 text-gray-400 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="amortization-content" class="hidden">
          <div class="p-6 pt-0">
            <div class="flex justify-between items-center mb-4">
              <p class="text-sm text-gray-600">Showing first and last payments</p>
              <button
                id="export-csv"
                class="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition duration-200 text-sm font-medium"
              >
                Export Full Schedule
              </button>
            </div>
            <div class="overflow-x-auto">
              <table id="amortization-table" class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment #
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Principal
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interest
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extra
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody id="amortization-tbody" class="bg-white divide-y divide-gray-200">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Compare Scenarios Section -->
      <div id="comparison-wrapper" class="hidden">
        <div id="comparison-section" class="bg-white rounded-lg shadow-md overflow-hidden">
          <button
            type="button"
            id="toggle-comparison"
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h3 class="text-lg font-semibold text-gray-800">Compare Scenarios</h3>
            <svg id="comparison-chevron" class="w-5 h-5 text-gray-400 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div id="comparison-content" class="hidden">
            <div class="p-6 pt-0">
              <div class="flex justify-between items-center mb-4">
                <p class="text-sm text-gray-600">Compare different mortgage scenarios</p>
                <button
                  id="clear-comparisons"
                  class="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition duration-200 text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
              <div id="comparison-table" class="overflow-x-auto">
                <p class="text-gray-500 text-center py-4">Add scenarios to compare</p>
              </div>
              <canvas id="comparison-chart" class="mt-4 hidden"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Affordability Calculator Section -->
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          type="button"
          id="toggle-reverse"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 class="text-lg font-semibold text-gray-800">Affordability Calculator</h3>
          <svg id="reverse-chevron" class="w-5 h-5 text-gray-400 transform rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div id="reverse-content" class="hidden">
          <div class="p-6 pt-0">
            <p class="text-sm text-gray-600 mb-4">Find out how much house you can afford based on your desired monthly payment</p>
            <form id="reverse-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="targetPayment" class="block text-sm font-medium text-gray-700 mb-1">
                  Target Monthly Payment
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" id="targetPaymentSymbol">$</span>
                  <input
                    type="number"
                    id="targetPayment"
                    name="targetPayment"
                    value="2000"
                    min="100"
                    step="10"
                    class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label for="reverseInterestRate" class="block text-sm font-medium text-gray-700 mb-1">
                  Interest Rate
                </label>
                <div class="relative">
                  <input
                    type="number"
                    id="reverseInterestRate"
                    name="reverseInterestRate"
                    value="6.5"
                    min="0"
                    max="30"
                    step="0.1"
                    class="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              
              <div>
                <label for="reverseLoanTermYears" class="block text-sm font-medium text-gray-700 mb-1">
                  Loan Term
                </label>
                <select
                  id="reverseLoanTermYears"
                  name="reverseLoanTermYears"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="15">15 years</option>
                  <option value="20">20 years</option>
                  <option value="30" selected>30 years</option>
                </select>
              </div>
              
              <div>
                <label for="reverseDownPayment" class="block text-sm font-medium text-gray-700 mb-1">
                  Down Payment
                </label>
                <div class="relative">
                  <input
                    type="number"
                    id="reverseDownPayment"
                    name="reverseDownPayment"
                    value="20"
                    min="0"
                    max="100"
                    step="0.1"
                    class="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>
              
              <div class="md:col-span-2">
                <button
                  type="submit"
                  class="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition duration-200 font-semibold"
                >
                  Calculate Maximum Home Price
                </button>
              </div>
            </form>
            
            <div id="reverse-results" class="mt-4 hidden">
              <div class="p-4 bg-purple-50 rounded-lg">
                <h4 class="font-semibold text-purple-900 mb-2">Maximum Affordability</h4>
                <div id="reverse-results-content" class="space-y-2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

// Form submission handler
const form = document.getElementById('mortgage-form') as HTMLFormElement;
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await calculateMortgage();
});

// Export CSV handler
document.getElementById('export-csv')?.addEventListener('click', exportToCSV);

// Add comparison handler
document.getElementById('add-comparison')?.addEventListener('click', addToComparison);

// Clear comparisons handler
document.getElementById('clear-comparisons')?.addEventListener('click', clearComparisons);

// Reverse calculator form handler
const reverseForm = document.getElementById('reverse-form') as HTMLFormElement;
reverseForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  calculateReverse();
});

// Down payment type change handler
const downPaymentTypeRadios = document.querySelectorAll('input[name="downPaymentType"]');
const downPaymentLabel = document.getElementById('downPaymentLabel');
const downPaymentValueInput = document.getElementById('downPaymentValue') as HTMLInputElement;
const downPaymentPrefix = document.getElementById('downPaymentPrefix');

downPaymentTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (downPaymentLabel && downPaymentValueInput && downPaymentPrefix) {
      const currency = currencySelect?.value || 'USD';
      const currencyInfo = CURRENCIES[currency];
      const symbol = currencyInfo?.symbol || '$';
      
      if (target.value === 'percentage') {
        downPaymentLabel.textContent = 'Down Payment (%)';
        downPaymentPrefix.textContent = '%';
        downPaymentValueInput.value = '20';
        downPaymentValueInput.step = '0.1';
        downPaymentValueInput.max = '100';
      } else {
        downPaymentLabel.textContent = `Down Payment (${symbol})`;
        downPaymentPrefix.textContent = symbol;
        downPaymentValueInput.value = '80000';
        downPaymentValueInput.step = '1000';
        downPaymentValueInput.removeAttribute('max');
      }
      calculateLoanAmount();
    }
  });
});

// Toggle handlers for collapsible sections
const toggleExtraPayments = document.getElementById('toggle-extra-payments');
const extraPaymentsSection = document.getElementById('extra-payments-section');
const extraPaymentsChevron = document.getElementById('extra-payments-chevron');

toggleExtraPayments?.addEventListener('click', () => {
  extraPaymentsSection?.classList.toggle('hidden');
  extraPaymentsChevron?.classList.toggle('rotate-180');
});

const togglePaymentBreakdown = document.getElementById('toggle-payment-breakdown');
const paymentBreakdownContent = document.getElementById('payment-breakdown-content');
const paymentBreakdownChevron = document.getElementById('payment-breakdown-chevron');

togglePaymentBreakdown?.addEventListener('click', () => {
  paymentBreakdownContent?.classList.toggle('hidden');
  paymentBreakdownChevron?.classList.toggle('rotate-180');
});

const toggleAmortization = document.getElementById('toggle-amortization');
const amortizationContent = document.getElementById('amortization-content');
const amortizationChevron = document.getElementById('amortization-chevron');

toggleAmortization?.addEventListener('click', () => {
  amortizationContent?.classList.toggle('hidden');
  amortizationChevron?.classList.toggle('rotate-180');
});

const toggleComparison = document.getElementById('toggle-comparison');
const comparisonContent = document.getElementById('comparison-content');
const comparisonChevron = document.getElementById('comparison-chevron');

toggleComparison?.addEventListener('click', () => {
  comparisonContent?.classList.toggle('hidden');
  comparisonChevron?.classList.toggle('rotate-180');
});

const toggleReverse = document.getElementById('toggle-reverse');
const reverseContent = document.getElementById('reverse-content');
const reverseChevron = document.getElementById('reverse-chevron');

toggleReverse?.addEventListener('click', () => {
  reverseContent?.classList.toggle('hidden');
  reverseChevron?.classList.toggle('rotate-180');
});

// Prepayment handlers
const togglePrepayment = document.getElementById('toggle-prepayment');
const prepaymentSection = document.getElementById('prepayment-section');
const prepaymentChevron = document.getElementById('prepayment-chevron');

togglePrepayment?.addEventListener('click', () => {
  prepaymentSection?.classList.toggle('hidden');
  prepaymentChevron?.classList.toggle('rotate-180');
});

const togglePrepaymentTimeline = document.getElementById('toggle-prepayment-timeline');
const prepaymentTimelineContent = document.getElementById('prepayment-timeline-content');
const prepaymentTimelineChevron = document.getElementById('prepayment-timeline-chevron');

togglePrepaymentTimeline?.addEventListener('click', () => {
  prepaymentTimelineContent?.classList.toggle('hidden');
  prepaymentTimelineChevron?.classList.toggle('rotate-180');
});

// Enable prepayment toggle
const enablePrepaymentToggle = document.getElementById('enablePrepayment') as HTMLInputElement;
const prepaymentTabsContainer = document.getElementById('prepayment-tabs-container');
const prepaymentStatus = document.getElementById('prepayment-status');

enablePrepaymentToggle?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  currentPrepaymentStrategy.enabled = target.checked;
  
  if (target.checked) {
    prepaymentTabsContainer?.classList.remove('opacity-50');
    prepaymentStatus!.textContent = 'Enabled';
    prepaymentStatus!.classList.remove('bg-gray-100', 'text-gray-600');
    prepaymentStatus!.classList.add('bg-green-100', 'text-green-700');
  } else {
    prepaymentTabsContainer?.classList.add('opacity-50');
    prepaymentStatus!.textContent = 'Disabled';
    prepaymentStatus!.classList.remove('bg-green-100', 'text-green-700');
    prepaymentStatus!.classList.add('bg-gray-100', 'text-gray-600');
  }
  
  updatePrepaymentImpact();
});

// Tab switching
const prepaymentTabs = document.querySelectorAll('.prepayment-tab');
prepaymentTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    const button = e.currentTarget as HTMLButtonElement;
    const tabName = button.getAttribute('data-tab') as 'recurring' | 'onetime' | 'smart';
    if (!tabName) return;
    
    // currentActiveTab = tabName; // Currently unused
    
    // Update tab styles
    prepaymentTabs.forEach(t => {
      t.classList.remove('border-green-500', 'text-green-600');
      t.classList.add('border-transparent', 'text-gray-500');
    });
    button.classList.remove('border-transparent', 'text-gray-500');
    button.classList.add('border-green-500', 'text-green-600');
    
    // Show/hide tab content
    document.querySelectorAll('.prepayment-tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-tab`)?.classList.remove('hidden');
    
    // Load smart plans if switching to smart tab
    if (tabName === 'smart') {
      loadSmartPlans();
    }
  });
});

// Set initial active tab
(document.querySelector('[data-tab="recurring"]') as HTMLButtonElement)?.click();

// Recurring payment inputs
const recurringAmountInput = document.getElementById('recurringAmount') as HTMLInputElement;
const recurringFrequencySelect = document.getElementById('recurringFrequency') as HTMLSelectElement;
const recurringStartDateInput = document.getElementById('recurringStartDate') as HTMLInputElement;
const recurringEndDateInput = document.getElementById('recurringEndDate') as HTMLInputElement;

// Set default start date to today
recurringStartDateInput.valueAsDate = new Date();

[recurringAmountInput, recurringFrequencySelect, recurringStartDateInput, recurringEndDateInput].forEach(input => {
  input?.addEventListener('change', updateRecurringPrepayment);
});

// One-time payment handlers
document.getElementById('add-onetime-payment')?.addEventListener('click', addOneTimePayment);

// Template buttons
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const templateButton = target.closest('.prepayment-template') as HTMLButtonElement;
  if (templateButton) {
    const templateId = templateButton.getAttribute('data-template-id');
    const template = PREPAYMENT_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      addOneTimePaymentFromTemplate(template);
    }
  }
});

// Home price and down payment change handlers
const homePriceInput = document.getElementById('homePrice') as HTMLInputElement;
const loanAmountInput = document.getElementById('loanAmount') as HTMLInputElement;

homePriceInput?.addEventListener('input', calculateLoanAmount);
downPaymentValueInput?.addEventListener('input', calculateLoanAmount);

// Currency handlers
const currencySelect = document.getElementById('currency') as HTMLSelectElement;
const displayCurrencySelect = document.getElementById('displayCurrency') as HTMLSelectElement;
const showCurrencyConversionToggle = document.getElementById('showCurrencyConversion') as HTMLInputElement;
const currencyConversionSection = document.getElementById('currencyConversionSection');
const exchangeRateInput = document.getElementById('exchangeRate') as HTMLInputElement;
const fetchLatestRateBtn = document.getElementById('fetchLatestRate');
const userOverrideIndicator = document.getElementById('userOverrideIndicator');

// Update currency symbols when currency changes
currencySelect?.addEventListener('change', () => {
  updateCurrencySymbols();
  updateExchangeRateLabel();
  if (showCurrencyConversionToggle?.checked) {
    fetchExchangeRate();
  }
});

displayCurrencySelect?.addEventListener('change', () => {
  updateExchangeRateLabel();
  if (showCurrencyConversionToggle?.checked) {
    fetchExchangeRate();
  }
});

// Toggle currency conversion section
showCurrencyConversionToggle?.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.checked) {
    currencyConversionSection?.classList.remove('hidden');
    fetchExchangeRate();
  } else {
    currencyConversionSection?.classList.add('hidden');
  }
});

// Exchange rate input change
exchangeRateInput?.addEventListener('input', () => {
  userOverrideIndicator?.classList.remove('hidden');
  const baseCurrency = currencySelect?.value || 'USD';
  const displayCurrency = displayCurrencySelect?.value || 'EUR';
  const rate = parseFloat(exchangeRateInput.value);
  if (!isNaN(rate) && rate > 0) {
    currencyService.saveUserRate(baseCurrency, displayCurrency, rate);
  }
});

// Fetch latest rate button
fetchLatestRateBtn?.addEventListener('click', () => {
  fetchExchangeRate();
});

function updateCurrencySymbols() {
  const currency = currencySelect?.value || 'USD';
  const currencyInfo = CURRENCIES[currency];
  const symbol = currencyInfo?.symbol || '$';
  
  // Update all currency symbols
  const homePriceSymbol = document.getElementById('homePriceSymbol');
  const extraPaymentSymbol = document.getElementById('extraPaymentSymbol');
  const downPaymentPrefix = document.getElementById('downPaymentPrefix');
  const targetPaymentSymbol = document.getElementById('targetPaymentSymbol');
  const recurringAmountSymbol = document.getElementById('recurringAmountSymbol');
  
  if (homePriceSymbol) homePriceSymbol.textContent = symbol;
  if (extraPaymentSymbol) extraPaymentSymbol.textContent = symbol;
  if (targetPaymentSymbol) targetPaymentSymbol.textContent = symbol;
  if (recurringAmountSymbol) recurringAmountSymbol.textContent = symbol;
  
  // Update down payment prefix if in fixed mode
  const downPaymentType = (document.querySelector('input[name="downPaymentType"]:checked') as HTMLInputElement)?.value;
  if (downPaymentPrefix && downPaymentType === 'fixed') {
    downPaymentPrefix.textContent = symbol;
  }
}

function updateExchangeRateLabel() {
  const baseCurrency = currencySelect?.value || 'USD';
  const displayCurrency = displayCurrencySelect?.value || 'EUR';
  const label = document.getElementById('exchangeRateLabel');
  if (label) {
    label.textContent = `(1 ${baseCurrency} = ? ${displayCurrency})`;
  }
}

async function fetchExchangeRate() {
  const baseCurrency = currencySelect?.value || 'USD';
  const displayCurrency = displayCurrencySelect?.value || 'EUR';
  
  if (baseCurrency === displayCurrency) {
    exchangeRateInput.value = '1';
    userOverrideIndicator?.classList.add('hidden');
    return;
  }
  
  const fetchRateText = document.getElementById('fetchRateText');
  const fetchRateLoading = document.getElementById('fetchRateLoading');
  
  if (fetchRateText) fetchRateText.classList.add('hidden');
  if (fetchRateLoading) fetchRateLoading.classList.remove('hidden');
  // isLoadingRates = true;
  
  try {
    const rates = await currencyService.getExchangeRates(baseCurrency);
    currentExchangeRates = rates;
    
    const rate = rates.rates[displayCurrency] || 1;
    exchangeRateInput.value = rate.toFixed(4);
    
    // Update last updated text
    const lastUpdated = document.getElementById('rateLastUpdated');
    if (lastUpdated) {
      const date = new Date(rates.timestamp);
      lastUpdated.textContent = `Last updated: ${date.toLocaleString()}`;
    }
    
    // Show/hide user override indicator
    if (rates.isUserOverride) {
      userOverrideIndicator?.classList.remove('hidden');
    } else {
      userOverrideIndicator?.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
  } finally {
    if (fetchRateText) fetchRateText.classList.remove('hidden');
    if (fetchRateLoading) fetchRateLoading.classList.add('hidden');
    // isLoadingRates = false;
  }
}

function calculateLoanAmount() {
  const homePrice = parseFloat(homePriceInput?.value || '0');
  const downPaymentValue = parseFloat(downPaymentValueInput?.value || '0');
  const downPaymentType = (document.querySelector('input[name="downPaymentType"]:checked') as HTMLInputElement)?.value;
  
  let downPaymentAmount: number;
  if (downPaymentType === 'percentage') {
    downPaymentAmount = (homePrice * downPaymentValue) / 100;
  } else {
    downPaymentAmount = downPaymentValue;
  }
  
  const loanAmount = Math.max(0, homePrice - downPaymentAmount);
  if (loanAmountInput) {
    loanAmountInput.value = loanAmount.toFixed(2);
  }
  
  // Update the loan amount display
  const loanAmountDisplay = document.getElementById('loanAmountDisplay');
  if (loanAmountDisplay) {
    const currency = currencySelect?.value || 'USD';
    loanAmountDisplay.textContent = currencyService.formatCurrency(loanAmount, currency);
  }
}

async function calculateMortgage() {
  const formData = new FormData(form);
  
  const currency = formData.get('currency') as string || 'USD';
  let displayCurrency: string | undefined;
  let exchangeRate: number | undefined;
  
  // Handle currency conversion if enabled
  if (showCurrencyConversionToggle?.checked) {
    displayCurrency = formData.get('displayCurrency') as string || 'EUR';
    exchangeRate = Number(formData.get('exchangeRate')) || 1;
    
    // Ensure we have exchange rates loaded
    if (!currentExchangeRates || currentExchangeRates.base !== currency) {
      await fetchExchangeRate();
    }
  }
  
  const input: MortgageInput = {
    homePrice: Number(formData.get('homePrice')),
    downPaymentType: formData.get('downPaymentType') as 'percentage' | 'fixed',
    downPaymentValue: Number(formData.get('downPaymentValue')),
    loanAmount: Number(formData.get('loanAmount')),
    interestRate: Number(formData.get('interestRate')),
    loanTermYears: Number(formData.get('loanTermYears')),
    paymentFrequency: formData.get('paymentFrequency') as 'monthly' | 'biweekly' | 'weekly',
    extraPayment: Number(formData.get('extraPayment')) || 0,
    currency: currency,
    displayCurrency: displayCurrency,
    exchangeRate: exchangeRate
  };
  
  currentInput = input;
  const calculator = new MortgageCalculator(input);
  currentResults = calculator.calculate();
  
  // Apply prepayment strategy if enabled
  if (currentPrepaymentStrategy.enabled && 
      (currentPrepaymentStrategy.recurringPayments.length > 0 || 
       currentPrepaymentStrategy.oneTimePayments.length > 0)) {
    const prepaymentCalculator = new PrepaymentCalculator(
      currentResults.regularPaymentAmount,
      currentInput.interestRate,
      currentResults.amortizationSchedule
    );
    currentPrepaymentResults = prepaymentCalculator.calculateWithPrepayments(currentPrepaymentStrategy);
    
    // Update results with prepayment data
    currentResults.amortizationSchedule = currentPrepaymentResults.modifiedSchedule;
    currentResults.totalPayments = currentPrepaymentResults.modifiedSchedule.length;
    currentResults.payoffDate = currentPrepaymentResults.newPayoffDate;
    currentResults.totalAmount = currentPrepaymentResults.modifiedSchedule.reduce((sum, p) => sum + p.paymentAmount, 0);
    currentResults.totalInterest = currentPrepaymentResults.modifiedSchedule.reduce((sum, p) => sum + p.interestPayment, 0);
  }
  
  // Add converted amounts if currency conversion is enabled
  if (displayCurrency && exchangeRate && displayCurrency !== currency) {
    currentResults.convertedAmounts = {
      homePrice: currencyService.convertAmount(currentResults.homePrice, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() }),
      downPaymentAmount: currencyService.convertAmount(currentResults.downPaymentAmount, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() }),
      loanAmount: currencyService.convertAmount(currentResults.loanAmount, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() }),
      regularPaymentAmount: currencyService.convertAmount(currentResults.regularPaymentAmount, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() }),
      totalAmount: currencyService.convertAmount(currentResults.totalAmount, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() }),
      totalInterest: currencyService.convertAmount(currentResults.totalInterest, currency, displayCurrency, currentExchangeRates || { base: currency, date: '', rates: { [displayCurrency]: exchangeRate }, timestamp: Date.now() })
    };
  }
  
  displayResults(currentResults);
  createCharts(currentResults);
  displayAmortizationSchedule(currentResults.amortizationSchedule);
  
  // Show collapsible sections
  document.getElementById('payment-breakdown-section')?.classList.remove('hidden');
  document.getElementById('amortization-section')?.classList.remove('hidden');
  
  // Show prepayment timeline if prepayments are enabled
  if (currentPrepaymentStrategy.enabled && currentPrepaymentResults) {
    document.getElementById('prepayment-timeline-section')?.classList.remove('hidden');
    createPrepaymentTimeline(currentPrepaymentResults);
  } else {
    document.getElementById('prepayment-timeline-section')?.classList.add('hidden');
  }
}

function displayResults(results: MortgageResults) {
  const summaryDiv = document.getElementById('results-summary');
  if (!summaryDiv) return;
  
  const baseCurrency = results.currency || 'USD';
  const displayCurrency = results.displayCurrency;
  const showConversion = displayCurrency && displayCurrency !== baseCurrency && results.convertedAmounts;
  
  const paymentFrequencyText = currentInput?.paymentFrequency === 'monthly' ? 'Monthly' : 
                               currentInput?.paymentFrequency === 'biweekly' ? 'Bi-weekly' : 'Weekly';
  
  const interestSavings = currentPrepaymentResults?.interestSaved || calculateInterestSavings(results);
  const showPrepaymentImpact = currentPrepaymentStrategy.enabled && currentPrepaymentResults && interestSavings > 0;
  
  summaryDiv.innerHTML = `
    <div class="space-y-6">
      <!-- Big Payment Display -->
      <div class="text-center p-6 bg-blue-50 rounded-lg">
        <p class="text-sm text-gray-600 mb-2">${paymentFrequencyText} Payment</p>
        <p class="text-4xl font-bold text-blue-700">${currencyService.formatCurrency(results.regularPaymentAmount, baseCurrency)}</p>
        ${showConversion ? `
          <p class="text-lg text-blue-600 mt-1">${currencyService.formatCurrency(results.convertedAmounts!.regularPaymentAmount, displayCurrency!)}</p>
        ` : ''}
        ${currentInput?.extraPayment && currentInput.extraPayment > 0 ? `
          <p class="text-sm text-gray-600 mt-2">+ ${currencyService.formatCurrency(currentInput.extraPayment, baseCurrency)} extra</p>
        ` : ''}
      </div>
      
      <!-- Key Details -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Loan Amount</span>
          <div class="text-right">
            <span class="font-semibold text-gray-800">${currencyService.formatCurrency(results.loanAmount, baseCurrency)}</span>
            ${showConversion ? `<br><span class="text-sm text-gray-600">${currencyService.formatCurrency(results.convertedAmounts!.loanAmount, displayCurrency!)}</span>` : ''}
          </div>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Interest Rate</span>
          <span class="font-semibold text-gray-800">${currentInput?.interestRate}%</span>
        </div>
        
        <div class="flex justify-between items-center">
          <span class="text-gray-600">Loan Term</span>
          <span class="font-semibold text-gray-800">${currentInput?.loanTermYears} years</span>
        </div>
      </div>
      
      <!-- Total Cost Summary (Collapsible) -->
      <div class="border-t pt-4">
        <button
          type="button"
          id="toggle-cost-summary"
          class="w-full flex items-center justify-between text-left hover:text-gray-700"
        >
          <span class="text-sm font-medium text-gray-600">View Total Cost Summary</span>
          <svg id="cost-summary-chevron" class="w-4 h-4 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        
        <div id="cost-summary-content" class="hidden mt-3 space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Total of ${results.totalPayments} payments</span>
            <div class="text-right">
              <span class="font-medium text-gray-800">${currencyService.formatCurrency(results.totalAmount, baseCurrency)}</span>
              ${showConversion ? `<br><span class="text-xs text-gray-600">${currencyService.formatCurrency(results.convertedAmounts!.totalAmount, displayCurrency!)}</span>` : ''}
            </div>
          </div>
          
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Total Interest Paid</span>
            <div class="text-right">
              <span class="font-medium text-gray-800">${currencyService.formatCurrency(results.totalInterest, baseCurrency)}</span>
              ${showConversion ? `<br><span class="text-xs text-gray-600">${currencyService.formatCurrency(results.convertedAmounts!.totalInterest, displayCurrency!)}</span>` : ''}
            </div>
          </div>
          
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-600">Payoff Date</span>
            <span class="font-medium text-gray-800">${results.payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
      
      ${showPrepaymentImpact ? `
        <!-- Prepayment Impact -->
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-green-800">Prepayment Strategy Impact</p>
              <p class="text-sm text-green-700">Interest saved: ${currencyService.formatCurrency(interestSavings, baseCurrency)}</p>
              <p class="text-sm text-green-700">Time saved: ${currentPrepaymentResults!.timeSaved.years} years, ${currentPrepaymentResults!.timeSaved.months} months</p>
              <p class="text-sm text-green-700">Total prepayments: ${currencyService.formatCurrency(currentPrepaymentResults!.totalPrepayments, baseCurrency)}</p>
            </div>
          </div>
        </div>
      ` : interestSavings > 0 && currentInput?.extraPayment ? `
        <!-- Savings Tip -->
        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p class="text-sm font-medium text-green-800">Great choice on extra payments!</p>
              <p class="text-sm text-green-700">You'll save ${currencyService.formatCurrency(interestSavings, baseCurrency)} in interest and pay off your loan ${getTimeSaved(results)} early.</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;
  
  // Add toggle handler for cost summary
  const toggleCostSummary = document.getElementById('toggle-cost-summary');
  const costSummaryContent = document.getElementById('cost-summary-content');
  const costSummaryChevron = document.getElementById('cost-summary-chevron');
  
  toggleCostSummary?.addEventListener('click', () => {
    costSummaryContent?.classList.toggle('hidden');
    costSummaryChevron?.classList.toggle('rotate-180');
  });
}

function getTimeSaved(results: MortgageResults): string {
  if (!currentInput) return '';
  
  // Calculate time saved with extra payments
  const regularMonths = currentInput.loanTermYears * 12;
  const actualMonths = results.totalPayments;
  const monthsSaved = regularMonths - actualMonths;
  
  if (monthsSaved >= 12) {
    const years = Math.floor(monthsSaved / 12);
    const months = monthsSaved % 12;
    return months > 0 ? `${years} years, ${months} months` : `${years} years`;
  } else {
    return `${monthsSaved} months`;
  }
}

function calculateInterestSavings(results: MortgageResults): number {
  // This is a simplified calculation - in reality, you'd compare with a no-extra-payment scenario
  const totalExtra = results.amortizationSchedule.reduce((sum, payment) => sum + payment.extraPayment, 0);
  return totalExtra * 0.8; // Rough estimate
}

function createCharts(results: MortgageResults) {
  // Destroy existing charts if they exist
  if (paymentChart) {
    paymentChart.destroy();
  }
  if (balanceChart) {
    balanceChart.destroy();
  }
  
  // Payment Breakdown Chart
  const paymentCtx = document.getElementById('payment-chart') as HTMLCanvasElement;
  const totalPrincipal = results.totalAmount - results.totalInterest;
  
  paymentChart = new Chart(paymentCtx, {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Interest'],
      datasets: [{
        data: [totalPrincipal, results.totalInterest],
        backgroundColor: ['#3B82F6', '#EF4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: $${value.toLocaleString()} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
  
  // Balance Over Time Chart
  const balanceCtx = document.getElementById('balance-chart') as HTMLCanvasElement;
  
  // Sample data points (every 12 months for monthly payments, adjust for other frequencies)
  const sampleInterval = currentInput?.paymentFrequency === 'monthly' ? 12 : 
                        currentInput?.paymentFrequency === 'biweekly' ? 26 : 52;
  
  const balanceData = results.amortizationSchedule
    .filter((_, index) => index % sampleInterval === 0 || index === results.amortizationSchedule.length - 1)
    .map(payment => ({
      x: payment.paymentDate.toLocaleDateString(),
      y: payment.remainingBalance
    }));
  
  balanceChart = new Chart(balanceCtx, {
    type: 'line',
    data: {
      datasets: [{
        label: 'Remaining Balance',
        data: balanceData,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Balance: $${context.parsed.y.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            }
          }
        }
      }
    }
  });
}

function displayAmortizationSchedule(schedule: PaymentDetails[]) {
  const tbody = document.getElementById('amortization-tbody');
  if (!tbody) return;
  
  const baseCurrency = currentResults?.currency || 'USD';
  
  // Display first 12 and last 3 payments for better performance
  const displaySchedule = [
    ...schedule.slice(0, 12),
    ...(schedule.length > 15 ? schedule.slice(-3) : [])
  ];
  
  tbody.innerHTML = displaySchedule.map((payment, index) => {
    const isGap = index === 12 && schedule.length > 15;
    
    if (isGap) {
      return `
        <tr class="bg-gray-50">
          <td colspan="7" class="px-4 py-2 text-center text-gray-500 italic">
            ... ${schedule.length - 15} payments hidden ...
          </td>
        </tr>
      `;
    }
    
    const hasPrepayment = payment.extraPayment > 0;
    const rowClass = hasPrepayment ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50';
    
    return `
      <tr class="${rowClass}">
        <td class="px-4 py-2 text-sm text-gray-900">${payment.paymentNumber}</td>
        <td class="px-4 py-2 text-sm text-gray-900">${payment.paymentDate.toLocaleDateString()}</td>
        <td class="px-4 py-2 text-sm text-gray-900">${currencyService.formatCurrency(payment.paymentAmount, baseCurrency)}</td>
        <td class="px-4 py-2 text-sm text-gray-900">${currencyService.formatCurrency(payment.principalPayment, baseCurrency)}</td>
        <td class="px-4 py-2 text-sm text-gray-900">${currencyService.formatCurrency(payment.interestPayment, baseCurrency)}</td>
        <td class="px-4 py-2 text-sm ${hasPrepayment ? 'font-semibold text-green-700' : 'text-gray-900'}">${currencyService.formatCurrency(payment.extraPayment, baseCurrency)}</td>
        <td class="px-4 py-2 text-sm text-gray-900">${currencyService.formatCurrency(payment.remainingBalance, baseCurrency)}</td>
      </tr>
    `;
  }).join('');
  
  // Add note about full schedule in CSV
  if (schedule.length > 15) {
    tbody.innerHTML += `
      <tr class="bg-blue-50">
        <td colspan="7" class="px-4 py-3 text-center text-blue-800 text-sm">
          Export to CSV to see all ${schedule.length} payments
        </td>
      </tr>
    `;
  }
}

function exportToCSV() {
  if (!currentResults) return;
  
  const headers = [
    'Payment #',
    'Date',
    'Payment Amount',
    'Principal',
    'Interest',
    'Extra Payment',
    'Remaining Balance',
    'Total Principal Paid',
    'Total Interest Paid'
  ];
  
  const rows = currentResults.amortizationSchedule.map(payment => [
    payment.paymentNumber,
    payment.paymentDate.toLocaleDateString(),
    payment.paymentAmount.toFixed(2),
    payment.principalPayment.toFixed(2),
    payment.interestPayment.toFixed(2),
    payment.extraPayment.toFixed(2),
    payment.remainingBalance.toFixed(2),
    payment.totalPrincipalPaid.toFixed(2),
    payment.totalInterestPaid.toFixed(2)
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mortgage-amortization-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Calculate on load
updateCurrencySymbols();
calculateLoanAmount();
calculateMortgage();

// Comparison functions
function addToComparison() {
  if (!currentInput || !currentResults) {
    alert('Please calculate a mortgage first');
    return;
  }
  
  const scenarioName = prompt('Enter a name for this scenario:') || `Scenario ${comparisonManager.getScenarios().length + 1}`;
  
  const scenario: ComparisonScenario = {
    id: Date.now().toString(),
    name: scenarioName,
    input: { ...currentInput }
  };
  
  comparisonManager.addScenario(scenario);
  updateComparisonDisplay();
  
  // Show comparison section
  document.getElementById('comparison-wrapper')?.classList.remove('hidden');
}

function clearComparisons() {
  comparisonManager.clearScenarios();
  updateComparisonDisplay();
  document.getElementById('comparison-wrapper')?.classList.add('hidden');
}

function updateComparisonDisplay() {
  const scenarios = comparisonManager.getScenarios();
  const comparisonTable = document.getElementById('comparison-table');
  const comparisonChartCanvas = document.getElementById('comparison-chart');
  
  if (!comparisonTable) return;
  
  if (scenarios.length === 0) {
    comparisonTable.innerHTML = '<p class="text-gray-500 text-center py-4">Add scenarios to compare</p>';
    comparisonChartCanvas?.classList.add('hidden');
    return;
  }
  
  const baseCurrency = scenarios[0]?.results?.currency || 'USD';
  
  // Build comparison table
  comparisonTable.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Home Price</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Down Payment</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Amount</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Payment</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Interest</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${scenarios.map(scenario => `
          <tr>
            <td class="px-4 py-3 text-sm font-medium text-gray-900">${scenario.name}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${currencyService.formatCurrency(scenario.results!.homePrice, baseCurrency)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${currencyService.formatCurrency(scenario.results!.downPaymentAmount, baseCurrency)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${currencyService.formatCurrency(scenario.results!.loanAmount, baseCurrency)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${currencyService.formatCurrency(scenario.results!.regularPaymentAmount, baseCurrency)}</td>
            <td class="px-4 py-3 text-sm text-gray-900">${currencyService.formatCurrency(scenario.results!.totalInterest, baseCurrency)}</td>
            <td class="px-4 py-3 text-sm">
              <button
                onclick="removeComparison('${scenario.id}')"
                class="text-red-600 hover:text-red-900"
              >
                Remove
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Update comparison chart
  comparisonChartCanvas?.classList.remove('hidden');
  createComparisonChart(scenarios);
}

function removeComparison(id: string) {
  comparisonManager.removeScenario(id);
  updateComparisonDisplay();
  
  if (comparisonManager.getScenarios().length === 0) {
    document.getElementById('comparison-wrapper')?.classList.add('hidden');
  }
}

function createComparisonChart(scenarios: ComparisonScenario[]) {
  if (comparisonChart) {
    comparisonChart.destroy();
  }
  
  const ctx = document.getElementById('comparison-chart') as HTMLCanvasElement;
  if (!ctx) return;
  
  const labels = scenarios.map(s => s.name);
  const monthlyPayments = scenarios.map(s => s.results!.regularPaymentAmount);
  const totalInterest = scenarios.map(s => s.results!.totalInterest);
  
  comparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Monthly Payment',
          data: monthlyPayments,
          backgroundColor: '#3B82F6',
          yAxisID: 'y'
        },
        {
          label: 'Total Interest',
          data: totalInterest,
          backgroundColor: '#EF4444',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Monthly Payment ($)'
          },
          ticks: {
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Total Interest ($)'
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            callback: function(value) {
              return '$' + (value as number).toLocaleString();
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += '$' + context.parsed.y.toLocaleString();
              return label;
            }
          }
        }
      }
    }
  });
}

// Reverse calculator function
function calculateReverse() {
  const formData = new FormData(reverseForm);
  
  const input: ReverseCalculatorInput = {
    targetPayment: Number(formData.get('targetPayment')),
    interestRate: Number(formData.get('reverseInterestRate')),
    loanTermYears: Number(formData.get('reverseLoanTermYears')),
    paymentFrequency: 'monthly',
    downPaymentType: 'percentage',
    downPaymentValue: Number(formData.get('reverseDownPayment'))
  };
  
  const result = reverseCalculator.calculateMaxAffordability(input);
  displayReverseResults(result, input);
}

function displayReverseResults(result: any, input: ReverseCalculatorInput) {
  const resultsDiv = document.getElementById('reverse-results');
  const contentDiv = document.getElementById('reverse-results-content');
  
  if (!resultsDiv || !contentDiv) return;
  
  const currency = currencySelect?.value || 'USD';
  
  contentDiv.innerHTML = `
    <div class="text-sm text-purple-800">
      <p>With a monthly payment of <span class="font-bold">${currencyService.formatCurrency(input.targetPayment, currency)}</span>:</p>
      <ul class="mt-2 space-y-1">
        <li>• Maximum loan amount: <span class="font-bold">${currencyService.formatCurrency(result.maxLoanAmount, currency)}</span></li>
        ${result.maxHomePrice ? `
          <li>• Maximum home price: <span class="font-bold">${currencyService.formatCurrency(result.maxHomePrice, currency)}</span></li>
          <li>• Required down payment: <span class="font-bold">${currencyService.formatCurrency(result.requiredDownPayment || 0, currency)}</span></li>
        ` : ''}
      </ul>
    </div>
  `;
  
  resultsDiv.classList.remove('hidden');
}

// Make removeComparison available globally
(window as any).removeComparison = removeComparison;

// Prepayment helper functions
function updateRecurringPrepayment() {
  const amount = parseFloat(recurringAmountInput?.value || '0');
  const frequency = recurringFrequencySelect?.value as 'monthly' | 'quarterly' | 'annually';
  const startDate = recurringStartDateInput?.valueAsDate;
  const endDate = recurringEndDateInput?.valueAsDate || undefined;
  
  if (amount > 0 && startDate) {
    currentPrepaymentStrategy.recurringPayments = [{
      amount,
      frequency,
      startDate,
      endDate
    }];
  } else {
    currentPrepaymentStrategy.recurringPayments = [];
  }
  
  updatePrepaymentImpact();
}

function addOneTimePayment() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1); // Default to next month
  
  const payment: OneTimePrepayment = {
    id: Date.now().toString(),
    date,
    amount: 1000,
    description: 'Extra Payment'
  };
  
  currentPrepaymentStrategy.oneTimePayments.push(payment);
  renderOneTimePayments();
  updatePrepaymentImpact();
}

function addOneTimePaymentFromTemplate(template: any) {
  const date = new Date();
  
  // Set date based on template timing
  if (template.timing) {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const targetMonth = monthNames.indexOf(template.timing);
    if (targetMonth !== -1) {
      date.setMonth(targetMonth);
      if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }
    }
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  
  const payment: OneTimePrepayment = {
    id: Date.now().toString(),
    date,
    amount: template.defaultAmount || 1000,
    description: template.name
  };
  
  currentPrepaymentStrategy.oneTimePayments.push(payment);
  renderOneTimePayments();
  updatePrepaymentImpact();
}

function renderOneTimePayments() {
  const container = document.getElementById('onetime-payments-list');
  if (!container) return;
  
  const currency = currencySelect?.value || 'USD';
  
  if (currentPrepaymentStrategy.oneTimePayments.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No one-time payments added yet</p>';
    return;
  }
  
  container.innerHTML = currentPrepaymentStrategy.oneTimePayments
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(payment => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <input
              type="date"
              value="${new Date(payment.date).toISOString().split('T')[0]}"
              onchange="updateOneTimePaymentDate('${payment.id}', this.value)"
              class="text-sm px-2 py-1 border border-gray-300 rounded"
            />
            <input
              type="text"
              value="${payment.description}"
              onchange="updateOneTimePaymentDescription('${payment.id}', this.value)"
              class="text-sm px-2 py-1 border border-gray-300 rounded flex-1"
              placeholder="Description"
            />
          </div>
        </div>
        <div class="flex items-center gap-2 ml-4">
          <div class="relative">
            <span class="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">${CURRENCIES[currency]?.symbol || '$'}</span>
            <input
              type="number"
              value="${payment.amount}"
              onchange="updateOneTimePaymentAmount('${payment.id}', this.value)"
              class="text-sm pl-6 pr-2 py-1 border border-gray-300 rounded w-24"
              min="0"
              step="100"
            />
          </div>
          <button
            onclick="removeOneTimePayment('${payment.id}')"
            class="text-red-600 hover:text-red-700"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
}

function updateOneTimePaymentDate(id: string, dateStr: string) {
  const payment = currentPrepaymentStrategy.oneTimePayments.find(p => p.id === id);
  if (payment) {
    payment.date = new Date(dateStr);
    updatePrepaymentImpact();
  }
}

function updateOneTimePaymentAmount(id: string, amount: string) {
  const payment = currentPrepaymentStrategy.oneTimePayments.find(p => p.id === id);
  if (payment) {
    payment.amount = parseFloat(amount) || 0;
    updatePrepaymentImpact();
  }
}

function updateOneTimePaymentDescription(id: string, description: string) {
  const payment = currentPrepaymentStrategy.oneTimePayments.find(p => p.id === id);
  if (payment) {
    payment.description = description;
  }
}

function removeOneTimePayment(id: string) {
  currentPrepaymentStrategy.oneTimePayments = currentPrepaymentStrategy.oneTimePayments.filter(p => p.id !== id);
  renderOneTimePayments();
  updatePrepaymentImpact();
}

function loadSmartPlans() {
  if (!currentResults) return;
  
  const container = document.getElementById('smart-plans-container');
  if (!container) return;
  
  const currency = currencySelect?.value || 'USD';
  const monthlyBudget = currentResults.regularPaymentAmount * 0.2; // Assume 20% extra budget
  
  const prepaymentCalculator = new PrepaymentCalculator(
    currentResults.regularPaymentAmount,
    currentInput!.interestRate,
    currentResults.amortizationSchedule
  );
  
  const plans = prepaymentCalculator.generateSmartPlans(monthlyBudget, 'aggressive');
  
  container.innerHTML = plans.map(plan => `
    <div class="p-4 border border-gray-200 rounded-lg hover:border-green-500 transition-colors cursor-pointer" onclick="selectSmartPlan('${plan.id}')">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h4 class="font-semibold text-gray-800">${plan.name} Plan</h4>
          <p class="text-sm text-gray-600">${plan.description}</p>
        </div>
        <div class="text-right">
          <div class="flex items-center gap-1">
            ${Array.from({length: 5}, (_, i) => `
              <svg class="w-4 h-4 ${i < plan.affordabilityScore / 2 ? 'text-yellow-400' : 'text-gray-300'}" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            `).join('')}
          </div>
          <p class="text-xs text-gray-500 mt-1">Affordability</p>
        </div>
      </div>
      
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-600">Monthly Extra:</span>
          <span class="font-medium">${currencyService.formatCurrency(plan.monthlyExtra, currency)}</span>
        </div>
        ${plan.oneTimePayments.length > 0 ? `
          <div class="flex justify-between">
            <span class="text-gray-600">One-Time Payments:</span>
            <span class="font-medium">${plan.oneTimePayments.length}</span>
          </div>
        ` : ''}
        <div class="pt-2 border-t">
          <div class="flex justify-between text-green-700">
            <span>Interest Saved:</span>
            <span class="font-semibold">${currencyService.formatCurrency(plan.totalInterestSaved, currency)}</span>
          </div>
          <div class="flex justify-between text-green-700">
            <span>Time Saved:</span>
            <span class="font-semibold">${plan.timeSaved.years}y ${plan.timeSaved.months}m</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function selectSmartPlan(planId: string) {
  if (!currentResults) return;
  
  const monthlyBudget = currentResults.regularPaymentAmount * 0.2;
  const prepaymentCalculator = new PrepaymentCalculator(
    currentResults.regularPaymentAmount,
    currentInput!.interestRate,
    currentResults.amortizationSchedule
  );
  
  const plans = prepaymentCalculator.generateSmartPlans(monthlyBudget, 'aggressive');
  const selectedPlan = plans.find(p => p.id === planId);
  
  if (!selectedPlan) return;
  
  // Clear existing prepayments
  currentPrepaymentStrategy.recurringPayments = [];
  currentPrepaymentStrategy.oneTimePayments = [];
  
  // Apply smart plan
  if (selectedPlan.monthlyExtra > 0) {
    currentPrepaymentStrategy.recurringPayments = [{
      amount: selectedPlan.monthlyExtra,
      frequency: 'monthly',
      startDate: new Date()
    }];
  }
  
  selectedPlan.oneTimePayments.forEach((payment, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() + payment.month);
    
    currentPrepaymentStrategy.oneTimePayments.push({
      id: `smart-${index}`,
      date,
      amount: payment.amount,
      description: payment.description
    });
  });
  
  // Switch to appropriate tab
  if (currentPrepaymentStrategy.recurringPayments.length > 0) {
    (document.querySelector('[data-tab="recurring"]') as HTMLButtonElement)?.click();
    recurringAmountInput.value = selectedPlan.monthlyExtra.toString();
  } else if (currentPrepaymentStrategy.oneTimePayments.length > 0) {
    (document.querySelector('[data-tab="onetime"]') as HTMLButtonElement)?.click();
    renderOneTimePayments();
  }
  
  updatePrepaymentImpact();
}

function updatePrepaymentImpact() {
  const impactDiv = document.getElementById('prepayment-impact');
  const impactInterestSaved = document.getElementById('impact-interest-saved');
  const impactTimeSaved = document.getElementById('impact-time-saved');
  
  if (!currentResults || !currentPrepaymentStrategy.enabled) {
    impactDiv?.classList.add('hidden');
    return;
  }
  
  const hasPayments = currentPrepaymentStrategy.recurringPayments.length > 0 || 
                     currentPrepaymentStrategy.oneTimePayments.length > 0;
  
  if (!hasPayments) {
    impactDiv?.classList.add('hidden');
    return;
  }
  
  // Show impact summary immediately with estimated values
  if (currentPrepaymentResults && impactDiv) {
    impactDiv.classList.remove('hidden');
    
    const currency = currentResults.currency || 'USD';
    
    if (impactInterestSaved) {
      impactInterestSaved.textContent = currencyService.formatCurrency(currentPrepaymentResults.interestSaved, currency);
    }
    
    if (impactTimeSaved) {
      const { years, months } = currentPrepaymentResults.timeSaved;
      impactTimeSaved.textContent = years > 0 ? `${years} years, ${months} months` : `${months} months`;
    }
  } else {
    // Recalculate mortgage with prepayments
    calculateMortgage();
  }
}

function createPrepaymentTimeline(results: PrepaymentResults) {
  const canvas = document.getElementById('prepayment-timeline-chart') as HTMLCanvasElement;
  if (!canvas || !results.prepaymentEvents.length) return;
  
  // Destroy existing chart
  if (prepaymentTimelineChart) {
    prepaymentTimelineChart.destroy();
  }
  
  const currency = currentResults?.currency || 'USD';
  
  // Group prepayments by month
  const monthlyPrepayments = new Map<string, number>();
  results.prepaymentEvents.forEach(event => {
    const monthKey = `${event.date.getFullYear()}-${event.date.getMonth() + 1}`;
    monthlyPrepayments.set(monthKey, (monthlyPrepayments.get(monthKey) || 0) + event.amount);
  });
  
  // Create chart data
  const labels: string[] = [];
  const data: number[] = [];
  
  monthlyPrepayments.forEach((amount, monthKey) => {
    const [year, month] = monthKey.split('-');
    labels.push(`${month}/${year}`);
    data.push(amount);
  });
  
  prepaymentTimelineChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.slice(0, 24), // Show first 2 years
      datasets: [{
        label: 'Prepayment Amount',
        data: data.slice(0, 24),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Prepayment: ${currencyService.formatCurrency(context.parsed.y, currency)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return currencyService.formatCurrency(value as number, currency);
            }
          }
        }
      }
    }
  });
  
  // Display prepayment events list
  const eventsList = document.getElementById('prepayment-events-list');
  if (eventsList) {
    eventsList.innerHTML = results.prepaymentEvents.slice(0, 10).map(event => `
      <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
        <div>
          <span class="font-medium">${event.date.toLocaleDateString()}</span>
          <span class="text-gray-600 ml-2">${event.description}</span>
        </div>
        <div class="text-right">
          <div class="font-semibold text-green-700">${currencyService.formatCurrency(event.amount, currency)}</div>
          <div class="text-xs text-gray-500">Saves ${currencyService.formatCurrency(event.interestSaved, currency)}</div>
        </div>
      </div>
    `).join('');
    
    if (results.prepaymentEvents.length > 10) {
      eventsList.innerHTML += `
        <p class="text-center text-sm text-gray-500 mt-2">
          And ${results.prepaymentEvents.length - 10} more prepayments...
        </p>
      `;
    }
  }
}

// Make functions available globally
(window as any).updateOneTimePaymentDate = updateOneTimePaymentDate;
(window as any).updateOneTimePaymentAmount = updateOneTimePaymentAmount;
(window as any).updateOneTimePaymentDescription = updateOneTimePaymentDescription;
(window as any).removeOneTimePayment = removeOneTimePayment;
(window as any).selectSmartPlan = selectSmartPlan;