import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ShoppingCart,
  DollarSign,
  User,
  Building2,
  MessageSquare
} from 'lucide-react';
import { api } from '../../lib/api';

export default function OrderApprovalModal({ order, isOpen, onClose, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [action, setAction] = useState('approve'); // approve, reject, modify
  const [comments, setComments] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !order) return null;

  const handleProcess = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      if (action === 'approve') {
        await api.post(`/sales/orders/${order.id}/approve`, { comments });
      } else if (action === 'reject') {
        if (!comments) {
          setErrorMsg('Please specify a rejection reason.');
          setSubmitting(false);
          return;
        }
        await api.post(`/sales/orders/${order.id}/reject`, { reason: comments });
      } else if (action === 'modify') {
        if (!comments) {
          setErrorMsg('Please enter requested modifications.');
          setSubmitting(false);
          return;
        }
        await api.post(`/sales/orders/${order.id}/request-changes`, { comments });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process order approval.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                Order Review & Sign-Off
              </h2>
              <span className="text-xs text-zinc-400 font-mono">
                {order.order_number}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Details Preview */}
        <div className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Customer Outlet</span>
              <span className="font-bold text-zinc-800 dark:text-zinc-200">{order.customer?.name || `Customer #${order.customer_id}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Order Subtotal</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">₦{Number(order.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">VAT (7.5%) & Discount</span>
              <span className="text-zinc-600 dark:text-zinc-400">+₦{Number(order.vat_amount || 0).toLocaleString()} / -₦{Number(order.discount_amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700 font-bold">
              <span className="text-zinc-900 dark:text-zinc-100 text-sm">Total Invoiced Amount</span>
              <span className="text-orange-600 dark:text-orange-400 text-sm font-black">₦{Number(order.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Action Chooser */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300">Supervisor Decision</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAction('approve')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  action === 'approve'
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <CheckCircle2 size={14} /> Approve
              </button>

              <button
                type="button"
                onClick={() => setAction('modify')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  action === 'modify'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <AlertCircle size={14} /> Changes
              </button>

              <button
                type="button"
                onClick={() => setAction('reject')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-1.5 ${
                  action === 'reject'
                    ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>

          {/* Comments / Reason Textarea */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <MessageSquare size={13} /> {action === 'approve' ? 'Sign-Off Notes (Optional)' : 'Reason / Instructions *'}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                action === 'approve'
                  ? 'e.g. Credit balance and stock verified for dispatch.'
                  : action === 'reject'
                  ? 'e.g. Customer credit limit exhausted. Full payment required.'
                  : 'e.g. Please reduce oil quantity to 5 cartons.'
              }
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-xl font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleProcess}
            className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs transition ${
              action === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : action === 'reject'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {submitting ? 'Submitting...' : action === 'approve' ? 'Confirm Approval' : action === 'reject' ? 'Confirm Rejection' : 'Submit Change Request'}
          </button>
        </div>
      </div>
    </div>
  );
}
