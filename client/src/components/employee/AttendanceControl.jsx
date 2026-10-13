import React, { useCallback, useEffect, useState } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
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
  return (
    <div className="space-y-2 text-xs max-w-xl">
      <button type="button" onClick={record} disabled={busy || !status?.can_record} className="btn-primary text-xs py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
        <Clock size={15} />{busy ? 'Verifying location…' : status?.button_label || 'Checking attendance…'}
      </button>
      <p className="text-zinc-500 dark:text-zinc-400">{status?.action_message} {status?.lagos_time?.formatted12h && `Lagos time: ${status.lagos_time.formatted12h}.`}</p>
      <p className="text-zinc-500 dark:text-zinc-400">Clock-in: 6 AM–noon and noon–4:30 PM. Clock-out: 4:30 PM–midnight. GPS must be within an assigned workplace.</p>
      {message && <p role="status" className="text-emerald-600 dark:text-emerald-400">{message}</p>}
      {(error || loadError) && <p role="alert" className="text-rose-600 dark:text-rose-400 flex items-start gap-2 whitespace-pre-line"><AlertCircle size={15} className="shrink-0" />{error || loadError}</p>}
    </div>
  );
}
