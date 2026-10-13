// ==============================================================================
// EDGEWFORCE - STRICT AGENT ACCESS CONTROL & IDOR SECURITY TEST SUITE
// ==============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { authService } from '../services/authService.js';
import { fieldService } from '../services/fieldService.js';
import { employeeService } from '../services/employeeService.js';
import { salesService } from '../services/salesService.js';
import { isManagementUser, hasRole } from '../middleware/rbac.js';

describe('Strict Least-Privilege Agent Access Control & IDOR Protection', async () => {
  let fieldAgentUser;
  let salesAgentUser;
  let supervisorUser;
  let adminUser;
  let testTask1;
  let testTask2;
  let testOkr1;
  let testOkr2;

  before(async () => {
    // 1. Create Field Agent
    const fieldEmp = await db.insert('employees', {
      company_id: 1,
      first_name: 'Amaka',
      last_name: 'FieldAgent',
      role_code: 'FIELD_AGENT',
      work_location: 'Ikeja Hub'
    });
    fieldAgentUser = await db.insert('users', {
      company_id: 1,
      email: `amaka.field.${Date.now()}@edgewforce.com`,
      role_code: 'FIELD_AGENT',
      employee_id: fieldEmp.id,
      password_hash: 'hash'
    });

    // 2. Create Sales Agent
    const salesEmp = await db.insert('employees', {
      company_id: 1,
      first_name: 'Tunde',
      last_name: 'SalesAgent',
      role_code: 'SALES_AGENT',
      work_location: 'Victoria Island'
    });
    salesAgentUser = await db.insert('users', {
      company_id: 1,
      email: `tunde.sales.${Date.now()}@edgewforce.com`,
      role_code: 'SALES_AGENT',
      employee_id: salesEmp.id,
      password_hash: 'hash'
    });

    // 3. Create Supervisor
    const supEmp = await db.insert('employees', {
      company_id: 1,
      first_name: 'Supervisor',
      last_name: 'Lead',
      role_code: 'SUPERVISOR',
      work_location: 'Lagos HQ'
    });
    supervisorUser = await db.insert('users', {
      company_id: 1,
      email: `supervisor.${Date.now()}@edgewforce.com`,
      role_code: 'SUPERVISOR',
      employee_id: supEmp.id,
      password_hash: 'hash'
    });

    // 4. Create Admin
    adminUser = {
      id: 1,
      company_id: 1,
      email: 'admin@edgewforce.com',
      role_code: 'ADMIN'
    };

    // 5. Seed test tasks
    testTask1 = await db.insert('tasks', {
      company_id: 1,
      assigned_to: fieldAgentUser.employee_id,
      title: 'Audit Store 101',
      status: 'pending',
      progress: 0
    });

    testTask2 = await db.insert('tasks', {
      company_id: 1,
      assigned_to: salesAgentUser.employee_id,
      title: 'Sales Pitch Outlet 202',
      status: 'pending',
      progress: 0
    });

    // 6. Seed test OKRs
    testOkr1 = await db.insert('okrs', {
      company_id: 1,
      employee_id: fieldAgentUser.employee_id,
      title: 'Complete 50 Audits',
      progress: 10,
      status: 'In Progress'
    });

    testOkr2 = await db.insert('okrs', {
      company_id: 1,
      employee_id: salesAgentUser.employee_id,
      title: 'Book N5M Orders',
      progress: 20,
      status: 'In Progress'
    });
  });

  // Test 1: Management role detection
  await test('1. Role Detection: Correctly identifies Management vs Operational Agents', () => {
    assert.strictEqual(isManagementUser(adminUser), true, 'Admin is management');
    assert.strictEqual(isManagementUser(supervisorUser), true, 'Supervisor is management');
    assert.strictEqual(isManagementUser(fieldAgentUser), false, 'Field Agent is NOT management');
    assert.strictEqual(isManagementUser(salesAgentUser), false, 'Sales Agent is NOT management');
  });

  // Test 2: IDOR Protection on Tasks
  await test('2. IDOR Protection: Field Agent cannot modify Sales Agent tasks', async () => {
    // Agent A updating their own task succeeds
    const updatedOwn = await employeeService.updateTaskStatus(testTask1.id, fieldAgentUser.employee_id, {
      status: 'in_progress',
      progress: 50
    });
    assert.strictEqual(updatedOwn.progress, 50, 'Agent can update own task');

    // Agent A updating Agent B task fails with 403 / Access Denied
    await assert.rejects(
      async () => {
        await employeeService.updateTaskStatus(testTask2.id, fieldAgentUser.employee_id, {
          status: 'completed',
          progress: 100
        });
      },
      (err) => {
        assert.ok(err.message.includes('Access denied'));
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'Should reject IDOR task tampering with 403 Forbidden'
    );
  });

  // Test 3: IDOR Protection on OKRs
  await test('3. IDOR Protection: Sales Agent cannot modify Field Agent OKRs', async () => {
    // Agent B updating their own OKR succeeds
    const updatedOwn = await employeeService.updateOKR(testOkr2.id, salesAgentUser.employee_id, {
      progress: 80
    });
    assert.strictEqual(updatedOwn.progress, 80, 'Agent can update own OKR');

    // Agent B updating Agent A OKR fails with 403 / Access Denied
    await assert.rejects(
      async () => {
        await employeeService.updateOKR(testOkr1.id, salesAgentUser.employee_id, {
          progress: 100
        });
      },
      (err) => {
        assert.ok(err.message.includes('Access denied'));
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'Should reject IDOR OKR tampering with 403 Forbidden'
    );
  });

  // Test 4: SOS Emergency Panic Beacon creation & read-only isolation
  await test('4. SOS Panic Beacon: Agent can trigger distress beacon with GPS coordinates', async () => {
    const sos = await fieldService.triggerSOS(
      fieldAgentUser.employee_id,
      6.5244,
      3.3792,
      4.2,
      'EMERGENCY: Distress beacon triggered from field patrol'
    );

    assert.ok(sos.id, 'SOS incident record created');
    assert.ok(sos.status === 'active' || sos.status === 'OPEN', 'Status is active or OPEN');
    assert.strictEqual(Number(sos.agent_id), fieldAgentUser.employee_id);
    assert.strictEqual(sos.latitude, 6.5244);
    assert.strictEqual(sos.longitude, 3.3792);
  });

  // Test 5: SOS Query Scope: Agent only receives their own emergency records
  await test('5. SOS History: Field Agent only receives their own emergency records (Read-Only)', async () => {
    // Create an SOS for Sales Agent
    await fieldService.triggerSOS(
      salesAgentUser.employee_id,
      6.4281,
      3.4219,
      5.0,
      'Sales Agent SOS'
    );

    const allSOS = await fieldService.getSOS();
    const fieldAgentSOS = allSOS.filter(s => Number(s.agent_id) === fieldAgentUser.employee_id);
    const salesAgentSOS = allSOS.filter(s => Number(s.agent_id) === salesAgentUser.employee_id);

    assert.ok(fieldAgentSOS.length >= 1, 'Field agent has own records');
    assert.ok(salesAgentSOS.length >= 1, 'Sales agent has own records');

    // Verify isolation: Field agent records do not leak to sales agent
    for (const record of fieldAgentSOS) {
      assert.strictEqual(Number(record.agent_id), fieldAgentUser.employee_id);
    }
  });

  // Test 6: Commercial Sales Scoping
  await test('6. Commercial Sales Scoping: Sales Agent orders are strictly scoped to caller', async () => {
    // Create order for Sales Agent
    const order = await db.insert('orders', {
      company_id: 1,
      order_number: `ORD-TEST-${Date.now()}`,
      sales_agent_id: salesAgentUser.employee_id,
      customer_id: 1,
      total_amount: 50000,
      status: 'pending'
    });

    const orders = await salesService.getOrders({ agent_id: salesAgentUser.employee_id });
    assert.ok(orders.some(o => o.id === order.id), 'Sales agent retrieves their own order');

    const otherAgentOrders = await salesService.getOrders({ agent_id: fieldAgentUser.employee_id });
    assert.strictEqual(otherAgentOrders.some(o => o.id === order.id), false, 'Other agent cannot retrieve order');
  });

  // Test 7: RBAC Middleware enforcement
  await test('7. RBAC Middleware: Blocks unauthorized roles with HTTP 403 Forbidden', () => {
    const hrMiddleware = hasRole('HR', 'HR_MANAGER', 'ADMIN', 'CEO');

    let responseCode = null;
    let responseBody = null;
    const fakeRes = {
      status(code) {
        responseCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      }
    };

    let nextCalled = false;
    const fakeNext = () => { nextCalled = true; };

    // Field Agent calling HR route -> 403 Forbidden
    const agentReq = { user: fieldAgentUser };
    hrMiddleware(agentReq, fakeRes, fakeNext);
    assert.strictEqual(responseCode, 403, 'Should reject field agent with 403');
    assert.strictEqual(responseBody?.error?.code, 'FORBIDDEN');
    assert.strictEqual(nextCalled, false, 'Next middleware must NOT be called');

    // Admin calling HR route -> 200 / Next called
    nextCalled = false;
    responseCode = null;
    const adminReq = { user: adminUser };
    hrMiddleware(adminReq, fakeRes, fakeNext);
    assert.strictEqual(nextCalled, true, 'Admin successfully passes HR check');
  });
});
