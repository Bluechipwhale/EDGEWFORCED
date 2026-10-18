import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, AlertCircle, MapPin, CheckCircle2, Loader2, LogOut, RefreshCw, Building2, Navigation } from 'lucide-react';
import { api } from '../../lib/api';
import { getCurrentGPSLocation } from '../../lib/geo';

export default function AttendanceControl({ onRecorded }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [readiness, setReadiness] = useState(null);
  const requestId = useRef(0);
  const actionLock = useRef(false);
  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const value = await api.get('/field/shifts/window-status', { requireOnline: true });
      if (id !== requestId.current) return;
      setStatus(value); setLoadError('');
    } catch (err) {
      if (id !== requestId.current) return;
      setStatus(null); setLoadError(err.message);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh); window.addEventListener('online', refresh);
    return () => { ++requestId.current; clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [refresh]);
  const run = async preflight => {
    if (actionLock.current) return;
    actionLock.current = true;
    preflight ? setChecking(true) : setBusy(true);
    setError(''); setMessage(''); setReadiness(null);
    try {
      const gps = await getCurrentGPSLocation();
      if (preflight) setReadiness(await api.post('/employee/attendance/verify-location', gps));
      else {
        const result = await api.post('/employee/attendance/clock', { ...gps, device: navigator.userAgent });
        setMessage(result.message || (result.clock_out_time ? 'You’re clocked out. Have a good rest.' : 'You’re clocked in. Have a great day.'));
        await refresh();
        try { await onRecorded?.(); } catch { /* Attendance is already saved; dashboard can refresh separately. */ }
      }
    } catch (err) { setError(err.message); }
    finally { await refresh(); setBusy(false); setChecking(false); actionLock.current = false; }
  };
  const windows = [
    { label: 'Morning', hours: '6 AM – noon', type: 'MORNING_ATTENDANCE', done: status?.morning_recorded },
    { label: 'Midday', hours: 'Noon – 4:30 PM', type: 'MIDDAY_ATTENDANCE', done: status?.midday_recorded },
    { label: 'Clock-out', hours: '4:30 PM – midnight', type: 'EVENING_CLOCK_OUT', done: status?.evening_recorded }
  ];
  const isClockOut = status?.window_info?.action_type === 'CLOCK_OUT';
  const locations = status?.assigned_locations || [];
  return (
    <section aria-label="Today's attendance" className="attendance-card w-full max-w-2xl rounded-3xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white dark:from-orange-500/10 dark:via-zinc-900 dark:to-zinc-900">
        <div className="flex justify-between gap-3 items-start"><div><p className="text-xs font-semibold tracking-widest uppercase text-orange-700 dark:text-orange-300 mb-2">Your daily rhythm</p><h2 className="text-xl font-bold tracking-tight">A good day starts here.</h2></div><span className="text-xs rounded-full bg-white/80 dark:bg-zinc-800 px-3 py-2 shrink-0 font-medium tabular-nums">{status?.lagos_time?.formatted12h || '—'} WAT</span></div>
        <div className="grid grid-cols-3 gap-2 mt-5">{windows.map(window => {
          const active = status?.window_info?.attendance_type === window.type && status?.window_info?.allowed;
          return <div key={window.type} className={`rounded-2xl border p-3 ${window.done ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : active ? 'border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-200' : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'}`}><div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">{window.done ? <CheckCircle2 size={14} aria-label="Recorded" /> : <Clock size={14} />}{window.label}</div><div className="text-[11px] mt-2 leading-relaxed">{window.hours}</div></div>;
        })}</div>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex gap-3 items-start"><span className="rounded-xl bg-zinc-100 dark:bg-zinc-800 p-2.5"><Building2 size={19} /></span><div className="min-w-0 flex-1"><p className="text-xs text-zinc-500 mb-1">Assigned workstation</p><p className="font-semibold text-sm break-words">{locations.map(l => l.name).join(' · ') || (status ? 'Waiting for a workstation' : 'Checking your assignment…')}</p><p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{locations.length ? 'Assignment connected. Your location is checked securely each time you clock.' : 'HR can assign an office, branch or another approved work location.'}</p></div><button onClick={refresh} aria-label="Refresh workstation and attendance" className="p-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"><RefreshCw size={16} /></button></div>
        <button type="button" onClick={() => run(true)} disabled={busy || checking || !locations.length} className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-sm font-semibold disabled:opacity-50"><Navigation size={16} />{checking ? 'Checking GPS…' : 'Check my workstation'}</button>
        {readiness && <p role="status" className={`text-sm rounded-xl p-3 leading-relaxed ${readiness.verified ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'}`}>{readiness.message} GPS accuracy: ±{Math.round(readiness.accuracy_meters)}m.</p>}
        <button type="button" onClick={() => run(false)} disabled={busy || checking || !status?.can_record} className="btn-primary w-full min-h-12 text-sm py-3.5 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed">{busy ? <Loader2 size={18} className="animate-spin" /> : isClockOut ? <LogOut size={18} /> : <MapPin size={18} />}{busy ? 'Verifying and saving…' : status?.button_label || 'Checking attendance…'}</button>
        <p className="text-xs text-zinc-500 leading-relaxed">{status?.action_message || (loadError ? 'Reconnect and refresh to see the current attendance status.' : 'Getting the current Lagos attendance window…')}</p>
        {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300 flex gap-2"><CheckCircle2 size={18} className="shrink-0" />{message}</p>}
        {(error || loadError) && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2 whitespace-pre-line"><AlertCircle size={17} className="shrink-0" />{error || loadError}</p>}
      </div>
    </section>
  );
}
