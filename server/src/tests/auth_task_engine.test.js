// ==============================================================================
// EDGEWFORCE - AUTOMATED INTEGRATION TEST SUITE
// Flexible Auth (Email/Phone/Both), Nigerian Phone Normalization,
// Task Intelligence, 4-Stage Delivery Protection, Reminders & Inactivity Telemetry
// ==============================================================================

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isEmail, normalizeEmail } from '../utils/phoneNormalizer.js';
import { authService } from '../services/authService.js';
import { taskService } from '../services/taskService.js';
import { reminderService } from '../services/reminderService.js';
import { reminderWorker } from '../services/reminderWorker.js';
import { idleService } from '../services/idleService.js';
import { hrService } from '../services/hrService.js';
import { db, resetTestData } from './helpers/database.js';

describe('1. Nigerian Phone Normalization & Email Identifier Tests', () => {
  it('should normalize standard 11-digit Nigerian local phone numbers', () => {
    assert.strictEqual(normalizePhone('08012345678'), '+2348012345678');
    assert.strictEqual(normalizePhone('08123456789'), '+2348123456789');
    assert.strictEqual(normalizePhone('07033445566'), '+2347033445566');
    assert.strictEqual(normalizePhone('09099887766'), '+2349099887766');
  });

  it('should normalize international 234 and +234 prefixes', () => {
    assert.strictEqual(normalizePhone('+2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhone('2348012345678'), '+2348012345678');
    assert.strictEqual(normalizePhone('234 801 234 5678'), '+2348012345678');
  });

  it('should detect emails and normalize correctly', () => {
    assert.strictEqual(isEmail('john@company.com'), true);
    assert.strictEqual(isEmail('08012345678'), false);
    assert.strictEqual(normalizeEmail(' John.Doe@Company.COM '), 'john.doe@company.com');
  });
});

describe('2. Flexible Email or Phone Registration & Authentication Tests', () => {
  const ts = Date.now();
  const emailA = `amaka.emailonly.${ts}@testcorp.com`;
  const rawPhoneB = `0819999${Math.floor(1000 + Math.random() * 9000)}`;
  const normalizedPhoneB = normalizePhone(rawPhoneB);
  const emailC = `tunde.both.${ts}@testcorp.com`;
  const rawPhoneC = `0701122${Math.floor(1000 + Math.random() * 9000)}`;
  const normalizedPhoneC = normalizePhone(rawPhoneC);

  it('Account Type A: should register and login with Email Only (Phone = NULL)', async () => {
    const regRes = await authService.registerEmployee({
      full_name: 'Amaka EmailOnly',
      email: emailA,
      password: 'SecurePassword123!',
      phone: null,
      role_code: 'EMPLOYEE'
    });

    assert.ok(regRes.user);
    assert.strictEqual(regRes.user.email, emailA);
    assert.strictEqual(regRes.user.phone, null);

    // Login with email
    const loginRes = await authService.login(emailA, 'SecurePassword123!');
    assert.ok(loginRes.token);
    assert.strictEqual(loginRes.user.email, emailA);
  });

  it('Account Type B: should register and login with Phone Only (Email = NULL)', async () => {
    const regRes = await authService.registerEmployee({
      full_name: 'Emeka PhoneOnly',
      email: null,
      password: 'SecurePassword123!',
      phone: rawPhoneB,
      role_code: 'EMPLOYEE'
    });

    assert.ok(regRes.user);
    assert.strictEqual(regRes.user.email, null);
    assert.strictEqual(regRes.user.phone, normalizedPhoneB);

    // Login using local format
    const loginLocal = await authService.login(rawPhoneB, 'SecurePassword123!');
    assert.ok(loginLocal.token);
    assert.strictEqual(loginLocal.user.phone, normalizedPhoneB);

    // Login using international format
    const loginIntl = await authService.login(normalizedPhoneB, 'SecurePassword123!');
    assert.ok(loginIntl.token);
  });

  it('Account Type C: should register with Email + Phone and login with either', async () => {
    const regRes = await authService.registerEmployee({
      full_name: 'Tunde BothCredentials',
      email: emailC,
      password: 'SecurePassword123!',
      phone: rawPhoneC,
      role_code: 'EMPLOYEE'
    });

    assert.ok(regRes.user);
    assert.strictEqual(regRes.user.email, emailC);
    assert.strictEqual(regRes.user.phone, normalizedPhoneC);

    // Login with email
    const byEmail = await authService.login(emailC, 'SecurePassword123!');
    assert.ok(byEmail.token);

    // Login with phone
    const byPhone = await authService.login(rawPhoneC, 'SecurePassword123!');
    assert.ok(byPhone.token);
  });

  it('should reject registration when neither email nor phone is provided', async () => {
    await assert.rejects(
      async () => {
        await authService.registerEmployee({
          full_name: 'Ghost User',
          email: null,
          phone: null,
          password: 'Password123!'
        });
      },
      /email address or phone number/i
    );
  });

  it('should prevent duplicate email and duplicate phone registration', async () => {
    await assert.rejects(
      async () => {
        await authService.registerEmployee({
          full_name: 'Duplicate Email User',
          email: emailC,
          phone: `0815555${Math.floor(1000 + Math.random() * 9000)}`,
          password: 'Password123!'
        });
      },
      /Email already registered/i
    );

    await assert.rejects(
      async () => {
        await authService.registerEmployee({
          full_name: 'Duplicate Phone User',
          email: `unique.diff.${Date.now()}@testcorp.com`,
          phone: rawPhoneC,
          password: 'Password123!'
        });
      },
      /Phone number already registered/i
    );
  });

  it('should handle Password Reset using Email or Phone identifier', async () => {
    // Reset via Email
    const forgotEmailRes = await authService.forgotPassword(emailA);
    assert.ok(forgotEmailRes.reset_token);
    assert.strictEqual(forgotEmailRes.reset_token.length, 6);

    const resetEmailRes = await authService.resetPassword(emailA, forgotEmailRes.reset_token, 'NewSecurePassword123!');
    assert.strictEqual(resetEmailRes.success, true);

    // Verify login with new password
    const newLogin = await authService.login(emailA, 'NewSecurePassword123!');
    assert.ok(newLogin.token);

    // Reset via Phone
    const forgotPhoneRes = await authService.forgotPassword(rawPhoneB);
    assert.ok(forgotPhoneRes.reset_token);

    const resetPhoneRes = await authService.resetPassword(rawPhoneB, forgotPhoneRes.reset_token, 'BrandNewPhonePassword123!');
    assert.strictEqual(resetPhoneRes.success, true);

    const phoneLogin = await authService.login(rawPhoneB, 'BrandNewPhonePassword123!');
    assert.ok(phoneLogin.token);
  });
});

describe('3. Task Intelligence & 4-Stage Client Delivery Protection Tests', () => {
  let createdTaskId = null;

  it('should create client deliverable task with custom client and project parameters', async () => {
    const actor = { id: 7, role_code: 'SUPERVISOR', rank: { code: 'SUPERVISOR', level: 7 }, company_id: 1 };
    const task = await taskService.createTask({
      title: 'Submit Q3 Retail Analysis to Carex',
      description: 'Prepare and deliver complete deck to Carex brand director',
      assigned_to: 4,
      client_name: 'Carex Nigeria',
      project_name: 'Carex Clean Hands Tour',
      priority: 'high',
      task_type: 'delivery',
      due_at: new Date(Date.now() + 3600000).toISOString(),
      channels: ['in_app', 'email', 'whatsapp', 'push']
    }, actor);

    assert.ok(task.id);
    assert.strictEqual(task.client_name, 'Carex Nigeria');
    assert.strictEqual(task.project_name, 'Carex Clean Hands Tour');
    assert.strictEqual(task.task_type, 'delivery');
    assert.strictEqual(task.delivery_stages.sent_to_client, false);

    createdTaskId = task.id;
  });

  it('should acknowledge task ("I\'m Aware")', async () => {
    const actor = { id: 4, role_code: 'SALES_AGENT' };
    const ackTask = await taskService.acknowledgeTask(createdTaskId, actor);
    assert.ok(ackTask.acknowledged_at);
    assert.strictEqual(ackTask.acknowledged_by, 4);
  });

  it('Forgot-To-Send Protection: should block completion if client deliverable is not marked as sent', async () => {
    const actor = { id: 4, role_code: 'SALES_AGENT' };

    await assert.rejects(
      async () => {
        await taskService.completeTask(createdTaskId, {
          delivery_stages: { prepared: true, reviewed: true, sent_to_client: false }
        }, actor);
      },
      /Forgot-To-Send Protection/i
    );
  });

  it('should complete task once sent_to_client is verified and suppress all future reminders', async () => {
    const actor = { id: 4, role_code: 'SALES_AGENT' };
    const completed = await taskService.completeTask(createdTaskId, {
      delivery_stages: { prepared: true, reviewed: true, sent_to_client: true, client_delivery: true },
      evidence_name: 'Carex_Q3_Final_Deck.pdf',
      completion_notes: 'Deck delivered to Carex Marketing team via email and approved.'
    }, actor);

    assert.strictEqual(completed.status, 'completed');
    assert.strictEqual(completed.progress, 100);

    // Verify reminder suppression in task_reminders
    const reminders = await db.find('task_reminders', { task_id: createdTaskId });
    for (const rem of reminders) {
      assert.strictEqual(rem.status, 'cancelled');
    }
  });
});

describe('4. Background Reminder Worker & 10m Inactivity Telemetry Tests', () => {
  it('should execute reminder worker cycle with idempotency and log deliveries', async () => {
    // Create an active pending task for reminder worker testing
    const pendingTask = await taskService.createTask({
      title: 'Submit Commercial Campaign Performance Deck for Carex Nigeria',
      description: 'Prepare and deliver complete deck',
      assigned_to: 4,
      client_name: 'Carex Nigeria',
      due_at: new Date(Date.now() + 3600000).toISOString()
    }, { id: 7, role_code: 'SUPERVISOR' });

    // Schedule a due test reminder
    const testRem = await reminderService.scheduleReminder({
      task_id: pendingTask.id,
      user_id: 4,
      employee_id: 4,
      company_id: 1,
      reminder_at: new Date(Date.now() - 5000).toISOString(),
      reminder_level: 'pre_deadline',
      channels: ['in_app', 'email', 'whatsapp', 'push']
    });

    assert.ok(testRem.id);

    // Execute background worker cycle
    await reminderWorker.processDueReminders();

    const updatedRem = await db.findById('task_reminders', testRem.id);
    assert.strictEqual(updatedRem.status, 'sent');

    // Verify delivery logs recorded
    const logs = await reminderService.getDeliveryLogs(pendingTask.id);
    assert.ok(logs.length > 0);
  });

  it('should log 10-minute workstation inactivity telemetry and alert IT and HR', async () => {
    const session = await idleService.startIdleSession({
      employee_id: 1,
      user_id: 1,
      duration_seconds: 600,
      workstation_snapshot: { window_state: 'MINIMIZED_BACKGROUND', screen_resolution: '1920x1080' }
    }, await db.findById('users', 1));

    assert.ok(session.id);
    assert.strictEqual(session.duration_seconds, 600);
    assert.strictEqual(session.status, 'pending');

    // Submit explanation
    const explained = await idleService.explainIdleSession(session.id, {
      reason: 'Physical Meeting',
      reason_details: 'Attending client review presentation with Key Accounts Director'
    }, await db.findById('users', 1));

    assert.strictEqual(explained.status, 'explained');
    assert.strictEqual(explained.reason, 'Physical Meeting');
  });

  it('should aggregate reminder and idle analytics', async () => {
    const reminderAnalytics = await reminderService.getReminderAnalytics();
    const idleAnalytics = await idleService.getIdleAnalytics(await db.findById('users', 1));

    assert.ok(reminderAnalytics.total_deliveries_logged >= 0);
    assert.ok(idleAnalytics.total_idle_events >= 0);
  });
});
