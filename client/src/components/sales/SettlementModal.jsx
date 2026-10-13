import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Award, AlertCircle, FileText } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { api } from '../../lib/api';

export default function SettlementModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    expected_amount: '',
    amount: '',
    deposit_reference: '',
    notes: ''
  });

  const [slipFile, setSlipFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const expectedNum = Number(form.expected_amount || 0);
  const actualNum = Number(form.amount || 0);
  const difference = actualNum - expectedNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount) {
      setError('Please specify the actual deposited cash amount.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('amount', form.amount);
      fd.append('expected_amount', form.expected_amount || form.amount);
      fd.append('deposit_reference', form.deposit_reference);
      fd.append('notes', form.notes);
      if (slipFile) fd.append('bank_slip', slipFile);

      await api.post('/sales/settlements', fd);
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="End-of-Day Cash Reconciliation & Settlement"
      subtitle="Submit daily cash collections, bank deposit slips & audit variance"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Expected Cash Collected (₦)
            </label>
            <input
              type="number"
              placeholder="e.g. 150000"
              className="form-input"
              value={form.expected_amount}
              onChange={(e) => setForm({ ...form, expected_amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Actual Bank Deposit Amount (₦) *
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 150000"
              className="form-input"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Bank Deposit Reference / Teller #
            </label>
            <input
              type="text"
              placeholder="e.g. GTB-DEP-99881234"
              className="form-input"
              value={form.deposit_reference}
              onChange={(e) => setForm({ ...form, deposit_reference: e.target.value })}
            />
          </div>
        </div>

        {/* Auto Variance Calculation */}
        {form.expected_amount && form.amount && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
            difference === 0
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : (difference > 0 ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20')
          }`}>
            <span>Reconciliation Variance:</span>
            <span>
              {difference === 0
                ? 'Balanced (₦0.00 Difference)'
                : (difference > 0 ? `+${formatMoney(difference)} (Surplus)` : `${formatMoney(difference)} (Shortage)`)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Bank Deposit Slip / Proof of Payment (Image/PDF)
          </label>
          <div className="flex items-center gap-3">
            <label className="btn-secondary text-xs cursor-pointer">
              <FileText size={15} />
              <span>Choose Deposit Slip</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
              />
            </label>
            {slipFile && <span className="text-xs text-zinc-500">{slipFile.name}</span>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
            Settlement Notes
          </label>
          <textarea
            rows="2"
            placeholder="Additional notes for accounting audit..."
            className="form-input"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {/* Submit */}
        <div className="pt-3 flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Submitting Settlement…' : 'Submit for Finance Approval'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
