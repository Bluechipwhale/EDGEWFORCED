// ==============================================================================
// EDGEWFORCE - BUSINESS CALCULATIONS UTILITY
// Nigerian Commercial, Tax, Commission, and Payroll Calculations
// ==============================================================================

export const VAT_RATE = 0.075; // Nigerian 7.5% VAT
export const COMMISSION_RATE = 0.05; // 5% Closed Sales Commission
export const PENSION_RATE = 0.08; // 8% Employee Pension Contribution

/**
 * Formats time in Africa/Lagos timezone (e.g. "08:30 AM")
 */
export function formatTime(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);
}


/**
 * Calculates POS order figures including Subtotal, Discount, 7.5% VAT, and Total.
 * @param {Array<{ quantity: number, unit_price: number }>} items
 * @param {number} discount
 * @returns {{ subtotal: number, discountAmount: number, taxableSubtotal: number, vatAmount: number, totalAmount: number }}
 */
export function calculateOrderTotals(items = [], discount = 0) {
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price || 0);
    return sum + (qty * price);
  }, 0);

  const discountAmount = Math.max(0, Math.min(Number(discount || 0), subtotal));
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const vatAmount = Math.round(taxableSubtotal * VAT_RATE * 100) / 100;
  const totalAmount = Math.round((taxableSubtotal + vatAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxableSubtotal: Math.round(taxableSubtotal * 100) / 100,
    vatAmount,
    totalAmount
  };
}

/**
 * Calculates sales commission from closed/confirmed sales.
 * Formula: Commission = Closed Sales * 5%
 * @param {number} closedSalesTotal
 * @param {number} monthlyTarget
 * @returns {{ monthlyTarget: number, actualSales: number, remainingTarget: number, achievementPercentage: number, commission: number }}
 */
export function calculateCommission(closedSalesTotal = 0, monthlyTarget = 10000000) {
  const actualSales = Math.max(0, Number(closedSalesTotal || 0));
  const target = Math.max(1, Number(monthlyTarget || 10000000));
  const remainingTarget = Math.max(0, target - actualSales);
  const achievementPercentage = Math.round(((actualSales / target) * 100) * 10) / 10;
  const commission = Math.round(actualSales * COMMISSION_RATE * 100) / 100;

  return {
    monthlyTarget: target,
    actualSales,
    remainingTarget,
    achievementPercentage,
    commission
  };
}

/**
 * Calculates Nigerian PAYE progressive tax estimate for a monthly gross salary.
 * Standard PITA progressive tax rates:
 * First ₦300k @ 7%, Next ₦300k @ 11%, Next ₦500k @ 15%, Next ₦500k @ 19%, Next ₦1.6M @ 21%, Over ₦3.2M @ 24%
 * Consolidated Relief Allowance (CRA): Higher of ₦200k/yr or 1% Gross + 20% Gross.
 * @param {number} grossMonthly
 * @returns {number} Monthly PAYE Tax in Naira
 */
export function calculateMonthlyPAYETax(grossMonthly = 0) {
  const annualGross = Number(grossMonthly || 0) * 12;
  if (annualGross <= 360000) return 0; // Minimum wage exemption

  // CRA Calculation
  const craFixed = Math.max(200000, annualGross * 0.01);
  const craVariable = annualGross * 0.20;
  const cra = craFixed + craVariable;

  // Pension deduction (8% of qualifying allowances)
  const annualPension = annualGross * 0.08;
  const taxableIncome = Math.max(0, annualGross - cra - annualPension);

  let tax = 0;
  let remaining = taxableIncome;

  const brackets = [
    { limit: 300000, rate: 0.07 },
    { limit: 300000, rate: 0.11 },
    { limit: 500000, rate: 0.15 },
    { limit: 500000, rate: 0.19 },
    { limit: 1600000, rate: 0.21 },
    { limit: Infinity, rate: 0.24 }
  ];

  for (const b of brackets) {
    if (remaining <= 0) break;
    const taxableInBracket = Math.min(remaining, b.limit);
    tax += taxableInBracket * b.rate;
    remaining -= taxableInBracket;
  }

  const monthlyTax = Math.round((tax / 12) * 100) / 100;
  return Math.max(0, monthlyTax);
}

/**
 * Computes complete employee monthly payslip breakdown.
 * @param {number} basic
 * @param {number} housing
 * @param {number} transport
 * @param {number} otherAllowance
 * @param {number} otherDeductions
 * @returns {{ basicSalary: number, housingAllowance: number, transportAllowance: number, otherAllowance: number, grossPay: number, taxPAYE: number, pension: number, otherDeductions: number, totalDeductions: number, netPay: number }}
 */
export function calculatePayslipBreakdown(basic = 350000, housing = 150000, transport = 75000, otherAllowance = 25000, otherDeductions = 0) {
  const basicSalary = Number(basic || 0);
  const housingAllowance = Number(housing || 0);
  const transportAllowance = Number(transport || 0);
  const otherAllow = Number(otherAllowance || 0);
  const otherDeduct = Number(otherDeductions || 0);

  const grossPay = basicSalary + housingAllowance + transportAllowance + otherAllow;
  const pensionQualifying = basicSalary + housingAllowance + transportAllowance;
  const pension = Math.round(pensionQualifying * PENSION_RATE * 100) / 100;
  const taxPAYE = calculateMonthlyPAYETax(grossPay);
  const totalDeductions = Math.round((pension + taxPAYE + otherDeduct) * 100) / 100;
  const netPay = Math.max(0, Math.round((grossPay - totalDeductions) * 100) / 100);

  return {
    basicSalary,
    housingAllowance,
    transportAllowance,
    otherAllowance: otherAllow,
    grossPay,
    taxPAYE,
    pension,
    otherDeductions: otherDeduct,
    totalDeductions,
    netPay
  };
}

/**
 * Calculates number of business working days between two dates (excluding Saturdays and Sundays).
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {number} Working days
 */
export function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let count = 0;
  const cur = new Date(start);

  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}
