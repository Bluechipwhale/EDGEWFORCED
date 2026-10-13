import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { formatMoney, formatDate, formatTime } from '../../lib/formatters';
import { Printer, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function ReceiptModal({ order, isOpen, onClose, customSettings }) {
  const [settings, setSettings] = useState(customSettings || null);

  useEffect(() => {
    if (isOpen && !customSettings) {
      api.get('/admin/settings')
        .then(res => setSettings(res.data || res))
        .catch(() => {});
    }
  }, [isOpen, customSettings]);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const companyName = customSettings?.receipt_company_name || settings?.receipt_company_name || 'EXPERIENTIAL EDGE';
  const tagline = customSettings?.receipt_tagline || settings?.receipt_tagline || 'Integrated Marketing & Commercial Distribution Solutions';
  const receiptTitle = customSettings?.receipt_title || settings?.receipt_title || 'EDGEWFORCE SALES RECEIPT';
  const address = customSettings?.receipt_address || settings?.receipt_address || '15 Atiba Osborne, Mende, Maryland, Lagos';
  const phone = customSettings?.receipt_phone || settings?.receipt_phone || '+2348031234567';
  const footerNote = customSettings?.receipt_footer_note || settings?.receipt_footer_note || 'Thank you for your business. Verified by EdgeWForce Operating System.';

  return (
    <Modal title="Commercial Sales Receipt" isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      {/* Printable Receipt Container */}
      <div className="p-6 bg-white text-zinc-950 rounded-xl border border-zinc-200 shadow-xs font-mono text-xs">
        {/* Receipt Header */}
        <div className="text-center pb-4 border-b-2 border-dashed border-zinc-300">
          <div className="font-black text-base uppercase tracking-wider text-zinc-900">
            {companyName}
          </div>
          {tagline && (
            <div className="text-[10px] text-zinc-600 font-sans mt-0.5">
              {tagline}
            </div>
          )}
          {address && (
            <div className="text-[9px] text-zinc-500 font-sans mt-0.5">
              {address} {phone ? `• Tel: ${phone}` : ''}
            </div>
          )}
          <div className="text-[11px] font-bold text-orange-600 mt-1.5 font-sans">
            {receiptTitle}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">
            Order #: {order.order_number}
          </div>
          <div className="text-[10px] text-zinc-500">
            Date: {formatDate(order.order_date || order.created_at)} • {formatTime(order.created_at)}
          </div>
        </div>

        {/* Customer & Agent Details */}
        <div className="py-3 border-b border-zinc-200 text-[11px] space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Customer:</span>
            <span className="font-bold text-zinc-900">{order.customer?.name || 'Customer Outlet'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Contact:</span>
            <span>{order.customer?.contact_person || 'Representative'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Territory:</span>
            <span>{order.customer?.territory || 'Lagos Central'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Sales Agent:</span>
            <span className="font-semibold">{order.sales_agent_name || 'Adebanjo Adeleke'}</span>
          </div>
        </div>

        {/* Order Items Table */}
        <div className="py-3 border-b border-zinc-200">
          <div className="flex justify-between font-bold text-[10px] text-zinc-500 uppercase pb-1.5">
            <span>Item & Quantity</span>
            <span>Total (₦)</span>
          </div>
          <div className="space-y-2">
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-[11px]">
                <div className="pr-2">
                  <div className="font-bold text-zinc-900">{item.product?.name || item.name || `Product #${item.product_id}`}</div>
                  <div className="text-[10px] text-zinc-500">
                    {item.quantity} × {formatMoney(item.unit_price || item.product?.price)}
                  </div>
                </div>
                <div className="font-bold text-zinc-900 whitespace-nowrap">
                  {formatMoney(item.total_price || (item.quantity * item.unit_price))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="py-3 border-b-2 border-dashed border-zinc-300 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-zinc-600">
            <span>Subtotal:</span>
            <span>{formatMoney(order.subtotal)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Commercial Discount:</span>
              <span>-{formatMoney(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-zinc-600">
            <span>VAT (7.5%):</span>
            <span>{formatMoney(order.vat_amount)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-zinc-900 pt-1 border-t border-zinc-200">
            <span>Total Payable:</span>
            <span className="text-orange-600">{formatMoney(order.total_amount)}</span>
          </div>
        </div>

        {/* Payment Meta */}
        <div className="pt-3 text-[10px] text-center text-zinc-500 space-y-1">
          <div>
            <b>Payment Method:</b> {order.payment_method} • <b>Status:</b> {order.payment_status?.toUpperCase()}
          </div>
          <div className="text-[9px] text-zinc-500 mt-2 font-sans">
            {footerNote}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex gap-3 no-print">
        <button onClick={handlePrint} className="btn-primary flex-1">
          <Printer size={16} />
          Print Official Receipt
        </button>
        <button onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </Modal>
  );
}
