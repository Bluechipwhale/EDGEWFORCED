// ==============================================================================
// EDGEWFORCE - INTEGRATION & WORKFLOW AUTOMATED TESTS
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { authService } from '../services/authService.js';
import { salesService } from '../services/salesService.js';
import { fieldService } from '../services/fieldService.js';
import { employeeService } from '../services/employeeService.js';
import { hrService } from '../services/hrService.js';

test('EdgeWForce Core Workflow Tests', async (t) => {
  // Reset store to clean state
  await resetTestData();

  // Setup test fixtures for isolated workflow testing
  await db.insert('customers', {
    id: 1,
    company_id: 1,
    code: 'CUST-1001',
    name: 'Mega Plaza Supermarket',
    customer_type: 'Retail',
    tier: 'Tier 1',
    address: '14B Idowu Martins St, Victoria Island, Lagos',
    latitude: 6.4281,
    longitude: 3.4219,
    geofence_radius: 150,
    credit_limit: 800000,
    balance: 150000,
    status: 'active'
  });

  await db.insert('products', {
    id: 1,
    company_id: 1,
    sku: 'SKU-1001',
    name: 'Golden Penny Pure Vegetable Oil (1L x 12)',
    category: 'Cooking Essentials',
    price: 48500,
    cost_price: 42000,
    stock_quantity: 100,
    unit: 'carton',
    status: 'active'
  });

  await db.insert('products', {
    id: 2,
    company_id: 1,
    sku: 'SKU-1003',
    name: 'Dangote Granulated Sugar 50kg Sack',
    category: 'Commodities',
    price: 88000,
    cost_price: 79000,
    stock_quantity: 50,
    unit: 'bag',
    status: 'active'
  });

  await db.insert('stores', {
    id: 1,
    company_id: 1,
    code: 'STR-101',
    name: 'Mega Plaza Supermarket',
    latitude: 6.4281,
    longitude: 3.4219,
    geofence_radius: 150,
    status: 'active'
  });

  await db.insert('leave_balances', {
    id: 1,
    employee_id: 1,
    year: 2026,
    annual: 18,
    sick: 12,
    casual: 5
  });

  await db.insert('work_locations', {
    id: 1,
    company_id: 1,
    name: 'Mega Plaza Victoria Island',
    code: 'LOC-VI-01',
    location_type: 'Store',
    latitude: 6.4281,
    longitude: 3.4219,
    radius_meters: 150,
    geofence_radius_meters: 150,
    address: '14B Idowu Martins St, Victoria Island, Lagos',
    status: 'active', is_active: true
  });

  await db.insert('employee_location_assignments', {
    id: 1,
    company_id: 1,
    employee_id: 2,
    location_id: 1,
    assignment_type: 'primary',
    is_primary: true,
    is_active: true
  });

  await t.test('1. Authentication: Login with seed accounts and verify JWT token', async () => {
    // Sales Agent login
    const salesLogin = await authService.login('sales@edgewforce.com', 'ChangeMe123!');
    assert.ok(salesLogin.token);
    assert.equal(salesLogin.user.email, 'sales@edgewforce.com');
    assert.equal(salesLogin.user.role_code, 'SALES_AGENT');

    // Field Agent login
    const fieldLogin = await authService.login('field@edgewforce.com', 'ChangeMe123!');
    assert.ok(fieldLogin.token);
    assert.equal(fieldLogin.user.role_code, 'FIELD_AGENT');

    // Corporate Staff login
    const staffLogin = await authService.login('staff@edgewforce.com', 'ChangeMe123!');
    assert.ok(staffLogin.token);
    assert.ok(['STAFF_MEMBER', 'EMPLOYEE'].includes(staffLogin.user.role_code));

    // Invalid password must fail
    await assert.rejects(async () => {
      await authService.login('sales@edgewforce.com', 'WrongPassword!');
    }, /Invalid/i);
  });

  await t.test('2. Commercial Sales: Stock check, order creation and inventory deduction', async () => {
    const products = await salesService.getProducts();
    const product1 = products.find(p => p.sku === 'SKU-1001');
    const initialStock = product1.stock_quantity;

    const order = await salesService.createOrder({
      customer_id: 1,
      items: [{ product_id: product1.id, quantity: 5 }],
      discount: 0,
      payment_method: 'Bank Transfer'
    }, 1);

    assert.ok(order.order_number.startsWith('ORD-'));
    assert.equal(order.items[0].quantity, 5);

    // Verify stock deducted
    const updatedProducts = await salesService.getProducts();
    const updatedProduct1 = updatedProducts.find(p => p.sku === 'SKU-1001');
    assert.equal(updatedProduct1.stock_quantity, initialStock - 5);
  });

  await t.test('3. Commercial Sales: Credit limit check rejects over-limit orders', async () => {
    const products = await salesService.getProducts();
    const expensiveProduct = products.find(p => p.sku === 'SKU-1003') || products[0]; // Sugar ₦88,000

    // Attempt credit order that exceeds limit (e.g. 20 bags = ₦1,760,000 > credit limit)
    await assert.rejects(async () => {
      await salesService.createOrder({
        customer_id: 1,
        items: [{ product_id: expensiveProduct.id, quantity: 20 }],
        discount: 0,
        payment_method: 'Credit'
      }, 1);
    }, /Credit limit exceeded/);
  });

  await t.test('4. Collections: Debt recovery ledger deducts merchant balance', async () => {
    const customers = await salesService.getCustomers();
    const customer = customers.find(c => c.id === 1);
    const initialBalance = Number(customer.balance);

    const payment = await salesService.recordPayment({
      customer_id: 1,
      amount: 50000,
      payment_method: 'Bank Transfer',
      reference_number: 'TEST-REF-001'
    }, 1);

    assert.equal(payment.amount, 50000);
    assert.equal(payment.new_balance, Math.max(0, initialBalance - 50000));
  });

  await t.test('5. Field Operations: Shift start & GPS toggle', async () => {
    const shift = await fieldService.toggleShift(2, 6.4281, 3.4219, 'Android Chrome', null, '2026-08-21T07:30:00Z');
    assert.ok(shift.clock_in || shift.clock_in_time || shift.morning_clock_in);
    assert.ok(['present', 'late'].includes(shift.status.toLowerCase()));
  });

  await t.test('6. Field Operations: 150m Geofence rejection when agent is distant', async () => {
    // Schedule a test visit
    const visit = await db.insert('visits', {
      company_id: 1,
      customer_id: 1,
      store_id: 1,
      agent_id: 2,
      planned_date: new Date().toISOString().slice(0, 10),
      planned_time: new Date().toISOString(),
      visit_purpose: 'Test Geofence Audit',
      status: 'PLANNED'
    });

    // Attempt check-in with far coordinates (e.g. lat offset ~1km)
    await assert.rejects(async () => {
      await fieldService.checkInVisit(visit.id, 2, 6.6000, 3.3500);
    }, /Move within \d+m/i);
  });



  await t.test('7. Employee: Leave request and balance deduction on HR approval', async () => {
    const request = await employeeService.applyLeave(1, {
      leave_type: 'Annual',
      start_date: '2026-09-07', // Monday
      end_date: '2026-09-11',   // Friday -> 5 working days
      reason: 'Vacation'
    });

    assert.equal(request.days, 5);
    assert.equal(request.status, 'pending');

    // HR approves
    const approved = await hrService.approveLeave(request.id, { id: 6, email: 'hr@edgewforce.com' });
    assert.equal(approved.status, 'approved');

    // Verify balance reduced
    const balance = await employeeService.getLeaveBalances(1);
    assert.equal(balance.annual, 13); // 18 - 5 = 13
  });

  await t.test('8. HR: Hierarchy enforcement rejects upward task assignment', async () => {
    // Operations staff (Level 8) attempting to assign task to CEO (Level 1)
    const staffUser = { id: 8, role_code: 'EMPLOYEE', rank: { code: 'STAFF', level: 8 } };

    await assert.rejects(async () => {
      await hrService.assignTask({
        title: 'Unauthorized Task',
        assigned_to: 2, // CEO employee ID
        priority: 'Normal'
      }, staffUser);
    }, /Organizational hierarchy violation/);
  });
});
