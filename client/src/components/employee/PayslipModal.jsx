import React from 'react';
import Modal from '../common/Modal';
import { formatMoney, formatDate } from '../../lib/formatters';
import { Printer, Download, CheckCircle2 } from 'lucide-react';

export default function PayslipModal({ payslip, user, isOpen, onClose }) {
  if (!payslip) return null;

  const isHrOrCeo = user && (
    ['HR', 'HR_MANAGER', 'CEO', 'SUPER_ADMIN', 'IT_ADMIN'].includes(user.role_code) ||
    ['HR', 'CEO', 'IT_ADMIN'].includes(user.rank?.code) ||
    user.email === 'admin@edgewforce.com'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      title="Official Employee Payslip"
      subtitle={`Pay Period: ${payslip.pay_month ? formatDate(payslip.pay_month) : 'August 2026'}`}
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Printable Payslip Sheet */}
        <div className="p-6 bg-white text-zinc-900 rounded-xl border border-zinc-200 shadow-sm font-sans text-xs space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b-2 border-orange-500">
            <div>
              <div className="text-base font-black tracking-tight text-zinc-900">
                EXPERIENTIAL EDGE NIGERIA LIMITED
              </div>
              <div className="text-[11px] text-zinc-500">
                Integrated Marketing & Commercial Operations
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5">
                Headquarters: 15 Atiba Osborne, Mende, Maryland, Lagos, Nigeria
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-orange-100 text-orange-700 uppercase">
                Confidential Payslip
              </span>
              <div className="text-[11px] text-zinc-500 mt-1">
                Period: <b>{payslip.pay_month ? String(payslip.pay_month).slice(0, 7) : '2026-08'}</b>
              </div>
            </div>
          </div>

          {/* Employee Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-zinc-50 rounded-lg text-[11px]">
            <div>
              <span className="text-zinc-500 block">Employee Name:</span>
              <b className="text-zinc-900">{user?.full_name || 'Tariq Al-Mansoor'}</b>
            </div>
            <div>
              <span className="text-zinc-500 block">Employee Code:</span>
              <b className="text-zinc-900">{user?.employee?.employee_code || 'EMP-1003'}</b>
            </div>
            <div>
              <span className="text-zinc-500 block">Department:</span>
              <b>{user?.employee?.department || 'Operations'}</b>
            </div>
            <div>
              <span className="text-zinc-500 block">Position / Designation:</span>
              <b>{user?.employee?.position || 'Staff Member'}</b>
            </div>
            <div>
              <span className="text-zinc-500 block">Organizational Rank:</span>
              <b>{user?.rank?.name || user?.role_code || 'Staff'}</b>
            </div>
            <div>
              <span className="text-zinc-500 block">Payment Currency:</span>
              <b>NGN (₦) - Nigerian Naira</b>
            </div>
          </div>

          {/* Earnings & Deductions Tables */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="bg-zinc-100 px-3 py-2 font-bold text-zinc-700 flex justify-between">
                <span>Earnings & Allowances</span>
                <span>Amount (₦)</span>
              </div>
              <div className="p-3 space-y-1.5 text-[11px]">
                {isHrOrCeo ? (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Basic Salary:</span>
                    <b>{formatMoney(payslip.basic_salary)}</b>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Base Salary:</span>
                    <span className="text-zinc-400 italic font-mono">•••••••• (HR/CEO Locked)</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-600">Housing Allowance:</span>
                  <b>{formatMoney(payslip.housing_allowance)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Transport Allowance:</span>
                  <b>{formatMoney(payslip.transport_allowance)}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Other Allowances:</span>
                  <b>{formatMoney(payslip.other_allowance)}</b>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 font-bold text-zinc-900">
                  <span>Gross Pay:</span>
                  <span className="text-emerald-700">{formatMoney(payslip.gross_pay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="bg-zinc-100 px-3 py-2 font-bold text-zinc-700 flex justify-between">
                <span>Statutory Deductions</span>
                <span>Amount (₦)</span>
              </div>
              <div className="p-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">PAYE Income Tax:</span>
                  <span className="text-rose-600 font-semibold">{formatMoney(payslip.tax_paye)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Employee Pension (8%):</span>
                  <span className="text-rose-600 font-semibold">{formatMoney(payslip.pension)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Other Deductions:</span>
                  <span className="text-rose-600">{formatMoney(payslip.other_deductions)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-200 font-bold text-zinc-900">
                  <span>Total Deductions:</span>
                  <span className="text-rose-700">{formatMoney(payslip.total_deductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Pay Highlight */}
          <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-orange-600 tracking-wider">
                Net Take-Home Pay
              </div>
              <div className="text-xs text-zinc-500">
                Formula: Gross Pay − Statutory Deductions
              </div>
            </div>
            <div className="text-2xl font-black text-orange-600">
              {formatMoney(payslip.net_pay)}
            </div>
          </div>

          {/* Footer Sign-off */}
          <div className="pt-2 text-[10px] text-zinc-400 text-center border-t border-zinc-200">
            System generated by EdgeWForce Workforce Operating System • Bank transfer processed automatically.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 no-print">
          <button onClick={handlePrint} className="btn-primary flex-1">
            <Printer size={16} />
            Print Official Payslip (PDF)
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
