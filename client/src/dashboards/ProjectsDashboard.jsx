import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plus,
  Hash,
  MessageSquare,
  Users,
  LayoutGrid,
  CalendarDays,
  ArrowRight,
  Send,
  Search,
  Check,
  X,
  Clock,
  Bell,
  ChevronLeft,
  Activity,
  Repeat2,
  Loader2,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import Modal from '../components/common/Modal';
import { api } from '../lib/api';

const states = [
  ['todo', 'To do'],
  ['in_progress', 'In progress'],
  ['review', 'In review'],
  ['done', 'Done'],
];
const initials = (name) =>
  String(name || '?')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const stamp = (value) =>
  value
    ? new Date(value).toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'No due date';
const localISO = (value) =>
  value ? new Date(value + ':00+01:00').toISOString() : null;
function Avatar({ person, small = false }) {
  return (
    <span
      title={person?.full_name}
      className={`${small ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs'} shrink-0 rounded-xl bg-orange-500/10 border border-orange-500/15 text-orange-700 dark:text-orange-300 inline-flex items-center justify-center font-bold`}
    >
      {initials(person?.full_name)}
    </span>
  );
}
function MessageBody({ body }) {
  return (
    <span className="whitespace-pre-wrap break-words">
      {String(body)
        .split(/(@\[[^\]]+\]\(user:\d+\))/g)
        .map((part, i) =>
          /^@\[/.test(part) ? (
            <span
              key={i}
              className="rounded bg-orange-500/10 text-orange-700 dark:text-orange-300 px-1"
            >
              @{part.match(/^@\[([^\]]+)/)?.[1]}
            </span>
          ) : (
            part
          ),
        )}
    </span>
  );
}

