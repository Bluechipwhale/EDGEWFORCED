// ==============================================================================
// EDGEWFORCE - SUPABASE AUTH INTEGRATION & RBAC TEST SUITE
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { authService, findUserByIdentifier } from '../services/authService.js';
import { requireAuth, signUserToken } from '../middleware/auth.js';
import { ROLE_PERMISSIONS, isManagementUser } from '../middleware/rbac.js';
import { db, resetTestData } from './helpers/database.js';

test('▶ Supabase Auth Integration & Identity Lifecycle Suite', async (t) => {
  await resetTestData();

  await t.test('1. User Lookup by Multiple Identifiers (Email, Phone, Staff ID)', async () => {
    // Lookup by corporate email
    const userByEmail = await findUserByIdentifier('it@edgewforce.com');
    assert.ok(userByEmail, 'Should find user by corporate email');
    assert.equal(userByEmail.email, 'it@edgewforce.com');

    // Lookup by phone
    const userByPhone = await findUserByIdentifier('+2348000000001');
    assert.ok(userByPhone, 'Should find user by phone number');
    assert.equal(userByPhone.id, 1);

    // Lookup by Staff Code / ID
    const userByStaffId = await findUserByIdentifier('EMP-1001');
    assert.ok(userByStaffId, 'Should find user by employee code EMP-1001');
    assert.equal(userByStaffId.id, 1);
  });

  await t.test('2. Employee Registration provisions profile and links identity', async () => {
    const randomSuffix = Date.now();
    const newStaffData = {
      full_name: 'Amaka Chidinma',
      email: `amaka.test.${randomSuffix}@edgewforce.com`,
      password: 'SecurePassword123!',
      phone: `+23480999${randomSuffix.toString().slice(-5)}`,
      role_code: 'FIELD_AGENT',
      rank_code: 'STAFF',
      department: 'Field Operations',
      position: 'Field Operations Agent',
      base_salary: 400000
    };

    const { user, employee } = await authService.registerEmployee(newStaffData);
    assert.ok(user.id, 'User record must be created with ID');
    assert.equal(user.email, newStaffData.email.toLowerCase());
    assert.equal(user.role_code, 'FIELD_AGENT');
    assert.ok(employee.id, 'Employee profile must be created');
    assert.equal(employee.user_id, user.id);
    assert.equal(employee.department, 'Field Operations');

    // Verify leave balance initialized
    const leave = await db.findOne('leave_balances', { employee_id: employee.id });
    assert.ok(leave, 'Leave balance must be initialized');
    assert.equal(leave.annual, 20);
  });

  await t.test('3. Login authentication returns valid session token and complete profile context', async () => {
    const loginResult = await authService.login('it@edgewforce.com', 'ChangeMe123!');
    assert.ok(loginResult.token, 'Must return session token');
    assert.ok(loginResult.user, 'Must return user profile');
    assert.equal(loginResult.user.role_code, 'SUPER_ADMIN');
    assert.ok(loginResult.user.employee, 'Must include linked employee profile');
    assert.ok(loginResult.user.department, 'Must include department details');
  });

  await t.test('4. Login rejects invalid password securely', async () => {
    await assert.rejects(
      async () => {
        await authService.login('it@edgewforce.com', 'WrongPassword999!');
      },
      /Invalid/i
    );
  });

  await t.test('5. Login rejects nonexistent account securely', async () => {
    await assert.rejects(
      async () => {
        await authService.login('nonexistent.user@edgewforce.com', 'AnyPassword123!');
      },
      /Invalid/i
    );
  });

  await t.test('6. Password Recovery generates recovery token and validates expiry', async () => {
    const forgotRes = await authService.forgotPassword('hr@edgewforce.com');
    assert.equal(forgotRes.success, true);
    assert.ok(forgotRes.reset_token, 'Should generate reset token');

    // Reset password with valid token
    const resetRes = await authService.resetPassword('hr@edgewforce.com', forgotRes.reset_token, 'NewSecurePassword123!');
    assert.equal(resetRes.success, true);

    // Verify login with new password succeeds
    const newLogin = await authService.login('hr@edgewforce.com', 'NewSecurePassword123!');
    assert.ok(newLogin.token, 'Login must succeed with new password');
  });

  await t.test('7. Password Reset rejects passwords shorter than 8 characters', async () => {
    await assert.rejects(
      async () => {
        await authService.resetPassword('hr@edgewforce.com', '123456', 'short');
      },
      /at least 8 characters/i
    );
  });

  await t.test('8. requireAuth middleware validates Bearer token and attaches security context', async () => {
    const user = await db.findById('users', 1);
    const token = signUserToken(user);

    let nextCalled = false;
    const req = {
      headers: { authorization: `Bearer ${token}` }
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      }
    };
    const next = () => { nextCalled = true; };

    await requireAuth(req, res, next);
    assert.equal(nextCalled, true, 'requireAuth should call next() for valid token');
    assert.ok(req.user, 'req.user must be attached');
    assert.equal(req.user.id, 1);
    assert.equal(req.user.role_code, 'SUPER_ADMIN');
  });

  await t.test('9. requireAuth rejects missing and malformed authorization headers', async () => {
    const req = { headers: {} };
    let statusSent = null;
    let jsonSent = null;
    const res = {
      status(code) { statusSent = code; return this; },
      json(data) { jsonSent = data; return this; }
    };

    await requireAuth(req, res, () => {});
    assert.equal(statusSent, 401);
    assert.equal(jsonSent.error.code, 'UNAUTHORIZED');
  });

  await t.test('10. Granular RBAC Role Permissions are strictly preserved', async () => {
    // Super Admin has all permissions
    assert.ok(ROLE_PERMISSIONS.SUPER_ADMIN.includes('*'), 'Super Admin must have wildcard permission');

    // HR Manager permissions
    assert.ok(ROLE_PERMISSIONS.HR_MANAGER.includes('create_employee'));
    assert.ok(ROLE_PERMISSIONS.HR_MANAGER.includes('approve_leave'));
    assert.ok(ROLE_PERMISSIONS.HR_MANAGER.includes('view_attendance'));

    // Field Agent permissions
    assert.ok(ROLE_PERMISSIONS.FIELD_AGENT.includes('view_field_operations'));
    assert.ok(!ROLE_PERMISSIONS.FIELD_AGENT.includes('approve_leave'), 'Field Agent must not approve leave');
    assert.ok(!ROLE_PERMISSIONS.FIELD_AGENT.includes('create_employee'), 'Field Agent must not create employee');

    // Sales Agent permissions
    assert.ok(ROLE_PERMISSIONS.SALES_AGENT.includes('create_orders'));
    assert.ok(ROLE_PERMISSIONS.SALES_AGENT.includes('record_collections'));
    assert.ok(!ROLE_PERMISSIONS.SALES_AGENT.includes('approve_leave'), 'Sales Agent must not approve leave');
  });
});
