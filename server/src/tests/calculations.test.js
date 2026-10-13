// ==============================================================================
// EDGEWFORCE - BUSINESS CALCULATIONS AUTOMATED TESTS
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOrderTotals,
  calculateCommission,
  calculateMonthlyPAYETax,
  calculatePayslipBreakdown,
  calculateWorkingDays,
  VAT_RATE,
  COMMISSION_RATE
} from '../utils/calculations.js';

test('Business Calculations Test Suite', async (t) => {
  await t.test('POS Order Totals with 7.5% VAT and discount', () => {
    const items = [
      { quantity: 2, unit_price: 48500 }, // 97,000
      { quantity: 1, unit_price: 78000 }  // 78,000
    ]; // Subtotal = 175,000

    const discount = 5000;
    const totals = calculateOrderTotals(items, discount);

    assert.equal(totals.subtotal, 175000);
    assert.equal(totals.discountAmount, 5000);
    assert.equal(totals.taxableSubtotal, 170000);
    assert.equal(totals.vatAmount, 12750); // 170,000 * 0.075 = 12,750
    assert.equal(totals.totalAmount, 182750); // 170,000 + 12,750
  });

  await t.test('5% Sales Commission Calculation', () => {
    const monthlyTarget = 10000000;
    const actualSales = 7500000;

    const result = calculateCommission(actualSales, monthlyTarget);

    assert.equal(result.monthlyTarget, 10000000);
    assert.equal(result.actualSales, 7500000);
    assert.equal(result.remainingTarget, 2500000);
    assert.equal(result.achievementPercentage, 75.0);
    assert.equal(result.commission, 375000); // 7,500,000 * 5% = 375,000
  });

  await t.test('Working Days Calculation (Excludes Weekends)', () => {
    // 2026-08-24 (Monday) to 2026-08-28 (Friday) => 5 working days
    const daysWeek = calculateWorkingDays('2026-08-24', '2026-08-28');
    assert.equal(daysWeek, 5);

    // 2026-08-24 (Monday) to 2026-08-30 (Sunday) => Still 5 working days (Sat & Sun excluded)
    const daysWithWeekend = calculateWorkingDays('2026-08-24', '2026-08-30');
    assert.equal(daysWithWeekend, 5);

    // 2026-08-29 (Saturday) to 2026-08-30 (Sunday) => 0 working days
    const weekendOnly = calculateWorkingDays('2026-08-29', '2026-08-30');
    assert.equal(weekendOnly, 0);
  });

  await t.test('Payslip Gross, Pension (8%), PAYE Tax, and Net Pay', () => {
    const basic = 350000;
    const housing = 150000;
    const transport = 75000;
    const other = 25000;

    const slip = calculatePayslipBreakdown(basic, housing, transport, other);

    assert.equal(slip.grossPay, 600000);
    // Pension = (350000 + 150000 + 75000) * 0.08 = 575,000 * 0.08 = 46,000
    assert.equal(slip.pension, 46000);
    assert.ok(slip.taxPAYE > 0);
    assert.equal(slip.netPay, slip.grossPay - slip.totalDeductions);
  });
});