function ProjectForm({ people, onSave }) {
  const [members, setMembers] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const data = new FormData(e.currentTarget);
        try {
          await onSave({
            name: data.get('name'),
            description: data.get('description'),
            color: data.get('color'),
            member_ids: members,
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-xs font-semibold space-y-2">
        Project name
        <input
          autoFocus
          name="name"
          required
          maxLength={100}
          className="form-input"
          placeholder="e.g. Product launch"
        />
      </label>
      <label className="block text-xs font-semibold space-y-2">
        What are you working towards?
        <textarea
          name="description"
          maxLength={1500}
          className="form-input min-h-20"
          placeholder="Give the team a clear goal and a little context."
        />
      </label>
      <label className="block text-xs font-semibold space-y-2">
        Project colour
        <input
          name="color"
          type="color"
          defaultValue="#f97316"
          className="block w-12 h-9 rounded-lg"
        />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold mb-2">
          Bring your people together
        </legend>
        <div className="max-h-52 overflow-y-auto grid gap-2 sm:grid-cols-2">
          {people.map((p) => (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${members.includes(p.id) ? 'border-orange-500/40 bg-orange-500/5' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <input
                type="checkbox"
                checked={members.includes(p.id)}
                onChange={(e) =>
                  setMembers((old) =>
                    e.target.checked
                      ? [...old, p.id]
                      : old.filter((id) => id !== p.id),
                  )
                }
              />
              <Avatar person={p} small />
              <span className="text-xs">{p.full_name}</span>
            </label>
          ))}
        </div>
        {!people.length && (
          <p className="text-xs text-zinc-500">
            You can add colleagues after their accounts are created.
          </p>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
      <button disabled={busy} className="btn-primary w-full min-h-11">
        {busy ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} />
        )}
        Create project
      </button>
    </form>
  );
}
function TaskForm({ members, onSave }) {
  const [assignees, setAssignees] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const d = new FormData(e.currentTarget);
        try {
          await onSave({
            title: d.get('title'),
            description: d.get('description'),
            assignee_ids: assignees,
            priority: d.get('priority'),
            scheduled_at: localISO(d.get('scheduled_at')),
            due_at: localISO(d.get('due_at')),
            remind_at: localISO(d.get('remind_at')),
            recurrence: d.get('recurrence'),
          });
        } catch (err) {
          setError(err.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-xs font-semibold space-y-2">
        Task title
        <input
          autoFocus
          required
          name="title"
          maxLength={180}
          className="form-input"
          placeholder="What needs to happen?"
        />
      </label>
      <label className="block text-xs font-semibold space-y-2">
        Details
        <textarea
          name="description"
          maxLength={4000}
          className="form-input"
          placeholder="Add context, links or acceptance criteria."
        />
      </label>
      <fieldset>
        <legend className="text-xs font-semibold mb-2">
          Work on this together
        </legend>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <label
              key={m.user_id}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer ${assignees.includes(m.user_id) ? 'border-orange-400 bg-orange-500/10' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <input
                type="checkbox"
                checked={assignees.includes(m.user_id)}
                onChange={(e) =>
                  setAssignees((old) =>
                    e.target.checked
                      ? [...old, m.user_id]
                      : old.filter((id) => id !== m.user_id),
                  )
                }
              />
              {m.person.full_name}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-[11px] text-zinc-500">
        All dates and times below use Africa/Lagos.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          ['scheduled_at', 'Scheduled start'],
          ['due_at', 'Due date & time'],
          ['remind_at', 'Reminder (optional)'],
        ].map(([name, label]) => (
          <label key={name} className="block text-xs font-semibold space-y-2">
            {label}
            <input type="datetime-local" name={name} className="form-input" />
          </label>
        ))}
        <label className="block text-xs font-semibold space-y-2">
          Priority
          <select name="priority" defaultValue="normal" className="form-input">
            {['low', 'normal', 'high', 'urgent'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold space-y-2">
          Repeat
          <select name="recurrence" className="form-input">
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed">
        A recurring task creates its next occurrence when completed. Missed
        intervals are skipped. Reminders default to the due time.
      </p>
      {error && (
        <p role="alert" className="text-xs text-rose-500">
          {error}
        </p>
      )}
      <button className="btn-primary w-full min-h-11" disabled={busy}>
        {busy ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <CalendarDays size={16} />
        )}
        Schedule task
      </button>
    </form>
  );
}

export default function ProjectsDashboard({ user }) {
  const [overview, setOverview] = useState({ projects: [], notices: [] }),
    [people, setPeople] = useState([]),
    [projectId, setProjectId] = useState(null),
    [detail, setDetail] = useState(null),
    [channelId, setChannelId] = useState(null),
    [messages, setMessages] = useState([]);
  const [view, setView] = useState('channels'),
    [search, setSearch] = useState(''),
    [modal, setModal] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [reply, setReply] = useState(null),
    [drafts, setDrafts] = useState({}),
    [sending, setSending] = useState(false),
    [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0),
    messageGeneration = useRef(0),
    pending = useRef({}),
    sendLock = useRef(false),
    messageList = useRef(null),
    tail = useRef(null);
  const refreshOverview = useCallback(async () => {
    const data = await api.get('/collaboration/overview');
    setOverview(data);
    return data;
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.all([api.get('/collaboration/people'), refreshOverview()])
      .then(([p]) => {
        if (alive) setPeople(p);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const timer = setInterval(() => {
      if (!document.hidden) refreshOverview().catch(() => {});
    }, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshOverview]);
  const loadProject = useCallback(async (id, gen) => {
    const data = await api.get(`/collaboration/projects/${id}`);
    if (generation.current !== gen) return;
    setDetail(data);
    setChannelId((old) =>
      data.channels.some((c) => c.id === old)
        ? old
        : data.channels[0]?.id || null,
    );
  }, []);
  useEffect(() => {
    const gen = ++generation.current;
    setDetail(null);
    setChannelId(null);
    setMessages([]);
    setReply(null);
    if (!projectId) return;
    loadProject(projectId, gen).catch((e) => setError(e.message));
    const timer = setInterval(() => {
      if (!document.hidden) loadProject(projectId, gen).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [projectId, loadProject]);
  useEffect(() => {
    const gen = ++messageGeneration.current;
    setMessages([]);
    setReply(null);
    if (!projectId || !channelId) return;
    let cursor = 0,
      active = true;
    const load = async () => {
      const rows = await api.get(
        `/collaboration/projects/${projectId}/channels/${channelId}/messages${cursor ? '?after=' + cursor : ''}`,
      );
      if (!active || messageGeneration.current !== gen) return;
      const stick =
        !cursor ||
        !messageList.current ||
        messageList.current.scrollHeight -
          messageList.current.scrollTop -
          messageList.current.clientHeight <
          100;
      setMessages((old) => [
        ...old,
        ...rows.filter((m) => !old.some((o) => o.id === m.id)),
      ]);
      if (rows.length) cursor = Math.max(cursor, ...rows.map((m) => m.id));
      if (stick)
        requestAnimationFrame(() => {
          const list = messageList.current;
          if (list) list.scrollTop = list.scrollHeight;
        });
    };
    load().catch((e) => setError(e.message));
    const timer = setInterval(() => {
      if (!document.hidden && view === 'channels') load().catch(() => {});
    }, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId, channelId, view]);
  const reload = async () => {
    setRefreshing(true);
    setError('');
    try {
      await refreshOverview();
      if (projectId) await loadProject(projectId, generation.current);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };
  const write = async (action, data) => {
    const result = await api.post(
      `/collaboration/projects/${projectId}/${action}`,
      data,
    );
    await loadProject(projectId, generation.current);
    await refreshOverview();
    return result;
  };
  const draftKey = `${projectId}:${channelId}:${reply?.id || 'main'}`,
    draft = drafts[draftKey] || '';
  const send = async () => {
    if (sendLock.current || !draft.trim()) return;
    sendLock.current = true;
    setSending(true);
    setError('');
    const currentKey = draftKey,
      gen = messageGeneration.current;
    const nonce = (pending.current[currentKey] ||= crypto.randomUUID());
    try {
      const row = await api.post(
        `/collaboration/projects/${projectId}/message`,
        {
          channel_id: channelId,
          parent_id: reply?.id || null,
          body: draft,
          client_nonce: nonce,
        },
      );
      if (messageGeneration.current === gen)
        setMessages((old) =>
          old.some((m) => m.id === row.id)
            ? old
            : [...old, row].sort((a, b) => a.id - b.id),
        );
      setDrafts((old) => ({
        ...old,
        [currentKey]: old[currentKey] === draft ? '' : old[currentKey],
      }));
      delete pending.current[currentKey];
      requestAnimationFrame(() => {
        const list = messageList.current;
        if (list) list.scrollTop = list.scrollHeight;
      });
    } catch (e) {
      setError(e.message);
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };
  const person = (id) =>
    detail?.members.find((m) => Number(m.user_id) === Number(id))?.person || {
      full_name: 'Team member',
    };
  const channel = detail?.channels.find((c) => c.id === channelId),
    tasks = (detail?.tasks || []).filter((t) =>
      `${t.title} ${t.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  const unread = overview.notices.filter((n) => !n.read_at).length;
  const active = detail?.tasks.filter((t) => t.status !== 'done') || [],
    done = detail?.tasks.filter((t) => t.status === 'done').length || 0;
  const messageRows = messages.filter(
    (m) =>
      (reply ? m.id === reply.id || m.parent_id === reply.id : !m.parent_id) &&
      (!search || m.body.toLowerCase().includes(search.toLowerCase())),
  );
  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-bold text-orange-600 dark:text-orange-400">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            Your team, connected
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-1.5">
            Projects & teamspace
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            One place to talk, plan and make progress. Together.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('inbox')}
            className="btn-secondary min-h-11"
          >
            <Bell size={15} />
            Inbox
            {unread > 0 && (
              <span className="bg-orange-500 text-white rounded-full px-1.5 text-[10px]">
                {unread}
              </span>
            )}
          </button>
          <button
            className="btn-primary min-h-11"
            onClick={() => setModal('project')}
          >
            <Plus size={16} />
            New project
          </button>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400"
        >
          <span>{error}</span>
          <button
            onClick={reload}
            disabled={refreshing}
            className="font-bold shrink-0"
          >
            {refreshing ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {loading ? (
        <div className="surface-card rounded-2xl p-14 flex flex-col gap-3 items-center text-zinc-500">
          <Loader2 className="animate-spin" />
          <p className="text-xs">Opening your teamspace…</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-5 min-w-0">
          <aside className="hidden lg:block surface-card rounded-2xl p-3 space-y-4 self-start">
            <div className="px-2 pt-2 flex items-center justify-between text-[10px] font-bold tracking-widest uppercase text-zinc-500">
              <span>Your projects</span>
              <span>{overview.projects.length}</span>
            </div>
            <div className="space-y-1">
              {overview.projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProjectId(p.id);
                    setView('channels');
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 text-left text-xs font-semibold transition ${projectId === p.id ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    <FolderKanban size={15} />
                  </span>
                  <span className="truncate">{p.name}</span>
                  {projectId === p.id && (
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
            {!overview.projects.length && (
              <p className="px-2 text-xs leading-relaxed text-zinc-500">
                Projects you create or join appear here.
              </p>
            )}
            <button
              onClick={() => setModal('project')}
              className="text-xs text-zinc-500 hover:text-orange-500 px-3 py-2 flex items-center gap-2"
            >
              <Plus size={14} />
              Create a project
            </button>
            {detail && (
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
                <div className="px-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    Channels
                  </span>
                  {detail.canManage && (
                    <button
                      aria-label="Create channel"
                      className="p-1"
                      onClick={() => setModal('channel')}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {detail.channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChannelId(c.id);
                      setView('channels');
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${channelId === c.id && view === 'channels' ? 'bg-zinc-100 dark:bg-zinc-800 font-bold' : 'text-zinc-500 hover:text-orange-500'}`}
                  >
                    <Hash size={14} />
                    {c.name}
                  </button>
                ))}
                <div className="px-2 pt-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                    The team
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {detail.members.map((m) => (
                      <Avatar key={m.id} person={m.person} small />
                    ))}
                  </div>
                  <button
                    onClick={() => setModal('members')}
                    className="text-xs mt-3 text-orange-600 dark:text-orange-400 flex items-center gap-1.5"
                  >
                    <Users size={13} />
                    {detail.members.length} people
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </aside>
          <section className="min-w-0 space-y-4">
            <div className="lg:hidden surface-card rounded-xl p-3 flex flex-wrap gap-3">
              <label className="flex-1 min-w-36 text-[10px] font-bold text-zinc-500">
                PROJECT
                <select
                  aria-label="Choose project"
                  value={projectId || ''}
                  className="form-input mt-1 text-xs"
                  onChange={(e) => {
                    setProjectId(Number(e.target.value) || null);
                    setView('channels');
                    setSearch('');
                  }}
                >
                  <option value="">Choose a project</option>
                  {overview.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              {detail && view === 'channels' && (
                <label className="flex-1 min-w-36 text-[10px] font-bold text-zinc-500">
                  CHANNEL
                  <select
                    aria-label="Choose channel"
                    value={channelId || ''}
                    className="form-input mt-1 text-xs"
                    onChange={(e) => setChannelId(Number(e.target.value))}
                  >
                    {detail.channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        # {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {view === 'inbox' ? (
              <div className="surface-card rounded-2xl p-5 space-y-4">
                <h2 className="font-bold flex items-center gap-2">
                  <Bell size={17} />
                  Your inbox
                </h2>
                <p className="text-xs text-zinc-500">
                  Mentions, assignments and scheduled reminders.
                </p>
                {!overview.notices.length && (
                  <div className="text-center py-16 text-zinc-500">
                    <Check
                      size={30}
                      className="mx-auto text-emerald-500 mb-3"
                    />
                    <p className="text-sm font-bold">You're all caught up.</p>
                    <p className="text-xs mt-2">
                      Your team's updates will arrive here.
                    </p>
                  </div>
                )}
                {overview.notices.map((n) => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      try {
                        await api.post(
                          `/collaboration/notices/${n.id}/read`,
                          {},
                        );
                        setProjectId(n.project_id);
                        setView(n.kind === 'mention' ? 'channels' : 'board');
                        await refreshOverview();
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                    className={`text-left w-full p-4 rounded-xl border flex gap-3 ${n.read_at ? 'border-zinc-200 dark:border-zinc-800' : 'border-orange-500/25 bg-orange-500/5'}`}
                  >
                    <span className="w-2 h-2 mt-1 rounded-full shrink-0 bg-orange-400" />
                    <div>
                      <div className="text-xs font-bold">{n.title}</div>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-2">
                        {stamp(n.created_at)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : !projectId ? (
              <div className="surface-card rounded-3xl relative overflow-hidden p-7 sm:p-12">
                <div className="absolute -right-24 -top-24 w-72 h-72 bg-orange-500/5 rounded-full pointer-events-none" />
                <span className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-8">
                  <Sparkles size={26} />
                </span>
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-orange-500">
                  Great work starts with a team
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-md mt-3 leading-tight">
                  A shared space.
                  <br />A bigger possibility.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Bring the right people into a project. Keep conversations,
                  decisions and the next steps in one place.
                </p>
                <button
                  onClick={() => setModal('project')}
                  className="btn-primary min-h-11 mt-7"
                >
                  Create your first project
                  <ArrowRight size={16} />
                </button>
                <div className="grid sm:grid-cols-3 gap-5 mt-12 pt-7 border-t border-zinc-200 dark:border-zinc-800">
                  {[
                    [
                      MessageSquare,
                      'Talk in channels',
                      'Keep every conversation in context.',
                    ],
                    [
                      LayoutGrid,
                      'Move work forward',
                      'Shared tasks, owners and clear priorities.',
                    ],
                    [
                      CalendarDays,
                      'Plan ahead',
                      'Start dates, due dates and repeat schedules.',
                    ],
                  ].map(([Icon, title, desc]) => (
                    <div key={title}>
                      <Icon size={19} className="text-orange-500 mb-3" />
                      <h3 className="font-bold text-xs">{title}</h3>
                      <p className="text-[11px] leading-relaxed text-zinc-500 mt-2">
                        {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : !detail ? (
              <div className="surface-card rounded-2xl p-16 text-center text-zinc-500">
                <Loader2 className="animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="surface-card rounded-2xl p-5">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h2 className="font-extrabold text-xl flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: detail.project.color }}
                        />
                        {detail.project.name}
                      </h2>
                      <p className="text-xs leading-relaxed text-zinc-500 mt-2 max-w-xl">
                        {detail.project.description ||
                          'Your shared space for this project.'}
                      </p>
                    </div>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => setModal('members')}
                    >
                      <Users size={14} />
                      Members
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-5">
                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-3">
                      <div className="text-xl font-extrabold">
                        {active.length}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Active tasks
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-3">
                      <div className="text-xl font-extrabold">{done}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Completed
                      </div>
                    </div>
                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/60 p-3">
                      <div className="text-xl font-extrabold">
                        {detail.members.length}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Teammates
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 gap-1">
                    {[
                      ['channels', MessageSquare, 'Chat'],
                      ['board', LayoutGrid, 'Board'],
                      ['schedule', CalendarDays, 'Schedule'],
                      ['activity', Activity, 'Activity'],
                    ].map(([id, Icon, label]) => (
                      <button
                        key={id}
                        onClick={() => {
                          setView(id);
                          setSearch('');
                        }}
                        aria-pressed={view === id}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold flex items-center gap-1.5 ${view === id ? 'bg-white dark:bg-zinc-800 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-zinc-500'}`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setModal('task')}
                    className="btn-primary text-xs"
                  >
                    <Plus size={14} />
                    New task
                  </button>
                </div>
                {view !== 'activity' && (
                  <label className="surface-card rounded-xl px-3 py-2 flex gap-2 items-center text-zinc-400">
                    <Search size={15} />
                    <input
                      aria-label={
                        view === 'channels'
                          ? 'Search loaded messages'
                          : 'Search project tasks'
                      }
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={
                        view === 'channels'
                          ? 'Search loaded messages…'
                          : 'Find a task…'
                      }
                      className="bg-transparent outline-none w-full text-xs py-1 text-zinc-700 dark:text-zinc-200"
                    />
                  </label>
                )}
                {view === 'channels' && (
                  <div className="surface-card rounded-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                      <Hash size={18} className="text-orange-500" />
                      <div>
                        <h3 className="text-sm font-bold break-all">
                          {channel?.name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {channel?.description || 'A space for the team.'}
                        </p>
                      </div>
                      <span className="hidden sm:inline ml-auto text-[10px] text-zinc-500 shrink-0">
                        Syncs automatically
                      </span>
                    </div>
                    {reply && (
                      <div className="bg-orange-500/5 px-5 py-3 flex items-center justify-between text-xs">
                        <span className="font-bold">Thread</span>
                        <button
                          onClick={() => setReply(null)}
                          className="flex items-center gap-1"
                        >
                          <ChevronLeft size={13} />
                          Back to channel
                        </button>
                      </div>
                    )}
                    <div
                      ref={messageList}
                      className="h-[min(48vh,480px)] min-h-64 overflow-y-auto p-4 sm:p-5 space-y-5"
                      aria-live="polite"
                      aria-label="Channel messages"
                    >
                      {messages.length >= 100 && (
                        <button
                          className="text-xs text-orange-500"
                          onClick={async () => {
                            try {
                              const older = await api.get(
                                `/collaboration/projects/${projectId}/channels/${channelId}/messages?before=${messages[0].id}`,
                              );
                              setMessages((old) => [
                                ...older.filter(
                                  (m) => !old.some((o) => o.id === m.id),
                                ),
                                ...old,
                              ]);
                            } catch (e) {
                              setError(e.message);
                            }
                          }}
                        >
                          Load earlier messages
                        </button>
                      )}
                      {!messageRows.length && (
                        <div className="text-center py-12 text-zinc-500">
                          <MessageSquare
                            size={28}
                            className="mx-auto text-orange-500/70 mb-4"
                          />
                          <p className="text-sm font-bold">
                            {search
                              ? 'No matching messages'
                              : 'Start the conversation'}
                          </p>
                          <p className="text-xs leading-relaxed mt-2">
                            {search
                              ? 'Search applies to messages loaded in this channel.'
                              : 'Share an update, ask a question or say hello to your team.'}
                          </p>
                        </div>
                      )}
                      {messageRows.map((m) => (
                        <article key={m.id} className="flex gap-3">
                          <Avatar person={person(m.user_id)} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-bold text-xs">
                                {person(m.user_id).full_name}
                              </span>
                              <time className="text-[10px] text-zinc-400">
                                {stamp(m.created_at)}
                              </time>
                            </div>
                            <div className="text-xs leading-6 mt-1 text-zinc-600 dark:text-zinc-300">
                              <MessageBody body={m.body} />
                            </div>
                            {!reply && !m.parent_id && (
                              <button
                                className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1 mt-1.5"
                                onClick={() => setReply(m)}
                              >
                                <MessageSquare size={11} />
                                {messages.filter((r) => r.parent_id === m.id)
                                  .length || ''}{' '}
                                Reply in thread
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                      <div ref={tail} />
                    </div>
                    <form
                      className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send();
                      }}
                    >
                      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 focus-within:border-orange-500/50 p-3">
                        <textarea
                          aria-label={
                            reply ? 'Reply to thread' : 'Message channel'
                          }
                          value={draft}
                          maxLength={4000}
                          onChange={(e) => {
                            setDrafts((old) => ({
                              ...old,
                              [draftKey]: e.target.value,
                            }));
                            if (!sending) delete pending.current[draftKey];
                          }}
                          placeholder={
                            reply
                              ? 'Write a reply…'
                              : `Message #${channel?.name || 'general'}…`
                          }
                          className="w-full bg-transparent outline-none resize-y text-xs min-h-14 leading-relaxed"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              e.preventDefault();
                              send();
                            }
                          }}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <select
                            aria-label="Mention a teammate"
                            className="text-[11px] bg-transparent text-zinc-500 max-w-40"
                            value=""
                            onChange={(e) => {
                              const p = person(e.target.value);
                              setDrafts((old) => ({
                                ...old,
                                [draftKey]:
                                  (old[draftKey] || '') +
                                  `@[${p.full_name}](user:${e.target.value}) `,
                              }));
                            }}
                          >
                            <option value="">@ Mention a teammate</option>
                            {detail.members.map((m) => (
                              <option key={m.user_id} value={m.user_id}>
                                {m.person.full_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            className="btn-primary text-xs disabled:opacity-40"
                          >
                            {sending ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Send size={14} />
                            )}
                            Send
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Ctrl / ⌘ + Enter to send · Your draft stays here when
                        you switch channels.
                      </p>
                    </form>
                  </div>
                )}
                {view === 'board' && (
                  <div className="grid sm:grid-cols-2 2xl:grid-cols-4 gap-3 items-start">
                    {states.map(([id, label]) => (
                      <div
                        key={id}
                        className="rounded-2xl bg-zinc-100/70 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-3 space-y-3"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold p-1">
                          <span
                            className={`w-2 h-2 rounded-full ${id === 'done' ? 'bg-emerald-500' : id === 'in_progress' ? 'bg-orange-500' : id === 'review' ? 'bg-violet-500' : 'bg-zinc-400'}`}
                          />
                          {label}
                          <span className="ml-auto text-zinc-400">
                            {tasks.filter((t) => t.status === id).length}
                          </span>
                        </div>
                        {tasks
                          .filter((t) => t.status === id)
                          .map((t) => (
                            <div
                              key={t.id}
                              className="surface-card rounded-xl p-4 space-y-3 shadow-sm"
                            >
                              <span
                                className={`text-[9px] uppercase tracking-wide font-bold px-2 py-1 rounded ${['urgent', 'high'].includes(t.priority) ? 'text-orange-600 bg-orange-500/10' : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}
                              >
                                {t.priority}
                              </span>
                              <h4 className="text-xs font-bold leading-relaxed">
                                {t.title}
                              </h4>
                              {t.description && (
                                <p className="text-[11px] text-zinc-500 leading-relaxed whitespace-pre-wrap">
                                  {t.description}
                                </p>
                              )}
                              <div
                                className={`text-[10px] flex items-center gap-1.5 ${t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done' ? 'text-rose-500' : 'text-zinc-500'}`}
                              >
                                <Clock size={12} />
                                {stamp(t.due_at)}
                                {t.recurrence !== 'none' && (
                                  <Repeat2 size={12} />
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {t.assignee_ids.map((uid) => (
                                  <Avatar
                                    key={uid}
                                    person={person(uid)}
                                    small
                                  />
                                ))}
                              </div>
                              <select
                                aria-label={`Status for ${t.title}`}
                                disabled={
                                  !detail.canManage &&
                                  !t.assignee_ids
                                    .map(Number)
                                    .includes(Number(user.id))
                                }
                                value={t.status}
                                className="form-input text-[11px]"
                                onChange={async (e) => {
                                  try {
                                    await write('status', {
                                      task_id: t.id,
                                      status: e.target.value,
                                      version: t.version,
                                    });
                                  } catch (err) {
                                    setError(err.message);
                                  }
                                }}
                              >
                                {states.map(([key, title]) => (
                                  <option key={key} value={key}>
                                    {title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        {!tasks.some((t) => t.status === id) && (
                          <div className="text-center text-[11px] text-zinc-400 py-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                            No tasks here yet
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {view === 'schedule' && (
                  <div className="surface-card rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold text-sm">
                        Your project schedule
                      </h3>
                      <span className="text-[10px] text-zinc-500">
                        Africa/Lagos
                      </span>
                    </div>
                    {!tasks.length && (
                      <p className="text-xs text-zinc-500 py-12 text-center">
                        Schedule your first task to give the team a clear next
                        step.
                      </p>
                    )}
                    {[...tasks]
                      .sort((a, b) =>
                        String(a.due_at || 'z').localeCompare(
                          String(b.due_at || 'z'),
                        ),
                      )
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-wrap items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800"
                        >
                          <span className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                            <CalendarDays size={18} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs">{t.title}</h4>
                            <div className="text-[11px] text-zinc-500 mt-1">
                              {t.scheduled_at &&
                                `Start ${stamp(t.scheduled_at)} · `}
                              Due {stamp(t.due_at)}
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-1">
                              {t.assignee_ids
                                .map((id) => person(id).full_name)
                                .join(', ')}
                              {t.recurrence !== 'none' &&
                                ` · Repeats ${t.recurrence}`}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {states.find(([id]) => id === t.status)?.[1]}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {view === 'activity' && (
                  <div className="surface-card rounded-2xl p-5 space-y-5">
                    <h3 className="font-bold text-sm">Project activity</h3>
                    {!detail.events.length && (
                      <p className="text-xs text-zinc-500 py-10 text-center">
                        Task updates will appear here as the team makes
                        progress.
                      </p>
                    )}
                    {detail.events.map((e) => (
                      <div key={e.id} className="flex gap-3">
                        <Avatar person={person(e.user_id)} small />
                        <div>
                          <div className="text-xs font-bold">
                            {person(e.user_id).full_name}
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{e.body}</p>
                          <time className="text-[10px] text-zinc-400">
                            {stamp(e.created_at)}
                          </time>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
      {modal === 'project' && (
        <Modal
          title="Make room for great work"
          subtitle="Create a project and bring your team into the conversation."
          onClose={() => setModal(null)}
        >
          <ProjectForm
            people={people.filter((p) => Number(p.id) !== Number(user.id))}
            onSave={async (data) => {
              const p = await api.post('/collaboration/projects', data);
              await refreshOverview();
              setProjectId(p.id);
              setView('channels');
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === 'task' && detail && (
        <Modal
          title="Plan the next step"
          subtitle="Clear ownership. Shared progress. Every date in Lagos time."
          onClose={() => setModal(null)}
        >
          <TaskForm
            members={detail.members}
            onSave={async (data) => {
              await write('task', data);
              setView('board');
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal === 'channel' && (
        <Modal
          title="Create a channel"
          subtitle="Keep a topic or workstream together."
          onClose={() => setModal(null)}
        >
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                const c = await write('channel', {
                  name: data.get('name'),
                  description: data.get('description'),
                });
                setChannelId(c.id);
                setView('channels');
                setModal(null);
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            <label className="block text-xs space-y-2">
              Channel name
              <input
                required
                name="name"
                className="form-input"
                maxLength={60}
                placeholder="e.g. launch-planning"
              />
            </label>
            <label className="block text-xs space-y-2">
              Description
              <input
                name="description"
                className="form-input"
                maxLength={300}
              />
            </label>
            <button className="btn-primary">Create channel</button>
            {error && (
              <p role="alert" className="text-xs text-rose-500">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {modal === 'members' && detail && (
        <Modal
          title="The people behind the project"
          subtitle="Only members can access this project's conversations and tasks."
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            {detail.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl p-3 bg-zinc-100 dark:bg-zinc-800/60"
              >
                <Avatar person={m.person} />
                <div className="text-xs font-semibold">
                  {m.person.full_name}
                </div>
                <span className="ml-auto text-[10px] text-zinc-500 uppercase">
                  {m.role}
                </span>
              </div>
            ))}
            {detail.canManage && (
              <form
                className="pt-4 space-y-3 border-t border-zinc-200 dark:border-zinc-800"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  try {
                    await write('members', {
                      user_ids: [Number(form.get('user_id'))],
                      role: form.get('role'),
                    });
                  } catch (err) {
                    setError(err.message);
                  }
                }}
              >
                <label className="block text-xs font-semibold space-y-2">
                  Add a colleague
                  <select name="user_id" required className="form-input">
                    <option value="">Choose a person</option>
                    {people
                      .filter(
                        (p) =>
                          !detail.members.some(
                            (m) => Number(m.user_id) === Number(p.id),
                          ),
                      )
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                  </select>
                </label>
                {Number(detail.project.owner_id) === Number(user.id) && (
                  <label className="block text-xs space-y-2">
                    Project role
                    <select name="role" className="form-input">
                      <option value="member">Member</option>
                      <option value="lead">Project lead</option>
                    </select>
                  </label>
                )}
                <button className="btn-primary">
                  <Plus size={14} />
                  Add to project
                </button>
                {error && (
                  <p role="alert" className="text-xs text-rose-500">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
