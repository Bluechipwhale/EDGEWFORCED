import React, { useState } from 'react';
import Modal from '../common/Modal';
import { ClipboardList, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

export default function TaskAssignModal({ employees = [], isOpen, onClose, onAssigned }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Normal',
    due_date: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.assigned_to) {
      setError('Please provide task title and assign to a staff member.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/hr/tasks', form);
      onAssigned?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Assign Hierarchical Task"
      subtitle="Assign workforce directives respecting authority rank"
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

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Task Directive Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Conduct Prince Ebeano Lekki Q3 Stock Audit"
            className="form-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Assign To (Subordinate / Team Member) *
          </label>
          <select
            required
            className="form-input"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
          >
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} — {emp.rank_code || emp.rank?.name} ({emp.department})
              </option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Priority Level
            </label>
            <select
              className="form-input"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option>Urgent</option>
              <option>High</option>
              <option>Normal</option>
              <option>Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Due Date
            </label>
            <input
              type="date"
              className="form-input"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Task Description & Operational Instructions
          </label>
          <textarea
            rows="3"
            placeholder="Specify deliverables, evidence requirements, and timelines..."
            className="form-input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Assigning Directive…' : 'Assign Task Directive'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
