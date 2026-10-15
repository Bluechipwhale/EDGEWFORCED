import test from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { activityService as service } from '../services/activityService.js';
import { idleService } from '../services/idleService.js';
import { notificationService } from '../services/notificationService.js';

test('Production app inactivity monitoring', async t => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const start = Date.now();
  let staff, hr, foreign;
  const beat = (sequence, seconds, client_id = first, stop = false) => service.heartbeat(staff, { client_id, sequence, stop }, start + seconds * 1000);
  await t.test('Uses authenticated identity; administrators without staff profiles are not assigned another employee', async () => {
    await resetTestData();
    staff = await db.findById('users', 4);
    hr = await db.insert('users', { company_id: 1, email: 'hr-no-profile@example.test', full_name: 'HR without employee', status: 'active', role_code: 'HR_MANAGER' });
    foreign = await db.insert('users', { company_id: 2, email: 'other-hr@example.test', full_name: 'Other tenant', status: 'active', role_code: 'HR_MANAGER' });
    assert.equal((await service.heartbeat(hr, { client_id: first, sequence: 0 }, start)).enabled, false);
    await assert.rejects(service.heartbeat({ ...staff, company_id: 2 }, { client_id: first, sequence: 0 }, start), /not active/);
    await assert.rejects(beat(-1, 0), /sequence/);
    await assert.rejects(service.heartbeat(staff, { client_id: 'bad', sequence: 0 }), /session/);
  });
  await t.test('Only flags at the server-observed 600-second threshold', async () => {
    await beat(0, 0);
    await beat(0, 599);
    assert.equal((await db.find('workforce_activity_events')).length, 0);
    const result = await beat(0, 600);
    assert.equal(result.event.kind, 'app_inactive');
    assert.equal(result.event.user_id, staff.id);
    assert.equal((await db.find('workforce_activity_notices', { user_id: hr.id })).length, 1);
    assert.equal((await db.find('workforce_activity_notices', { user_id: foreign.id })).length, 0);
  });
  await t.test('Concurrent retries and additional idle tabs do not duplicate an open period or HR alert', async () => {
    await Promise.all([beat(0, 630), beat(0, 630), service.processDue(hr, start + 630000)]);
    assert.equal((await db.find('workforce_activity_events')).length, 1);
    assert.equal((await db.find('workforce_activity_notices', { user_id: hr.id })).length, 1);
  });
  await t.test('A second tab resumes the same period and activity in any tab prevents new flags', async () => {
    await beat(0, 640, second);
    assert.ok((await db.find('workforce_activity_events'))[0].ended_at);
    await beat(1, 900, second);
    await beat(0, 1239);
    assert.equal((await db.find('workforce_activity_events')).length, 1);
    await assert.rejects(beat(0, 1240, second), /out of order/);
  });
  await t.test('A lost connection is labelled unconfirmed; the server still creates a flag without a browser timer', async () => {
    await service.processDue(hr, start + 1500000);
    const events = await db.find('workforce_activity_events');
    assert.equal(events.length, 2);
    assert.equal(events[1].kind, 'connection_lost');
    assert.match((await db.find('workforce_activity_notices', { event_id: events[1].id }))[0].body, /connection was lost/);
  });
  await t.test('HR receives notices in the existing notification bell without an employee profile', async () => {
    const result = await notificationService.getNotifications(null, hr);
    assert.equal(result.notifications.filter(n => String(n.id).startsWith('activity:')).length, 2);
    assert.equal((await notificationService.getNotifications(null, foreign)).notifications.length, 0);
    const notice = result.notifications.find(n => String(n.id).startsWith('activity:'));
    await assert.rejects(notificationService.markRead(notice.id, null, foreign), /not found/);
    await notificationService.markRead(notice.id, null, hr);
    assert.equal((await notificationService.getNotifications(null, hr)).unreadCount, 1);
  });
  await t.test('Staff can explain only their own event; HR review and explanations do not erase history', async () => {
    const event = (await db.find('workforce_activity_events'))[0];
    await assert.rejects(service.updateEvent(hr, event.id, { reason: 'Meeting' }), /cannot update/);
    await assert.rejects(service.updateEvent(foreign, event.id, {}, true), /not found/);
    await assert.rejects(service.updateEvent(staff, event.id, {}, true), /cannot update/);
    await assert.rejects(service.updateEvent(staff, event.id, { reason: 'Meeting', reason_details: 'x'.repeat(2001) }), /2,000/);
    await service.updateEvent(staff, event.id, { reason: 'Meeting', reason_details: 'Client meeting' });
    await service.updateEvent(hr, event.id, {}, true);
    const saved = await db.findById('workforce_activity_events', event.id);
    assert.equal(saved.reason, 'Meeting');
    assert.ok(saved.reviewed_at);
    assert.equal((await db.find('workforce_activity_events')).length, 2);
    await assert.rejects(service.reports(staff), /Only HR/);
    assert.deepEqual(await service.reports(foreign), []);
  });
  await t.test('Explicit logout stops monitoring across tabs; reconnect starts a fresh activity anchor', async () => {
    await beat(2, 1510, second, true);
    await service.processDue(hr, start + 3000000);
    assert.equal((await db.find('workforce_activity_events')).length, 2);
    assert.ok((await db.find('workforce_activity_presence')).every(p => p.stopped_at));
    await beat(3, 3001, second);
    await beat(3, 3599, second);
    assert.equal((await db.find('workforce_activity_events')).length, 2);
  });
  await t.test('Suspended staff do not generate new monitoring alerts', async () => {
    await db.update('users', staff.id, { status: 'suspended' });
    await service.processDue(hr, start + 5000000);
    assert.equal((await db.find('workforce_activity_events')).length, 2);
    await assert.rejects(beat(4, 5001), /not active/);
  });
  await t.test('Legacy inactivity endpoints also enforce ownership and company boundaries', async () => {
    await db.update('users', staff.id, { status: 'active' });
    await assert.rejects(idleService.startIdleSession({ employee_id: 1, duration_seconds: 600 }, staff), /own activity/);
    const event = await idleService.startIdleSession({ duration_seconds: 600 }, staff);
    await assert.rejects(idleService.explainIdleSession(event.id, { reason: 'Meeting' }, hr), /own activity/);
    assert.deepEqual(await idleService.getIdleSessions({}, foreign), []);
    assert.deepEqual(await idleService.getIdleSessions({}, hr).then(rows => rows.map(r => r.id)), [event.id]);
    await assert.rejects(idleService.getIdleAnalytics(), /Authentication/);
  });
  await t.test('HTTP routes require authentication and restrict the HR queue to company reviewers', async () => {
    process.env.NODE_ENV = 'test';
    const { default: app } = await import('../index.js');
    const { signUserToken } = await import('../middleware/auth.js');
    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}/api/activity`;
      const call = (actor, path, body) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(actor ? { Authorization: `Bearer ${signUserToken(actor)}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.equal((await call(null, '/reports')).status, 401);
      assert.equal((await call(staff, '/reports')).status, 403);
      assert.equal((await call(hr, '/reports')).status, 200);
      const ownless = await call(hr, '/heartbeat', { client_id: second, sequence: 0, employee_id: 4 });
      assert.equal(ownless.status, 200);
      assert.equal((await ownless.json()).data.enabled, false);
      const foreignQueue = await call(foreign, '/reports');
      assert.equal(foreignQueue.status, 200);
      assert.deepEqual((await foreignQueue.json()).data, []);
    } finally { await new Promise(resolve => server.close(resolve)); }
  });
});
