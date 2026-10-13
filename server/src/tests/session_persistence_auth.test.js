// ==============================================================================
// EDGEWFORCE - SESSION PERSISTENCE & AUTHENTICATION RECOVERY TESTS
// ==============================================================================

import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { authService } from '../services/authService.js';
import { db, resetTestData } from './helpers/database.js';
import { signUserToken } from '../middleware/auth.js';

describe('EdgeWForce Session Persistence & Authentication Verification', () => {
  before(async () => {
    await resetTestData();
  });

  test('1. User Login generates valid JWT token and complete user profile', async () => {
    const result = await authService.login('it@edgewforce.com', 'ChangeMe123!');
    assert.ok(result.token, 'Must return JWT token');
    assert.ok(result.user, 'Must return user object');
    assert.strictEqual(result.user.email, 'it@edgewforce.com');
    assert.strictEqual(result.user.role_code, 'SUPER_ADMIN');
    assert.ok(result.user.employee, 'Must include employee data');
  });

  test('2. Token decoded matches user ID and role', async () => {
    const user = await db.findOne('users', { email: 'ceo@edgewforce.com' });
    assert.ok(user, 'CEO user exists');

    const token = signUserToken(user);
    assert.ok(typeof token === 'string', 'Token must be a string');

    const decoded = jwt.decode(token);
    assert.strictEqual(decoded.userId, user.id);
    assert.strictEqual(decoded.email, 'ceo@edgewforce.com');
    assert.strictEqual(decoded.role, 'CEO');
  });

  test('3. /auth/me profile restoration retrieves full security context', async () => {
    const user = await db.findOne('users', { email: 'sales@edgewforce.com' });
    assert.ok(user, 'Sales user exists');

    const sessionProfile = await authService.me(user.id);
    assert.ok(sessionProfile, 'Must return session profile');
    assert.strictEqual(sessionProfile.id, user.id);
    assert.strictEqual(sessionProfile.email, 'sales@edgewforce.com');
    assert.strictEqual(sessionProfile.role_code, 'SALES_AGENT');
    assert.ok(sessionProfile.employee, 'Must have linked employee');
    assert.strictEqual(sessionProfile.employee.first_name, 'Test4');
  });

  test('4. Client-side unwrapping handles both raw user object and wrapped payload', () => {
    const rawUserFromUnwrappedApi = {
      id: 1,
      email: 'it@edgewforce.com',
      role_code: 'SUPER_ADMIN',
      full_name: 'IT Super Admin'
    };

    // Simulate App.jsx extraction logic
    const extractAppUser = (res) => {
      return (res && (res.id || res.role_code || res.email)) ? res : (res?.user || res?.data || null);
    };

    const userFromUnwrapped = extractAppUser(rawUserFromUnwrappedApi);
    assert.strictEqual(userFromUnwrapped?.id, 1, 'Should extract user directly from unwrapped response');
    assert.strictEqual(userFromUnwrapped?.email, 'it@edgewforce.com');

    // Wrapped response simulation
    const wrappedApiResponse = {
      success: true,
      data: rawUserFromUnwrappedApi,
      user: rawUserFromUnwrappedApi
    };
    const userFromWrapped = extractAppUser(wrappedApiResponse);
    assert.strictEqual(userFromWrapped?.id, 1, 'Should extract user from wrapped response');
  });

  test('5. Deactivated user cannot log in', async () => {
    const inactiveUser = await db.insert('users', {
      full_name: 'Inactive User',
      email: 'inactive@edgewforce.com',
      password_hash: '$2a$10$xyz',
      role_code: 'EMPLOYEE',
      status: 'inactive'
    });

    await assert.rejects(
      async () => {
        await authService.login('inactive@edgewforce.com', 'ChangeMe123!');
      },
      /deactivated/i,
      'Should reject deactivated user'
    );
  });
});
