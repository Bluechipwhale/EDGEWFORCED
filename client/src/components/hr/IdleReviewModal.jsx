import React from 'react';
import Modal from '../common/Modal';
import { Activity, Clock, User, CheckCircle2 } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/formatters';

export default function IdleReviewModal({ alert, isOpen, onClose }) {
  if (!alert) return null;

  return (
    <Modal
      title="Inactivity Telemetry Review"
      subtitle="10-Minute workstation idle monitoring report"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        <div className="p-3.5 rounded-xl surface-card-subtle border border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Employee:</span>
            <b className="text-zinc-900 dark:text-zinc-100">
              {alert.employee ? `${alert.employee.first_name} ${alert.employee.last_name}` : `Staff #${alert.employee_id}`}
            </b>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Department:</span>
            <span>{alert.employee?.department || 'Operations'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Idle Start Time:</span>
            <span>{formatDate(alert.started_at)} • {formatTime(alert.started_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Duration:</span>
            <b className="text-orange-500">{Math.round(alert.duration_seconds / 60)} Minutes</b>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Reason Selected by Employee
          </label>
          <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-800 dark:text-zinc-200">
            {alert.reason || 'Break / Field Work'}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Detailed Explanation Provided
          </label>
          <div className="p-3 rounded-lg surface-card border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
            "{alert.explanation || alert.reason || 'No additional explanation entered.'}"
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>Non-invasive monitoring verified. No keystrokes or screens recorded.</span>
        </div>

        <button onClick={onClose} className="btn-primary w-full">
          Acknowledge & Close Review
        </button>
      </div>
    </Modal>
  );
}
