import { randomUUID } from 'node:crypto';
import { db } from '../config/database.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (value, max, required = true) => {
  const result = String(value ?? '').trim();
  if ((required && !result) || result.length > max) fail(`Enter ${required ? 'a value' : 'text'} of up to ${max} characters.`);
  return result;
};
const ids = value => {
  if (!Array.isArray(value) || value.length > 100) fail('Choose up to 100 people.');
  const result = [...new Set(value.map(Number))];
  if (result.some(id => !Number.isSafeInteger(id) || id < 1)) fail('Invalid person selected.');
  return result;
};
const date = value => {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) fail('Use a valid date with a time zone.');
  return new Date(value).toISOString();
};
const safePerson = user => ({ id: user.id, full_name: user.full_name, role_code: user.role_code });
const states = ['todo', 'in_progress', 'review', 'done'];

export const collaborationService = {
  async people(user) {
    return (await db.find('users', { company_id: Number(user.company_id), status: 'active' })).map(safePerson).sort((a,b) => a.full_name.localeCompare(b.full_name));
  },
  async access(user, projectId, lead = false) {
    const project = await db.findById('collaboration_projects', Number(projectId));
    if (!project || Number(project.company_id) !== Number(user.company_id)) fail('Project not found.', 404);
    const members = await db.find('collaboration_members', { project_id: project.id });
    const member = members.find(m => Number(m.user_id) === Number(user.id));
    if (!member) fail('You are not a member of this project.', 403);
    const canManage = Number(project.owner_id) === Number(user.id) || member.role === 'lead';
    if (lead && !canManage) fail('Only the project owner or a lead can manage the team.', 403);
    return { project, members, canManage };
  },
  async create(user, input) {
    const data = { name: text(input.name, 100), description: text(input.description, 1500, false), color: /^#[a-f0-9]{6}$/i.test(input.color || '') ? input.color : '#f97316', member_ids: ids(input.member_ids || []) };
    const people = await this.people(user);
    if (data.member_ids.some(id => !people.some(p => Number(p.id) === id))) fail('Every member must be active and in your company.');
    if (db.isCloud) return db.rpc('collaboration_create_project', { p_actor_id: user.id, p_company_id: user.company_id, p_data: data });
    return db.transaction(async () => {
      const project = await db.insert('collaboration_projects', { company_id: user.company_id, owner_id: user.id, name: data.name, description: data.description, color: data.color, status: 'active' });
      for (const id of [...new Set([Number(user.id), ...data.member_ids])]) await db.insert('collaboration_members', { company_id: user.company_id, project_id: project.id, user_id: id, role: id === Number(user.id) ? 'owner' : 'member' });
      await db.insert('collaboration_channels', { company_id: user.company_id, project_id: project.id, name: 'general', description: 'The place for team updates and decisions.', created_by: user.id });
      return project;
    });
  },
  async overview(user) {
    await this.processDue(user);
    const memberships = await db.find('collaboration_members', { company_id: Number(user.company_id), user_id: Number(user.id) });
    const all = await db.find('collaboration_projects', { company_id: Number(user.company_id) });
    const projects = all.filter(p => memberships.some(m => Number(m.project_id) === Number(p.id)));
    const notices = await db.find('collaboration_notices', { company_id: Number(user.company_id), user_id: Number(user.id) }, { order: { column: 'created_at', ascending: false }, limit: 100 });
    return { projects, notices };
  },
  async detail(user, projectId) {
    const access = await this.access(user, projectId);
    const people = await this.people(user);
    const filter = { project_id: Number(projectId), company_id: Number(user.company_id) };
    const [channels, tasks, events] = await Promise.all([db.find('collaboration_channels', filter), db.find('collaboration_tasks', filter), db.find('collaboration_events', filter, { order: { column: 'created_at', ascending: false }, limit: 30 })]);
    return { ...access, members: access.members.map(m => ({ ...m, person: people.find(p => Number(p.id) === Number(m.user_id)) || { id: m.user_id, full_name: 'Former team member' } })), channels, tasks, events };
  },
  async messages(user, projectId, channelId, query = {}) {
    await this.access(user, projectId);
    const channel = await db.findById('collaboration_channels', Number(channelId));
    if (!channel || Number(channel.project_id) !== Number(projectId)) fail('Channel not found.', 404);
    // Bound database reads as well as the response, including on large channels.
    const filter = { project_id: Number(projectId), channel_id: Number(channelId), company_id: Number(user.company_id) };
    for (const key of ['after','before']) if (query[key] && (!Number.isSafeInteger(Number(query[key])) || Number(query[key]) < 1)) fail('Invalid message cursor.');
    const ascending = Boolean(query.after);
    const rows = await db.find('collaboration_messages', filter, { order: { column: 'id', ascending }, limit: 100, gt: query.after ? { id: Number(query.after) } : {}, lt: query.before ? { id: Number(query.before) } : {} });
    return ascending ? rows : rows.reverse();
  },
  async write(user, projectId, action, input) {
    // Validation and local writes share one transaction. PostgreSQL repeats the
    // authorization checks under a project lock for every hosted mutation.
    return db.transaction(async () => {
      const access = await this.access(user, projectId, ['members', 'channel'].includes(action));
      const base = { company_id: Number(user.company_id), project_id: Number(projectId) };
      let data;
      if (action === 'members') {
        data = { user_ids: ids(input.user_ids || []), role: input.role === 'lead' ? 'lead' : 'member' };
        if (data.role === 'lead' && Number(access.project.owner_id) !== Number(user.id)) fail('Only the project owner can appoint a lead.', 403);
        const people = await this.people(user);
        if (!data.user_ids.length || data.user_ids.some(id => !people.some(p => Number(p.id) === id))) fail('Choose active people in your company.');
      } else if (action === 'channel') {
        const name = text(input.name, 60).toLowerCase().replace(/\s+/g, '-');
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) fail('Use letters, numbers, dashes or underscores for channel names.');
        data = { name, description: text(input.description, 300, false), created_by: user.id };
        if ((await db.find('collaboration_channels', base)).some(c => c.name === name)) fail('That channel already exists.');
      } else if (action === 'message') {
        const channel = await db.findById('collaboration_channels', Number(input.channel_id));
        if (!channel || Number(channel.project_id) !== Number(projectId)) fail('Channel not found.', 404);
        const parent = input.parent_id ? await db.findById('collaboration_messages', Number(input.parent_id)) : null;
        if (input.parent_id && (!parent || Number(parent.channel_id) !== Number(channel.id) || parent.parent_id)) fail('Reply to an existing top-level message in this channel.');
        const content = text(input.body, 4000);
        const mentionIds = [...content.matchAll(/@\[[^\]]+\]\(user:(\d+)\)/g)].map(match => Number(match[1]));
        if (mentionIds.some(id => !access.members.some(m => Number(m.user_id) === id))) fail('Mentioned people must be members of this project.');
        const nonce = input.client_nonce || randomUUID();
        if (!/^[\w-]{12,80}$/.test(nonce)) fail('Invalid message identifier.');
        data = { channel_id: channel.id, parent_id: parent?.id || null, user_id: user.id, body: content, client_nonce: nonce, mention_ids: [...new Set(mentionIds)] };
      } else if (action === 'task') {
        const assignees = ids(input.assignee_ids || []);
        if (!assignees.length || assignees.some(id => !access.members.some(m => Number(m.user_id) === id))) fail('Assign at least one project member.');
        const due = date(input.due_at), scheduled = date(input.scheduled_at), remind = date(input.remind_at);
        if (due && scheduled && due < scheduled) fail('The due time must be after the scheduled start.');
        if (remind && due && remind > due) fail('The reminder must be at or before the due time.');
        if (!['none', 'daily', 'weekly'].includes(input.recurrence || 'none')) fail('Invalid recurrence.');
        if (input.recurrence && input.recurrence !== 'none' && !due) fail('Recurring tasks require a due time.');
        data = { title: text(input.title, 180), description: text(input.description, 4000, false), assignee_ids: assignees, scheduled_at: scheduled, due_at: due, remind_at: remind || due, recurrence: input.recurrence || 'none', priority: ['low','normal','high','urgent'].includes(input.priority) ? input.priority : 'normal', status: 'todo', created_by: user.id, version: 1, series_id: randomUUID(), origin_task_id: null };
      } else if (action === 'status') {
        const task = await db.findById('collaboration_tasks', Number(input.task_id));
        if (!task || Number(task.project_id) !== Number(projectId)) fail('Task not found.', 404);
        if (!access.canManage && !task.assignee_ids?.map(Number).includes(Number(user.id))) fail('Only an assignee or project lead can update this task.', 403);
        if (!states.includes(input.status)) fail('Invalid task status.');
        if (Number(input.version) !== Number(task.version)) fail('This task changed. Refresh and try again.', 409);
        if (task.status === 'done' && input.status !== 'done' && task.recurrence !== 'none') fail('A completed recurring occurrence cannot be reopened.');
        data = { task_id: task.id, status: input.status, version: task.version, next: null };
        if (task.status !== 'done' && input.status === 'done' && task.recurrence !== 'none') {
          const interval = (task.recurrence === 'weekly' ? 7 : 1) * 86400000;
          const steps = Math.max(1, Math.floor((Date.now() - Date.parse(task.due_at)) / interval) + 1);
          const shift = value => value ? new Date(Date.parse(value) + interval * steps).toISOString() : null;
          const { id, created_at, updated_at, completed_at, ...copy } = task;
          data.next = { ...copy, status: 'todo', version: 1, origin_task_id: task.id, scheduled_at: shift(task.scheduled_at), due_at: shift(task.due_at), remind_at: shift(task.remind_at) };
        }
      } else fail('Unknown project action.');
      if (db.isCloud) return db.rpc('collaboration_commit', { p_actor_id: user.id, p_company_id: user.company_id, p_project_id: Number(projectId), p_action: action, p_data: data });
      if (action === 'members') {
        for (const id of data.user_ids) {
          const old = access.members.find(m => Number(m.user_id) === id);
          if (!old) await db.insert('collaboration_members', { ...base, user_id: id, role: data.role });
          else if (Number(access.project.owner_id) !== id) await db.update('collaboration_members', old.id, { role: data.role });
        }
      } else if (action === 'channel') return db.insert('collaboration_channels', { ...base, ...data });
      else if (action === 'message') {
        const existing = await db.findOne('collaboration_messages', { ...base, user_id: user.id, client_nonce: data.client_nonce });
        if (existing) return existing;
        const { mention_ids, ...message } = data;
        const created = await db.insert('collaboration_messages', { ...base, ...message });
        for (const id of mention_ids.filter(id => id !== Number(user.id))) await this.notice({ ...base, user_id: id, source_key: `mention:${created.id}`, title: 'You were mentioned', body: data.body.slice(0, 300), kind: 'mention' });
        return created;
      } else if (action === 'task') {
        const task = await db.insert('collaboration_tasks', { ...base, ...data });
        for (const id of data.assignee_ids) await this.notice({ ...base, user_id: id, task_id: task.id, source_key: `assigned:${task.id}`, title: 'Task assigned', body: task.title, kind: 'assigned' });
        return task;
      } else if (action === 'status') {
        const task = await db.update('collaboration_tasks', data.task_id, { status: data.status, version: data.version + 1, completed_at: data.status === 'done' ? new Date().toISOString() : null, updated_at: new Date().toISOString() });
        if (data.next && !await db.findOne('collaboration_tasks', { origin_task_id: data.task_id })) await db.insert('collaboration_tasks', { ...base, ...data.next });
        await db.insert('collaboration_events', { ...base, user_id: user.id, body: `${task.title} → ${data.status.replace('_',' ')}` });
        return task;
      }
      return { success: true };
    });
  },
  async notice(data) {
    const existing = await db.findOne('collaboration_notices', { user_id: data.user_id, source_key: data.source_key });
    return existing || db.insert('collaboration_notices', { ...data, read_at: null });
  },
  async processDue(user = null, now = new Date()) {
    if (db.isCloud) return db.rpc('collaboration_process_due', { p_user_id: user?.id || null, p_now: now.toISOString() });
    return db.transaction(async () => {
      const tasks = await db.find('collaboration_tasks');
      for (const task of tasks) {
        if (task.status === 'done' || !task.remind_at || Date.parse(task.remind_at) > now.getTime()) continue;
        const members = await db.find('collaboration_members', { project_id: task.project_id });
        for (const id of task.assignee_ids || []) {
          if (user && (Number(id) !== Number(user.id) || Number(task.company_id) !== Number(user.company_id))) continue;
          if (!members.some(m => Number(m.user_id) === Number(id))) continue;
          await this.notice({ company_id: task.company_id, project_id: task.project_id, task_id: task.id, user_id: id, source_key: `reminder:${task.id}`, kind: 'reminder', title: 'Task reminder', body: task.title });
        }
      }
      return { success: true };
    });
  },
  async markRead(user, noticeId) {
    const row = await db.findById('collaboration_notices', Number(noticeId));
    if (!row || Number(row.user_id) !== Number(user.id) || Number(row.company_id) !== Number(user.company_id)) fail('Notification not found.', 404);
    return db.update('collaboration_notices', row.id, { read_at: new Date().toISOString() });
  }
};
