import React, { useCallback, useEffect, useState } from 'react';
import { Clock, AlertCircle, MapPin, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { api } from '../../lib/api';
import { getCurrentGPSLocation } from '../../lib/geo';

export default function AttendanceControl({ onRecorded }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');
  const refresh = useCallback(async () => {
    try {
      const value = await api.get('/field/shifts/window-status');
      setStatus(value);
      setLoadError('');
    } catch (err) {
      setStatus(null);
      setLoadError(err.message);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [refresh]);
  const record = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const gps = await getCurrentGPSLocation();
      const result = await api.post('/employee/attendance/clock', { ...gps, device: navigator.userAgent });
      setMessage(result.message || (result.clock_out_time ? 'Clocked out successfully.' : 'Attendance recorded successfully.'));
      await onRecorded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      await refresh();
      setBusy(false);
    }
  };
  const windows = [
    { label: 'Morning', hours: '6 AM – noon', type: 'MORNING_ATTENDANCE', done: status?.morning_recorded },
    { label: 'Midday', hours: 'Noon – 4:30 PM', type: 'MIDDAY_ATTENDANCE', done: status?.midday_recorded },
    { label: 'Clock-out', hours: '4:30 PM – midnight', type: 'EVENING_CLOCK_OUT', done: status?.evening_recorded }
  ];
  const isClockOut = status?.window_info?.action_type === 'CLOCK_OUT';
  return (
    <section aria-label="Today's attendance" className="w-full max-w-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2"><Clock size={16} className="text-orange-500" /> Today's attendance</span>
        <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">{status?.lagos_time?.formatted12h || '—'} <span className="text-[10px]">Lagos</span></span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {windows.map(window => {
          const active = status?.window_info?.attendance_type === window.type && status?.window_info?.allowed;
          return <div key={window.type} className={`rounded-xl border p-2.5 ${window.done ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : active ? 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
            <div className="flex items-center justify-between gap-1 font-bold">{window.label}{window.done && <CheckCircle2 size={13} aria-label="Recorded" />}</div>
            <div className="mt-1 text-[10px] leading-relaxed">{window.hours}</div>
          </div>;
        })}
      </div>
      <button type="button" onClick={record} disabled={busy || !status?.can_record} className="btn-primary w-full min-h-11 text-xs py-3 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
        {busy ? <Loader2 size={16} className="animate-spin" /> : isClockOut ? <LogOut size={16} /> : <MapPin size={16} />}{busy ? 'Verifying your location…' : status?.button_label || 'Checking attendance…'}
      </button>
      <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{status?.action_message || (loadError ? 'Attendance is unavailable. Reconnect to try again.' : 'Checking the current attendance window…')}</p>
      <p className="text-zinc-500 dark:text-zinc-400 flex items-start gap-1.5 leading-relaxed"><MapPin size={13} className="shrink-0 mt-0.5" />{status?.assigned_locations?.map(location => location.name).filter(Boolean).join(' · ') || 'No assigned workplace'} · GPS verification required</p>
      {message && <p role="status" className="text-emerald-600 dark:text-emerald-400">{message}</p>}
      {(error || loadError) && <p role="alert" className="text-rose-600 dark:text-rose-400 flex items-start gap-2 whitespace-pre-line"><AlertCircle size={15} className="shrink-0" />{error || loadError}</p>}
    </section>
  );
}
