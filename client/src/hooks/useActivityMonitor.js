import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

// Only interaction counts are transmitted: never typed text, screenshots or device activity.
export function useActivityMonitor(userId) {
  const clientId = useRef(null);
  const sequence = useRef(0);
  const lastInput = useRef(0);
  const busy = useRef(false);
  const inFlight = useRef(null);
  const mounted = useRef(false);
  const dismissed = useRef(new Set());
  const [status, setStatus] = useState('connecting');
  const [event, setEvent] = useState(null);

  const send = useCallback(async (stop = false) => {
    if (stop && inFlight.current) await inFlight.current.catch(() => {});
    if (!clientId.current || busy.current) return;
    busy.current = true;
    const id = clientId.current;
    try {
      inFlight.current = api.post('/activity/heartbeat', { client_id: id, sequence: sequence.current, stop }, { requireOnline: true, signal: AbortSignal.timeout(8000) });
      const response = await inFlight.current;
      if (mounted.current && clientId.current === id && !stop) {
        setStatus(response.enabled ? 'connected' : 'disabled');
        if (response.event && !dismissed.current.has(response.event.id)) setEvent(response.event);
      }
    } catch {
      if (mounted.current && !stop) setStatus('disconnected');
    } finally { busy.current = false; inFlight.current = null; }
  }, []);

  useEffect(() => {
    if (!userId) return;
    mounted.current = true;
    clientId.current = crypto.randomUUID();
    sequence.current = 0;
    dismissed.current = new Set();
    setStatus('connecting');
    const input = e => {
      // Ignore synthetic DOM events. Do not send anything about which key was pressed.
      if (!e.isTrusted || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastInput.current >= 1000) { sequence.current += 1; lastInput.current = now; }
    };
    const reconnect = () => { send(); };
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(name => window.addEventListener(name, input, { passive: true, capture: true }));
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', reconnect);
    send();
    const interval = setInterval(() => send(), 30000);
    return () => {
      mounted.current = false;
      events.forEach(name => window.removeEventListener(name, input, { capture: true }));
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', reconnect);
      clearInterval(interval);
    };
  }, [userId, send]);

  const explain = async (reason, details) => {
    if (!event) return;
    await api.post(`/activity/events/${event.id}/explain`, { reason, reason_details: details }, { requireOnline: true });
    dismissed.current.add(event.id);
    setEvent(null);
    sequence.current += 1;
    await send();
  };
  const dismiss = () => { if (event) dismissed.current.add(event.id); setEvent(null); };
  return { status, event, explain, dismiss, stop: () => send(true) };
}
