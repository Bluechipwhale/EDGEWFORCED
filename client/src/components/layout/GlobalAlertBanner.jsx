import React from 'react';
import { ShieldAlert, AlertTriangle, ArrowRight, X } from 'lucide-react';

export default function GlobalAlertBanner({ alert, onAction, onDismiss, onResolveSOS }) {
  if (!alert) return null;

  const isSOS = alert.type === 'SOS' || alert.isSOS;

  return (
    <div className={`w-full py-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold transition-all ${
      isSOS
        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-lg border-b-2 border-red-800'
        : 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-b border-amber-500/30'
    }`}>
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
        {isSOS ? <ShieldAlert size={20} className="text-white shrink-0 animate-bounce" /> : <AlertTriangle size={18} className="text-amber-500 shrink-0" />}
        <div>
          <span className="font-extrabold mr-1">{alert.title}:</span>
          <span className="font-normal opacity-90">{alert.message || alert.body}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isSOS && alert.sosId && (
          <button
            onClick={() => onResolveSOS ? onResolveSOS(alert) : onAction?.({ ...alert, actionType: 'resolve' })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-black bg-white text-red-700 hover:bg-emerald-50 hover:text-emerald-700 shadow-md transition"
            title="Stop Panic Beacon & Mark Field Agent Safe"
          >
            <span>Stop & Resolve SOS Beacon</span>
          </button>
        )}

        {alert.actionText && onAction && (
          <button
            onClick={() => onAction(alert)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold shadow-sm transition ${
              isSOS
                ? 'bg-red-900/60 text-white hover:bg-red-900 border border-white/20'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            <span>{alert.actionText}</span>
            <ArrowRight size={12} />
          </button>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="p-1 hover:opacity-70 text-inherit"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
