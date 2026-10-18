import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import { api } from '../../lib/api';

export default function ActivityReviewPanel() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(null);
  const load = async () => {
    try { setEvents(await api.get('/activity/reports', { requireOnline: true })); setError(''); setLoaded(true); }
    catch (err) { setError(err.message); }
  };
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, []);
  const review = async id => {
    setBusy(id);
    try { await api.post(`/activity/events/${id}/review`, {}); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(null); }
  };
  const visible = events.filter(e => filter === 'all' || !e.reviewed_at);
  const pending = events.filter(e => !e.reviewed_at).length;
  return (
    <section className="surface-card rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden" aria-label="Staff activity review">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="p-2 rounded-xl bg-orange-500/10 text-orange-600"><Activity size={20} /></span><div><h3 className="font-bold">Staff activity review <span className="ml-1 text-orange-600">{pending}</span></h3><p className="text-xs text-zinc-500 mt-1">10-minute app inactivity flags · checked every minute</p></div></div>
        <div className="flex gap-2"><button onClick={() => setFilter(filter === 'pending' ? 'all' : 'pending')} className="text-xs font-semibold px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">{filter === 'pending' ? 'Show history' : 'Needs review'}</button><button aria-label="Refresh activity reports" className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800" onClick={load}><RefreshCw size={16} /></button></div>
      </div>
      <p className="px-5 pt-4 text-xs text-zinc-500 leading-relaxed">A flag records app interaction only. Meetings, reading, field work and connection issues can explain a gap. Confirm the context with staff before taking action.</p>
      {error && <p role="alert" className="m-4 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm">{error}</p>}
      {!visible.length && <div className="p-8 text-center text-sm text-zinc-500"><CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={24} />{!loaded ? 'Loading activity reports…' : filter === 'pending' ? 'No activity flags awaiting review.' : 'No activity flags recorded yet.'}</div>}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{visible.map(e => <article key={e.id} className="p-5 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{e.employee_name}</strong><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${e.kind === 'connection_lost' ? 'bg-zinc-500/10 text-zinc-500' : 'bg-amber-500/10 text-amber-600'}`}>{e.kind === 'connection_lost' ? <><WifiOff size={10} className="inline mr-1" />Connection lost · unconfirmed</> : 'No app interaction'}</span>{e.ended_at && <span className="text-[10px] text-emerald-600">Period closed</span>}</div>
        <p className="text-xs text-zinc-500 mt-2">{e.department || 'Staff'} · {new Date(e.detected_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} WAT · {Math.floor(e.duration_seconds / 60)} min</p>
        <p className="text-xs mt-2 break-words">{e.reason ? <><strong>{e.reason}</strong>{e.reason_details ? ` — ${e.reason_details}` : ''}</> : 'Awaiting staff explanation'}</p>
        </div><div className="shrink-0">{e.reviewed_at ? <span className="text-xs text-emerald-600 flex gap-1 items-center"><CheckCircle2 size={14} />Reviewed</span> : <button disabled={busy === e.id} onClick={() => review(e.id)} className="btn-primary text-xs">{busy === e.id ? 'Saving…' : 'Mark reviewed'}</button>}</div>
      </article>)}</div>
      {events.length === 200 && <p className="p-4 text-xs text-zinc-500">Showing the latest 200 activity events.</p>}
    </section>
  );
}
