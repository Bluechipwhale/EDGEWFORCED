// ==============================================================================
// EDGEWFORCE - DAILY MORNING CHECK-IN PROMPT
// "Good morning 👋 What do you need to be reminded about today?"
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Sun, Sparkles, X, Plus, Clock, Send, ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';

export function DailyReminderPrompt({ user, onOpenTaskModal, onTaskCreated }) {
  const [visible, setVisible] = useState(false);
  const [customText, setCustomText] = useState('');
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState('');

  const todayStr = new Date().toISOString().slice(0, 10);
  const storageKey = `ewf_daily_prompt_${user?.id}_${todayStr}`;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      // Show check-in if morning/afternoon
      setVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  };

  const handleQuickAdd = async (title, clientName) => {
    try {
      setQuickLoading(true);
      setError('');
      const dueTime = new Date(Date.now() + 3 * 3600000).toISOString();
      await api.post('/tasks', {
        title,
        client_name: clientName || null,
        assigned_to: user?.employee?.id || user?.id || 1,
        priority: 'high',
        task_type: clientName ? 'delivery' : 'general',
        due_at: dueTime,
        channels: ['in_app', 'email', 'whatsapp', 'push']
      });
      handleDismiss();
      onTaskCreated?.();
    } catch (err) {
      setError(err.message || 'The reminder could not be saved.');
    } finally {
      setQuickLoading(false);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    await handleQuickAdd(customText.trim(), '');
    setCustomText('');
  };

  if (!visible) return null;

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Team Member';

  return (
    <div className="surface-card rounded-2xl p-5 border border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent relative overflow-hidden shadow-lg space-y-3 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30">
            <Sun size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">
              Good morning, {firstName} 👋
            </h3>
            <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
              What deliverable or milestone do you need to be reminded about today?
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-1"
          title="Dismiss for today"
        >
          <X size={16} />
        </button>
      </div>

      {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
      {/* Quick Reminder Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => handleQuickAdd('Submit project report', '')}
          disabled={quickLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 text-zinc-800 dark:text-zinc-200 transition shadow-sm flex items-center gap-1.5"
        >
          <Sparkles size={12} className="text-orange-500" />
          <span>Project Report</span>
        </button>

        <button
          onClick={() => handleQuickAdd('Follow up assigned task', '')}
          disabled={quickLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 text-zinc-800 dark:text-zinc-200 transition shadow-sm flex items-center gap-1.5"
        >
          <Sparkles size={12} className="text-orange-500" />
          <span>Task Follow-up</span>
        </button>

        <button
          onClick={() => handleQuickAdd('Key Account Daily Sales Order Summary', 'Internal Operations')}
          disabled={quickLoading}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-orange-500 text-zinc-800 dark:text-zinc-200 transition shadow-sm flex items-center gap-1.5"
        >
          <Sparkles size={12} className="text-orange-500" />
          <span>Daily Sales Summary</span>
        </button>
      </div>

      {/* Custom Quick Input */}
      <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Or type a custom deliverable or reminder..."
          className="form-input text-xs py-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
        />
        <button
          type="submit"
          disabled={quickLoading || !customText.trim()}
          className="btn-primary text-xs py-2 px-3 bg-orange-500 text-white font-bold whitespace-nowrap flex items-center gap-1"
        >
          <Send size={12} />
          <span>Set Reminder</span>
        </button>
      </form>
    </div>
  );
}
