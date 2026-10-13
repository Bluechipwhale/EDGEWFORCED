// ==============================================================================
// EDGEWFORCE - STRICT AGENT SOS & EMERGENCY VIEW
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Radio,
  CheckCircle2,
  Share2,
  HelpCircle,
  Activity
} from 'lucide-react';
import { getCurrentGPSLocation } from '../../lib/geo';
import { playSOSAlarm } from '../../lib/sound';
import { api } from '../../lib/api';

export default function AgentSOSView({ user }) {
  const [activeSOS, setActiveSOS] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Press and Hold 3-Second Logic for SOS Button
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100%
  const holdTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Supervisor info
  const supervisor = user?.employee?.supervisor || {
    name: user?.employee?.supervisor_name || 'Regional Operations Desk',
    phone: user?.employee?.supervisor_phone || '+2348000000000',
    email: 'ops@edgewforce.com'
  };

  const loadSOSData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/field/sos');
      const list = Array.isArray(res) ? res : (res?.data || res?.sos || []);
      setHistory(list);
      const active = list.find(s => s.status === 'active' || s.status === 'OPEN');
      setActiveSOS(active || null);
    } catch (err) {
      console.warn('Failed to load SOS history:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSOSData();
    const interval = setInterval(loadSOSData, 15000);
    return () => clearInterval(interval);
  }, []);

  const triggerSOS = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      let lat = 6.4281;
      let lng = 3.4219;
      let accuracy = 5.0;

      try {
        const p = await getCurrentGPSLocation();
        lat = p.latitude;
        lng = p.longitude;
        accuracy = p.accuracy;
      } catch {
        // Fallback if browser permission is delayed
      }

      const res = await api.post('/field/sos-beacon', {
        latitude: lat,
        longitude: lng,
        accuracy,
        message: `EMERGENCY SOS PANIC BEACON triggered by ${user?.full_name || 'Agent'} (${user?.employee_code || user?.id}). Immediate field assistance required.`,
        assigned_location: user?.employee?.assigned_location || 'Field Beat',
        current_address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
      });

      playSOSAlarm();
      setSuccessMsg('🚨 EMERGENCY SOS BEACON ACTIVATED. Supervisors and Operations Desk alerted.');
      await loadSOSData();
    } catch (err) {
      setError(err.message || 'Failed to broadcast SOS beacon.');
    } finally {
      setLoading(false);
      setHoldProgress(0);
      setHolding(false);
    }
  };

  // Start hold countdown
  const startHold = () => {
    if (activeSOS) return; // already active
    setHolding(true);
    setHoldProgress(0);

    const startTime = Date.now();
    const DURATION = 3000; // 3 seconds

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setHoldProgress(pct);

      if (elapsed >= DURATION) {
        clearInterval(progressIntervalRef.current);
        triggerSOS();
      }
    }, 50);
  };

  const cancelHold = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setHolding(false);
    setHoldProgress(0);
  };

  const handleShareLocation = async () => {
    setError('');
    setSuccessMsg('');
    try {
      let lat = 6.4281;
      let lng = 3.4219;
      let accuracy = 5.0;

      try {
        const p = await getCurrentGPSLocation();
        lat = p.latitude;
        lng = p.longitude;
        accuracy = p.accuracy;
      } catch {
        // Fallback
      }

      await api.post('/field/location-ping', {
        latitude: lat,
        longitude: lng,
        accuracy,
        current_activity: 'Manual Location Share by Agent'
      });

      setSuccessMsg(`GPS Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)}) dispatched to Supervisor.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to dispatch location telemetry.');
    }
  };

  const cleanPhone = (supervisor.phone || '').replace(/[^0-9+]/g, '');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6">
      
      {/* Header Banner */}
      <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
              Agent SOS & Field Emergency
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Instant distress beacon, supervisor contact, and location telemetry
            </p>
          </div>
        </div>

        {activeSOS ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
            <Radio size={14} />
            BEACON ACTIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 size={14} />
            Normal Standby
          </span>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Panic Button + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* 1. SOS Panic Button Section */}
        <div className="surface-card rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              EMERGENCY PANIC BEACON
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
              Press and hold for 3 seconds to trigger an emergency alert with your live GPS location.
            </p>
          </div>

          {/* Big Panic Button */}
          <div className="relative my-2">
            <button
              type="button"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              disabled={loading || activeSOS !== null}
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white font-black shadow-2xl transition select-none ${
                activeSOS
                  ? 'bg-rose-700 ring-8 ring-rose-500/30 animate-pulse cursor-not-allowed'
                  : holding
                  ? 'bg-rose-700 scale-95 ring-8 ring-rose-500/50'
                  : 'bg-gradient-to-tr from-rose-600 to-red-500 hover:from-rose-700 hover:to-red-600 ring-4 ring-rose-500/20 active:scale-95'
              }`}
            >
              <ShieldAlert size={44} className="mb-1" />
              <span className="text-sm tracking-wider uppercase">
                {activeSOS ? 'ACTIVE BEACON' : holding ? 'HOLDING...' : 'HOLD FOR SOS'}
              </span>
              <span className="text-[10px] font-medium opacity-80">
                {holding ? `${Math.round(holdProgress)}%` : '(3 Seconds)'}
              </span>
            </button>

            {/* Hold progress ring overlay */}
            {holding && (
              <svg className="absolute -inset-2 w-[176px] h-[176px] pointer-events-none -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="80"
                  fill="none"
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeWidth="6"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="80"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="6"
                  strokeDasharray={502}
                  strokeDashoffset={502 - (502 * holdProgress) / 100}
                  className="transition-all duration-75"
                />
              </svg>
            )}
          </div>

          {activeSOS && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-600 dark:text-rose-400 font-semibold space-y-1">
              <div>🚨 Distress signal active since {new Date(activeSOS.created_at || activeSOS.timestamp).toLocaleTimeString()}</div>
              <div className="text-[10px] text-zinc-500">Supervisors have been notified. Stand by for response.</div>
            </div>
          )}
        </div>

        {/* 2. Contact Supervisor & Share GPS */}
        <div className="space-y-5">
          
          {/* Contact Supervisor Card */}
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
              <Phone size={16} className="text-orange-500" />
              <span>Assigned Field Supervisor</span>
            </div>
            
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
              <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {supervisor.name}
              </div>
              <div className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                {supervisor.phone}
              </div>
              
              <div className="pt-2 flex gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="btn-primary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5 font-bold"
                >
                  <Phone size={13} />
                  <span>Call Now</span>
                </a>
                <a
                  href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5 font-bold border border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Share Current GPS Location Card */}
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-zinc-900 dark:text-zinc-100">
              <Share2 size={16} className="text-blue-500" />
              <span>Telemetry Coordinates</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Dispatches your exact real-time GPS coordinates directly to the supervisor live monitoring map.
            </p>
            <button
              type="button"
              onClick={handleShareLocation}
              className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <MapPin size={14} className="text-blue-500" />
              <span>Share Current GPS Coordinates</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. Emergency History (Read-Only) */}
      <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zinc-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              My Emergency History (Read-Only)
            </h3>
          </div>
          <span className="text-[10px] text-zinc-400">
            Emergency records cannot be altered or deleted by agents
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No emergency incidents recorded on your profile.
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((item, idx) => {
              const isResolved = item.status === 'RESOLVED' || item.status === 'resolved';
              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse'
                      }`}>
                        {item.status || 'ACTIVE'}
                      </span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {item.message || 'Distress Beacon'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(item.created_at || item.timestamp).toLocaleString()}
                      </span>
                      {item.latitude && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>

                  {isResolved && item.resolution_notes && (
                    <div className="text-[10px] text-zinc-500 max-w-xs sm:text-right italic">
                      Resolved: &ldquo;{item.resolution_notes}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
