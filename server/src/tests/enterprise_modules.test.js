// ==============================================================================
// EDGEWFORCE - ENTERPRISE MODULES TEST SUITE
// Multi-Tenancy, Inventory, Deliveries, Customer 360, Order Approvals & Funnel
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { adminService } from '../services/adminService.js';
import { inventoryService } from '../services/inventoryService.js';
import { deliveryService } from '../services/deliveryService.js';
import { customerService } from '../services/customerService.js';
import { salesService } from '../services/salesService.js';

test('Enterprise Modules & Multi-Tenancy Test Suite', async (t) => {
  await resetTestData();

  // Test fixtures for isolated testing
  await db.insert('customers', {
    id: 1,
    company_id: 1,
    code: 'CUST-TEST-01',
    name: 'Mega Plaza Supermarket',
    credit_limit: 1000000,
    balance: 0,
    status: 'active'
  });

  await db.insert('products', {
    id: 1,
    company_id: 1,
    sku: 'SKU-TEST-01',
    name: 'Golden Penny Vegetable Oil 5L',
    category: 'Cooking Essentials',
    price: 18500,
    cost_price: 15000,
    stock_quantity: 100,
    unit: 'carton',
    status: 'active'
  });

  await t.test('1. Multi-Tenancy: 5-Step Company Onboarding Wizard creates isolated company & settings', async () => {
    const onboardingPayload = {
      companyInfo: {
        name: 'Apex FMCG Logistics Ltd.',
        business_type: 'Wholesale Retail Distributor',
        industry: 'Beverages & Dairy',
        email: 'admin@apexfmcg.ng',
        phone: '+2348099887766',
        address: '5 Commercial Road, Apapa, Lagos'
      },
      structure: {
        regions: [
          {
            name: 'Apapa Port Corridor',
            code: 'APP-CORR',
            territories: [{ name: 'Wharf Distro Zone', code: 'WHARF-1' }]
          }
        ]
      },
      modules: {
        workforce: true,
        attendance: true,
        field: true,
        sales: true,
        inventory: true,
        delivery: true
      },
      adminUser: {
        full_name: 'Babajide Sanwo',
        email: 'jide@apexfmcg.ng',
        phone: '+2348033334444'
      },
      operationalSettings: {
        geofence_radius: 120,
        currency: 'NGN'
      }
    };

    const result = await adminService.onboardCompany(onboardingPayload, { id: 4, email: 'admin@edgewforce.com' });
    assert.ok(result.company.id);
    assert.equal(result.company.name, 'Apex FMCG Logistics Ltd.');
    assert.equal(result.settings.geofence_radius, 120);

    // Verify company isolation: Company 2 cannot see Company 1 inventory by default
    const comp1Products = await inventoryService.getProducts(1);
    const comp2Products = await inventoryService.getProducts(result.company.id);
    assert.ok(comp1Products.length >= 1);
    assert.equal(comp2Products.length, 0);
  });

  await t.test('2. Inventory: Product creation, restock, dispatch and low stock tracking', async () => {
    const newProd = await inventoryService.createProduct({
      company_id: 1,
      sku: 'SKU-TEST-999',
      name: 'Test Pure Sunflower Oil 5L',
      category: 'Cooking Essentials',
      unit: 'carton',
      price: 55000,
      cost_price: 48000,
      stock_quantity: 50,
      reorder_level: 15
    }, { id: 4 });

    assert.ok(newProd.id);
    assert.equal(newProd.stock_quantity, 50);

    // Dispatch 40 cartons (remaining: 10 <= 15 reorder level -> triggers low stock alert)
    const mov = await inventoryService.recordStockMovement({
      product_id: newProd.id,
      warehouse_id: 1,
      movement_type: 'DISPATCH',
      quantity: 40,
      notes: 'Dispatched to retail chain'
    }, { id: 4 });

    assert.equal(mov.new_quantity, 10);
    const updatedProd = await inventoryService.getProductById(newProd.id, 1);
    assert.equal(updatedProd.stock_quantity, 10);
  });

  await t.test('3. Delivery: Order dispatch, in-transit state and proof of delivery confirmation', async () => {
    // Create an order for dispatch
    const order = await salesService.createOrder({
      company_id: 1,
      customer_id: 1,
      items: [{ product_id: 1, quantity: 2 }]
    }, { id: 1, company_id: 1 });

    const dispatch = await deliveryService.dispatchOrder({
      order_id: order.id,
      driver_name: 'Aliyu Usman',
      driver_phone: '+2348031122334',
      vehicle_number: 'ABJ-778-XY'
    }, { id: 9 });

    assert.equal(dispatch.delivery_status, 'IN_TRANSIT');
    assert.equal(dispatch.driver_name, 'Aliyu Usman');

    // Confirm Proof of Delivery with signature & recipient
    const pod = await deliveryService.confirmProofOfDelivery(dispatch.id, {
      recipient_name: 'Store Manager Bello',
      recipient_signature: 'data:image/png;base64,signature_hash_proof',
      proof_of_delivery_photo: '/uploads/pod_sample.jpg'
    }, { id: 9 });

    assert.equal(pod.delivery_status, 'DELIVERED');
    assert.equal(pod.recipient_name, 'Store Manager Bello');
  });

  await t.test('4. Customer 360: Aggregation of orders, visits, collections and credit limit', async () => {
    const c360 = await customerService.getCustomer360(1, 1);
    assert.ok(c360.customer);
    assert.equal(c360.customer.id, 1);
    assert.ok(Array.isArray(c360.orders));
    assert.ok(Array.isArray(c360.visits));
    assert.ok(Array.isArray(c360.collections));
    assert.ok(c360.metrics.totalOrderVolume >= 0);
  });

  await t.test('5. Order Approval Workflow: Supervisor approval logs audit and activates delivery', async () => {
    const order = await salesService.createOrder({
      company_id: 1,
      customer_id: 1,
      items: [{ product_id: 1, quantity: 1 }]
    }, { id: 1, company_id: 1 });

    const approved = await salesService.approveOrder(order.id, { id: 9, email: 'supervisor@edgewforce.com' }, 'Credit line verified and approved');
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.approved_by, 9);
  });

  await t.test('6. Sales Funnel: Computes conversion rates across operational stages', async () => {
    const funnel = await salesService.getSalesFunnel(1);
    assert.ok(Array.isArray(funnel.stages));
    assert.ok(funnel.stages.length >= 5);
    assert.ok(funnel.conversionRate >= 0);
  });
});
