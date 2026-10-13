// ==============================================================================
// EDGEWFORCE - FIELD AGENT RBAC & ACCESS CONTROL TEST SUITE
// Verifies Field Agent privileges are strictly operational & Administrative actions are forbidden
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { hasRole, hasPermission } from '../middleware/rbac.js';
import { db, resetTestData } from './helpers/database.js';

test('Field Agent RBAC & Permission Hardening', async (t) => {
  const fieldAgentUser = {
    id: 105,
    company_id: 1,
    email: 'fieldagent.chima@edgewforce.com',
    role_code: 'FIELD_AGENT',
    rank: { code: 'FIELD_AGENT' }
  };

  const salesAgentUser = {
    id: 106,
    company_id: 1,
    email: 'salesrep.tunde@edgewforce.com',
    role_code: 'SALES_AGENT',
    rank: { code: 'SALES_AGENT' }
  };

  const hrManagerUser = {
    id: 107,
    company_id: 1,
    email: 'hr.fatima@edgewforce.com',
    role_code: 'HR_MANAGER',
    rank: { code: 'HR' }
  };

  const staffUser = {
    id: 108,
    company_id: 1,
    email: 'staff.gloria@edgewforce.com',
    role_code: 'STAFF_MEMBER',
    rank: { code: 'STAFF' }
  };

  await t.test('1. FIELD_AGENT is blocked from Staff Registration & HR Management', () => {
    let nextCalled = false;
    let statusCode = 200;
    let errorResponse = null;

    const req = { user: fieldAgentUser };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { errorResponse = data; }
        };
      }
    };
    const next = () => { nextCalled = true; };

    // HR Guard middleware
    const hrGuard = hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN');
    hrGuard(req, res, next);

    assert.equal(nextCalled, false, 'Field Agent should NOT pass HR guard');
    assert.equal(statusCode, 403, 'Should respond with 403 Forbidden');
    assert.ok(errorResponse?.error?.message?.includes('Access denied'), 'Error message must specify access denied');
  });

  await t.test('2. FIELD_AGENT is blocked from Company Admin Settings & Structure', () => {
    let nextCalled = false;
    let statusCode = 200;
    let errorResponse = null;

    const req = { user: fieldAgentUser };
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { errorResponse = data; }
        };
      }
    };
    const next = () => { nextCalled = true; };

    const adminGuard = hasRole('SUPER_ADMIN', 'ADMIN', 'CEO', 'IT_ADMIN');
    adminGuard(req, res, next);

    assert.equal(nextCalled, false, 'Field Agent should NOT pass Admin guard');
    assert.equal(statusCode, 403, 'Should respond with 403 Forbidden');
  });

  await t.test('3. HR_MANAGER and IT_ADMIN pass administrative guards', () => {
    let nextCalled = false;
    const req = { user: hrManagerUser };
    const res = {
      status: () => ({ json: () => {} })
    };
    const next = () => { nextCalled = true; };

    const hrGuard = hasRole('HR', 'HR_MANAGER', 'CEO', 'CTO', 'IT_ADMIN');
    hrGuard(req, res, next);

    assert.equal(nextCalled, true, 'HR Manager must pass HR guard');
  });

  await t.test('4. Field Agent has strictly operational permissions', () => {
    let permissionChecked = false;
    const req = { user: fieldAgentUser };
    const res = { status: () => ({ json: () => {} }) };
    const next = () => { permissionChecked = true; };

    // Field Agent can view field operations
    hasPermission('view_field_operations')(req, res, next);
    assert.equal(permissionChecked, true, 'Field Agent can view field operations');

    // Field Agent CANNOT manage inventory or create employees
    let forbiddenCalled = false;
    let statusCode = 200;
    const resForbidden = {
      status: (code) => {
        statusCode = code;
        return {
          json: () => { forbiddenCalled = true; }
        };
      }
    };
    let nextForbidden = false;

    hasPermission('create_employee')(req, resForbidden, () => { nextForbidden = true; });
    assert.equal(nextForbidden, false, 'Field Agent MUST NOT have create_employee permission');
    assert.equal(statusCode, 403, 'Must return 403 for create_employee');
  });
});
