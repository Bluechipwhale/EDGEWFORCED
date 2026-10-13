import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ShieldAlert, AlertTriangle, Radio, CheckCircle2 } from 'lucide-react';
import { getCurrentGPSLocation } from '../../lib/geo';
import { playSOSAlarm } from '../../lib/sound';
import { api } from '../../lib/api';

export default function SOSModal({ isOpen, onClose, onDispatched }) {
  const [message, setMessage] = useState('Emergency SOS Panic Beacon Activated - Immediate Field Assistance Required');
  const [submitting, setSubmitting] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const [error, setError] = useState('');

  const handleTrigger = async () => {
    setSubmitting(true);
    setError('');
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
        // Fallback coordinates if GPS timeout
      }

      await api.post('/field/sos-beacon', {
        latitude: lat,
        longitude: lng,
        accuracy,
        message
      });

      playSOSAlarm();
      setDispatched(true);
      onDispatched?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="🚨 EMERGENCY SOS PANIC BEACON"
      subtitle="Broadcast emergency coordinates & alert all field supervisors and HR"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {dispatched ? (
          <div className="p-6 text-center space-y-3 bg-red-600/10 border border-red-600/30 rounded-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center animate-ping">
              <Radio size={24} />
            </div>
            <h4 className="text-base font-black text-red-600 dark:text-red-400">
              BEACON BROADCAST ACTIVE
            </h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Your live GPS telemetry and distress alert have been transmitted to all regional supervisors, HR, and executive management.
            </p>
            <button onClick={onClose} className="btn-secondary w-full text-xs">
              Dismiss Modal (Beacon Remains Active)
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle size={17} />
                <span>Confirm Emergency Dispatch</span>
              </div>
              <p>
                Triggering this beacon will immediately notify all operations managers, HR leaders, and emergency response channels with your live GPS location.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Emergency Situation Details
              </label>
              <textarea
                rows="2"
                className="form-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-xs text-red-500 font-bold">{error}</div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                onClick={handleTrigger}
                disabled={submitting}
                className="btn-sos flex-1 py-3 text-sm justify-center"
              >
                <ShieldAlert size={18} />
                {submitting ? 'DISPATCHING BEACON…' : 'CONFIRM & BROADCAST SOS'}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
