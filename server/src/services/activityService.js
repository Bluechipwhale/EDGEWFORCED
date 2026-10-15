import { db } from '../config/database.js';

export const ACTIVITY_THRESHOLD_SECONDS = 600;
export const ACTIVITY_REVIEW_ROLES = ['HR', 'HR_MANAGER', 'SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'IT_ADMIN', 'MANAGER'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const iso = value => new Date(value).toISOString();
const newest = (rows, field) => rows.reduce((max, row) => Math.max(max, Date.parse(row[field])), 0);

export const activityService = {
  async identity(actor) {
    if (!actor?.id || !actor.company_id) fail('Authentication required.', 401);
    const user = await db.findById('users', Number(actor.id));
    if (!user || user.status !== 'active' || Number(user.company_id) !== Number(actor.company_id)) fail('Account is not active.', 403);
    const employee = await db.findOne('employees', { user_id: Number(user.id), company_id: Number(user.company_id) });
    return { user, employee: employee?.status === 'active' ? employee : null };
  },
  canReview(actor) { return ACTIVITY_REVIEW_ROLES.includes(String(actor?.role_code || '').toUpperCase()); },
  async heartbeat(actor, input, now = Date.now()) {
    const { user, employee } = await this.identity(actor);
    if (!employee) return { enabled: false, threshold_seconds: 600, event: null };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.client_id || '')) fail('Invalid activity session.');
    if (!Number.isSafeInteger(input.sequence) || input.sequence < 0 || input.sequence > 2147483647) fail('Invalid activity sequence.');
    if (db.isCloud) return db.rpc('workforce_activity_heartbeat', { p_user_id: user.id, p_company_id: user.company_id, p_client_id: input.client_id, p_sequence: input.sequence, p_stop: input.stop === true });
    return db.transaction(async () => {
      await this.processUser(user, now);
      let presence = await db.findOne('workforce_activity_presence', { user_id: user.id, client_id: input.client_id });
      if (presence && input.sequence < presence.sequence) fail('Activity sequence is out of order.');
      const time = iso(now);
      if (!presence) presence = await db.insert('workforce_activity_presence', { company_id: user.company_id, user_id: user.id, employee_id: employee.id, client_id: input.client_id, sequence: input.sequence, last_activity_at: time, last_seen_at: time, stopped_at: input.stop === true ? time : null });
      else await db.update('workforce_activity_presence', presence.id, { sequence: input.sequence, last_seen_at: time, last_activity_at: input.sequence > presence.sequence || presence.stopped_at ? time : presence.last_activity_at, stopped_at: input.stop === true ? time : null });
      if (input.stop === true) for (const row of await db.find('workforce_activity_presence', { user_id: user.id, company_id: user.company_id })) await db.update('workforce_activity_presence', row.id, { stopped_at: time });
      await this.processUser(user, now);
      const events = await db.find('workforce_activity_events', { user_id: user.id, company_id: user.company_id }, { order: { column: 'detected_at', ascending: false }, limit: 20 });
      return { enabled: true, threshold_seconds: 600, server_time: time, event: events.find(e => !e.reason) || null };
    });
  },
  // Local durable-store implementation. Hosted processing uses the same rules in an atomic PostgreSQL RPC.
  async processUser(user, now) {
    const employee = await db.findOne('employees', { user_id: user.id, company_id: user.company_id });
    const rows = await db.find('workforce_activity_presence', { user_id: user.id, company_id: user.company_id });
    const active = rows.filter(r => !r.stopped_at);
    const events = await db.find('workforce_activity_events', { user_id: user.id, company_id: user.company_id });
    const open = events.find(e => !e.ended_at);
    const lastActivity = newest(active, 'last_activity_at');
    if (!active.length || user.status !== 'active' || employee?.status !== 'active' || now - lastActivity < 600000) {
      if (open) await db.update('workforce_activity_events', open.id, { ended_at: iso(now) });
      return;
    }
    if (open) return;
    const event = await db.insert('workforce_activity_events', { company_id: user.company_id, user_id: user.id, employee_id: employee.id, last_activity_at: iso(lastActivity), detected_at: iso(now), last_seen_at: iso(newest(active, 'last_seen_at')), kind: now - newest(active, 'last_seen_at') > 90000 ? 'connection_lost' : 'app_inactive', ended_at: null, reason: null, reason_details: null, reviewed_at: null, created_at: iso(now) });
    await this.deliver(user.company_id, event);
  },
  async deliver(companyId, event) {
    const users = await db.find('users', { company_id: Number(companyId), status: 'active' });
    const hr = users.filter(u => ['HR', 'HR_MANAGER'].includes(String(u.role_code).toUpperCase()));
    // An administrator receives the flag when HR has not been appointed yet. Never silently drop it.
    const recipients = hr.length ? hr : users.filter(u => ['SUPER_ADMIN', 'ADMIN'].includes(String(u.role_code).toUpperCase()));
    for (const user of recipients) {
      if (await db.findOne('workforce_activity_notices', { user_id: user.id, event_id: event.id })) continue;
      await db.insert('workforce_activity_notices', { company_id: companyId, user_id: user.id, event_id: event.id, title: 'Staff activity needs review', body: event.kind === 'connection_lost' ? 'No app activity for 10 minutes; connection was lost. Confirm with the staff member.' : 'No app interaction for 10 minutes. Review the staff member’s context.', read_at: null, created_at: iso(Date.now()) });
    }
  },
  async processDue(actor, now = Date.now()) {
    if (db.isCloud) return db.rpc('workforce_activity_process_due', { p_company_id: Number(actor.company_id) });
    return db.transaction(async () => {
      for (const user of await db.find('users', { company_id: Number(actor.company_id) })) await this.processUser(user, now);
      for (const event of await db.find('workforce_activity_events', { company_id: Number(actor.company_id) })) if (!event.reviewed_at) await this.deliver(actor.company_id, event);
    });
  },
  async reports(actor) {
    const { user } = await this.identity(actor);
    if (!this.canReview(user)) fail('Only HR and authorized managers can review activity.', 403);
    await this.processDue(actor);
    const [events, employees] = await Promise.all([
      db.find('workforce_activity_events', { company_id: Number(actor.company_id) }, { order: { column: 'detected_at', ascending: false }, limit: 200 }),
      db.find('employees', { company_id: Number(actor.company_id) })
    ]);
    return events.map(e => { const employee = employees.find(p => Number(p.id) === Number(e.employee_id)); return { ...e, employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Staff member', department: employee?.department || '', duration_seconds: Math.max(600, Math.floor((Date.parse(e.ended_at || new Date().toISOString()) - Date.parse(e.last_activity_at)) / 1000)) }; });
  },
  async updateEvent(actor, eventId, input, review = false) {
    const { user } = await this.identity(actor);
    if (!Number.isSafeInteger(Number(eventId)) || Number(eventId) < 1) fail('Invalid activity event.');
    const event = await db.findById('workforce_activity_events', Number(eventId));
    if (!event || Number(event.company_id) !== Number(actor.company_id)) fail('Activity event not found.', 404);
    if (review ? !this.canReview(user) : Number(event.user_id) !== Number(user.id)) fail('You cannot update this activity event.', 403);
    if (review) return db.update('workforce_activity_events', event.id, { reviewed_at: iso(Date.now()), reviewed_by: actor.id });
    const reason = String(input.reason || '').trim(), details = String(input.reason_details || '').trim();
    if (!reason || reason.length > 100 || details.length > 2000) fail('Choose an activity category and keep the explanation under 2,000 characters.');
    return db.update('workforce_activity_events', event.id, { reason, reason_details: details, explained_at: iso(Date.now()) });
  },
  async notices(actor) {
    return db.find('workforce_activity_notices', { company_id: Number(actor.company_id), user_id: Number(actor.id) }, { order: { column: 'created_at', ascending: false }, limit: 100 });
  },
  async markRead(actor, id) {
    const notice = await db.findById('workforce_activity_notices', Number(id));
    if (!notice || Number(notice.user_id) !== Number(actor.id) || Number(notice.company_id) !== Number(actor.company_id)) fail('Notification not found.', 404);
    return db.update('workforce_activity_notices', notice.id, { read_at: iso(Date.now()) });
  }
};
