import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Calendar, AlertCircle } from 'lucide-react';
import { calculateClientDistance } from '../../lib/geo';
import { api } from '../../lib/api';

export default function LeaveApplyModal({ balances, isOpen, onClose, onApplied }) {
  const [form, setForm] = useState({
    leave_type: 'Annual',
    start_date: '',
    end_date: '',
    reason: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate working days excluding weekends
  const calculateWorkingDaysClient = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return 0;

    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const calculatedDays = calculateWorkingDaysClient(form.start_date, form.end_date);
  const availableBal = balances ? (balances[form.leave_type.toLowerCase()] ?? 0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason) {
      setError('Please select start date, end date, and provide a reason.');
      return;
    }
    if (calculatedDays <= 0) {
      setError('Selected date range has 0 working days.');
      return;
    }
    if (calculatedDays > availableBal) {
      setError(`Insufficient ${form.leave_type} balance. Available: ${availableBal} days, Requested: ${calculatedDays} days.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/employee/leave/request', form);
      onApplied?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Apply for Employee Leave"
      subtitle="Submit request with automated working days calculation"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Balance Chips */}
        <div className="grid grid-cols-3 gap-2">
          {['Annual', 'Sick', 'Casual'].map((type) => {
            const bal = balances ? (balances[type.toLowerCase()] ?? 0) : 0;
            const isSelected = form.leave_type === type;
            return (
              <button
                type="button"
                key={type}
                onClick={() => setForm({ ...form, leave_type: type })}
                className={`p-3 rounded-xl border text-left transition ${
                  isSelected
                    ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    : 'surface-card border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="text-[10px] font-bold uppercase text-zinc-500 dark:text-zinc-400">{type} Leave</div>
                <div className="text-xl font-black mt-1 text-zinc-900 dark:text-zinc-100">{bal}</div>
                <div className="text-[10px] text-zinc-400">days available</div>
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              className="form-input"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              End Date *
            </label>
            <input
              type="date"
              required
              className="form-input"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>

        {/* Calculated Days Banner */}
        {form.start_date && form.end_date && (
          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-between">
            <span>Calculated Working Days (Excl. Weekends):</span>
            <span className="text-sm font-black">{calculatedDays} Days</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Reason for Leave Application *
          </label>
          <textarea
            rows="3"
            required
            placeholder="Explain the purpose of your leave request for management review..."
            className="form-input"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={submitting || calculatedDays <= 0} className="btn-primary flex-1">
            {submitting ? 'Submitting…' : 'Submit Leave Request'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
