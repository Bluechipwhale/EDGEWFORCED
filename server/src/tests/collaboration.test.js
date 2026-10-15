import test from 'node:test';
import assert from 'node:assert/strict';
import { db, resetTestData } from './helpers/database.js';
import { collaborationService as service } from '../services/collaborationService.js';

test('Project collaboration preserves tenant privacy, shared work and scheduling', async (t) => {
  await resetTestData();
  const owner = await db.findById('users', 1),
    member = await db.findById('users', 2),
    outsider = await db.findById('users', 3);
  const foreign = await db.insert('users', {
    company_id: 2,
    full_name: 'Foreign Test User',
    status: 'active',
    email: 'outside@example.test',
  });
  let project, channel, root, task;
  await t.test(
    'Any active staff user can create a private team project',
    async () => {
      project = await service.create(owner, {
        name: 'Launch',
        description: 'Shared work',
        member_ids: [member.id],
      });
      const detail = await service.detail(member, project.id);
      channel = detail.channels[0];
      assert.equal(detail.members.length, 2);
      assert.equal(detail.canManage, false);
      assert.deepEqual((await service.overview(outsider)).projects, []);
      await assert.rejects(
        service.detail(outsider, project.id),
        /not a member/,
      );
      await assert.rejects(service.detail(foreign, project.id), /not found/);
    },
  );
  await t.test(
    'Project ownership controls membership and channels',
    async () => {
      await assert.rejects(
        service.write(member, project.id, 'members', {
          user_ids: [outsider.id],
        }),
        /owner or a lead/,
      );
      await assert.rejects(
        service.write(owner, project.id, 'members', { user_ids: [foreign.id] }),
        /in your company/,
      );
      await service.write(owner, project.id, 'members', {
        user_ids: [outsider.id],
        role: 'lead',
      });
      const newChannel = await service.write(outsider, project.id, 'channel', {
        name: 'Launch Planning',
      });
      assert.equal(newChannel.name, 'launch-planning');
      await assert.rejects(
        service.write(outsider, project.id, 'members', {
          user_ids: [member.id],
          role: 'lead',
        }),
        /Only the project owner/,
      );
    },
  );
  await t.test(
    'Messages retry idempotently, support mentions and stay in their channel',
    async () => {
      const body = `Update for @[Colleague](user:${member.id})`;
      root = await service.write(owner, project.id, 'message', {
        channel_id: channel.id,
        body,
        client_nonce: 'message-test-0001',
      });
      const retry = await service.write(owner, project.id, 'message', {
        channel_id: channel.id,
        body,
        client_nonce: 'message-test-0001',
      });
      assert.equal(retry.id, root.id);
      assert.equal((await db.find('collaboration_messages')).length, 1);
      assert.equal(
        (await service.overview(member)).notices.filter(
          (n) => n.kind === 'mention',
        ).length,
        1,
      );
      const thread = await service.write(member, project.id, 'message', {
        channel_id: channel.id,
        parent_id: root.id,
        body: 'Acknowledged',
        client_nonce: 'message-test-0002',
      });
      assert.equal(thread.parent_id, root.id);
      await assert.rejects(
        service.write(member, project.id, 'message', {
          channel_id: channel.id,
          parent_id: thread.id,
          body: 'Nested',
          client_nonce: 'message-test-0003',
        }),
        /top-level/,
      );
      await assert.rejects(
        service.write(owner, project.id, 'message', {
          channel_id: channel.id,
          body: `@[External](user:${foreign.id})`,
        }),
        /must be members/,
      );
    },
  );
  await t.test(
    'Cursor pagination reaches messages beyond the newest 500',
    async () => {
      await db.transaction(async () => {
        for (let i = 0; i < 505; i++)
          await db.insert('collaboration_messages', {
            project_id: project.id,
            company_id: 1,
            channel_id: channel.id,
            user_id: owner.id,
            body: String(i),
            client_nonce: `pagination-${i}`,
          });
      });
      const recent = await service.messages(member, project.id, channel.id);
      assert.equal(recent.length, 100);
      let before = recent[0].id;
      for (let i = 0; i < 5; i++) {
        const older = await service.messages(member, project.id, channel.id, {
          before,
        });
        assert.ok(older.every((m) => m.id < before));
        if (older.length) before = older[0].id;
      }
      assert.equal(before, root.id);
    },
  );
  await t.test(
    'Shared tasks require project members and valid time zones',
    async () => {
      await assert.rejects(
        service.write(owner, project.id, 'task', { title: 'No assignee' }),
        /at least one/,
      );
      await assert.rejects(
        service.write(owner, project.id, 'task', {
          title: 'External',
          assignee_ids: [foreign.id],
        }),
        /project member/,
      );
      await assert.rejects(
        service.write(owner, project.id, 'task', {
          title: 'Bad date',
          assignee_ids: [member.id],
          due_at: '2026-10-15T10:00',
        }),
        /time zone/,
      );
      task = await service.write(owner, project.id, 'task', {
        title: 'Daily briefing',
        assignee_ids: [member.id],
        recurrence: 'daily',
        due_at: '2026-10-15T09:00:00+01:00',
        remind_at: '2026-10-15T08:45:00+01:00',
      });
      assert.equal(task.due_at, '2026-10-15T08:00:00.000Z');
    },
  );
  await t.test(
    'Concurrent status edits detect stale versions and recurrence creates once',
    async () => {
      const result = await Promise.allSettled(
        [1, 2].map(() =>
          service.write(member, project.id, 'status', {
            task_id: task.id,
            status: 'done',
            version: task.version,
          }),
        ),
      );
      assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(result.filter((r) => r.status === 'rejected').length, 1);
      const next = await db.find('collaboration_tasks', {
        origin_task_id: task.id,
      });
      assert.equal(next.length, 1);
      assert.ok(Date.parse(next[0].due_at) > Date.now());
    },
  );
  await t.test(
    'Reminder delivery is persistent, user-scoped and idempotent',
    async () => {
      const due = await service.write(owner, project.id, 'task', {
        title: 'Due now',
        assignee_ids: [owner.id, member.id],
        due_at: '2026-10-15T09:00:00Z',
      });
      await Promise.all([
        service.processDue(member, new Date('2026-10-16T10:00:00Z')),
        service.processDue(member, new Date('2026-10-16T10:00:00Z')),
      ]);
      const notes = await db.find('collaboration_notices', {
        source_key: `reminder:${due.id}`,
      });
      assert.equal(notes.length, 1);
      assert.equal(notes[0].user_id, member.id);
      await assert.rejects(service.markRead(owner, notes[0].id), /not found/);
      await service.markRead(member, notes[0].id);
      assert.ok(
        (await db.findById('collaboration_notices', notes[0].id)).read_at,
      );
    },
  );
});
