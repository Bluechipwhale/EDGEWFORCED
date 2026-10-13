import React, { useState } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  ShieldAlert,
  ClipboardList,
  Clock,
  Calendar,
  WalletCards,
  MapPin,
  Sparkles
} from 'lucide-react';
import { formatDate, formatTime } from '../../lib/formatters';

export default function NotificationCenter({
  isOpen,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead
}) {
  const [filter, setFilter] = useState('All');

  if (!isOpen) return null;

  const categories = ['All', 'Tasks', 'Attendance', 'HR', 'Sales', 'Field', 'SOS', 'System'];

  const filtered = notifications.filter(n => {
    if (filter === 'All') return true;
    return n.type?.toLowerCase() === filter.toLowerCase();
  });

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'sos':
      case 'emergency':
        return <ShieldAlert size={16} className="text-red-500" />;
      case 'tasks':
        return <ClipboardList size={16} className="text-blue-500" />;
      case 'attendance':
        return <Clock size={16} className="text-amber-500" />;
      case 'leave':
      case 'hr':
        return <Calendar size={16} className="text-emerald-500" />;
      case 'sales':
      case 'payment':
        return <WalletCards size={16} className="text-orange-500" />;
      case 'field':
        return <MapPin size={16} className="text-indigo-500" />;
      default:
        return <Sparkles size={16} className="text-zinc-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md surface-card border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-orange-500" />
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Notification Center
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMarkAllRead}
                title="Mark all as read"
                className="p-1.5 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 rounded-lg flex items-center gap-1 font-semibold transition"
              >
                <CheckCheck size={14} />
                <span>Mark All Read</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition ${
                  filter === cat
                    ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="p-3 overflow-y-auto flex-1 space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => onMarkRead?.(item.id)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  item.read
                    ? 'surface-card opacity-60 border-zinc-200 dark:border-zinc-800'
                    : 'surface-card-subtle border-orange-500/30 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                      {item.body}
                    </p>
                    <div className="mt-2 text-[10px] text-zinc-400 font-medium">
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="p-8 text-center text-zinc-400 text-xs">
                No notifications in this category.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
