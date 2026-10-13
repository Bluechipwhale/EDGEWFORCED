import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  Award,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Upload,
  UserCheck,
  Download,
  Printer,
  DollarSign,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Modal from '../components/common/Modal';
import PayslipModal from '../components/employee/PayslipModal';
import { formatMoney, formatDate } from '../lib/formatters';
import { api } from '../lib/api';

export default function AccountingDashboard({ user }) {
  const [overview, setOverview] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [collections, setCollections] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('payroll'); // 'payroll' | 'settlements' | 'collections'

  // Modals
  const [singlePayslipModalOpen, setSinglePayslipModalOpen] = useState(false);
  const [uploadPayslipModalOpen, setUploadPayslipModalOpen] = useState(false);
  const [selectedPayslipForView, setSelectedPayslipForView] = useState(null);

  // Single Payslip Form
  const [singleForm, setSingleForm] = useState({
    employee_id: '',
    pay_month: new Date().toISOString().slice(0, 7) + '-01',
    basic_salary: '',
    housing_allowance: '',
    transport_allowance: '',
    other_allowance: '',
    notes: ''
  });

  // Upload Payslip Form
  const [uploadForm, setUploadForm] = useState({
    employee_id: '',
    pay_month: new Date().toISOString().slice(0, 7) + '-01',
    notes: ''
  });
  const [uploadFile, setUploadFile] = useState(null);

  const [payrollLoading, setPayrollLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    try {
      const [ov, set, col, emps, slips] = await Promise.all([
        api.get('/accounting/overview').catch(() => null),
        api.get('/sales/settlements').catch(() => []),
        api.get('/sales/payments').catch(() => []),
        api.get('/hr/employees').catch(() => []),
        api.get('/accounting/payslips').catch(() => [])
      ]);
      setOverview(ov);
      setSettlements(set || []);
      setCollections(col || []);
      setEmployees(emps || []);
      setPayslips(slips || []);
    } catch {
      // Graceful offline fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewSettlement = async (id, status) => {
    try {
      await api.put(`/accounting/settlements/${id}/review`, { status, notes: `Reviewed and ${status} by Finance.` });
      setStatusMsg(`Settlement #${id} ${status}.`);
      loadData();
    } catch (err) {
      setErrorMsg(`Review failed: ${err.message}`);
    }
  };

  // 1. Generate All Staff at Once (Batch)
  const handleGeneratePayrollBatch = async () => {
    setPayrollLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      const res = await api.post('/accounting/payroll/generate', { pay_month: new Date().toISOString().slice(0, 7) + '-01' });
      setStatusMsg(`Successfully generated ${res.count} employee payslips for ${res.month}!`);
      loadData();
    } catch (err) {
      setErrorMsg(`Batch Payroll error: ${err.message}`);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Employee selection in single payslip
  const handleSelectEmployeeForSingle = (empId) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    if (emp) {
      setSingleForm({
        ...singleForm,
        employee_id: emp.id,
        basic_salary: emp.base_salary || 0,
        housing_allowance: emp.housing_allowance || 0,
        transport_allowance: emp.transport_allowance || 0,
        other_allowance: emp.other_allowance || 0
      });
    } else {
      setSingleForm({
        ...singleForm,
        employee_id: empId,
        basic_salary: '',
        housing_allowance: '',
        transport_allowance: '',
        other_allowance: ''
      });
    }
  };

  // 2. Generate Single Payslip
  const handleSubmitSinglePayslip = async (e) => {
    e.preventDefault();
    if (!singleForm.employee_id) {
      setErrorMsg('Please select an employee.');
      return;
    }

    setPayrollLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      await api.post('/accounting/payroll/generate-single', singleForm);
      setStatusMsg('Individual employee payslip generated and published successfully.');
      setSinglePayslipModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // 3. Upload Custom Payslip PDF / Document
  const handleSubmitUploadPayslip = async (e) => {
    e.preventDefault();
    if (!uploadForm.employee_id) {
      setErrorMsg('Please select an employee.');
      return;
    }

    setPayrollLoading(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const fd = new FormData();
      fd.append('employee_id', uploadForm.employee_id);
      fd.append('pay_month', uploadForm.pay_month);
      fd.append('notes', uploadForm.notes);
      if (uploadFile) {
        fd.append('payslip_pdf', uploadFile);
      }

      await api.post('/accounting/payroll/upload', fd);
      setStatusMsg('Employee payslip document uploaded and published.');
      setUploadPayslipModalOpen(false);
      setUploadFile(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPayrollLoading(false);
    }
  };

  // Live preview breakdown for single form
  const b = Number(singleForm.basic_salary || 0);
  const h = Number(singleForm.housing_allowance || 0);
  const t = Number(singleForm.transport_allowance || 0);
  const o = Number(singleForm.other_allowance || 0);
  const previewGross = b + h + t + o;
  const previewPension = Math.round((b + h + t) * 0.08);
  const previewTax = Math.round(previewGross * 0.15);
  const previewNet = Math.max(0, previewGross - previewPension - previewTax);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>Commercial Finance & Payroll Operations</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              Head of Payroll
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Individual & batch payslip generation, custom document uploads, collections audit & bank reconciliations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSinglePayslipModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Plus size={14} className="text-orange-500" />
            <span>Generate Single Payslip</span>
          </button>

          <button
            onClick={() => setUploadPayslipModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Upload size={14} className="text-orange-500" />
            <span>Upload Payslip File</span>
          </button>

          <button
            onClick={handleGeneratePayrollBatch}
            disabled={payrollLoading}
            className="btn-primary text-xs py-2 px-3.5 shadow-md"
          >
            <FileText size={15} />
            <span>{payrollLoading ? 'Processing…' : 'Batch Generate All (August 2026)'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <XCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Commercial Revenue"
          value={formatMoney(overview?.totalRevenue || 0)}
          icon={DollarSign}
          subtitle="Delivered Orders"
        />
        <StatCard
          title="Total Recovered Cash"
          value={formatMoney(overview?.totalCollected || 0)}
          icon={WalletCards}
          subtitle="Collections Ledger"
        />
        <StatCard
          title="Total Published Payslips"
          value={payslips.length}
          icon={FileText}
          subtitle="Staff Compensation"
        />
        <StatCard
          title="Collection Efficiency"
          value={`${overview?.collectionEfficiency || 100}%`}
          icon={Award}
          subtitle="Recovery Rate"
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`pb-3 transition relative flex items-center gap-2 ${
            activeSubTab === 'payroll'
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-500'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <FileText size={15} />
          <span>Staff Payslips & Compensation ({payslips.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settlements')}
          className={`pb-3 transition relative flex items-center gap-2 ${
            activeSubTab === 'settlements'
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-500'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Award size={15} />
          <span>Field Settlements Audit ({settlements.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('collections')}
          className={`pb-3 transition relative flex items-center gap-2 ${
            activeSubTab === 'collections'
              ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-500'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <WalletCards size={15} />
          <span>Collections Ledger ({collections.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: STAFF PAYSLIP MANAGEMENT */}
      {activeSubTab === 'payroll' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText size={18} className="text-orange-500" />
              <span>Corporate Staff Payslips Register</span>
            </h3>
            <span className="text-xs text-zinc-500">Period: August 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Staff Code</th>
                  <th className="pb-2">Employee Name</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Month</th>
                  <th className="pb-2">Gross Pay</th>
                  <th className="pb-2">Total Deductions</th>
                  <th className="pb-2">Net Take-Home</th>
                  <th className="pb-2">Document</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {payslips.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-500/5 transition">
                    <td className="py-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {p.employee?.employee_code || `EMP-${p.employee_id}`}
                    </td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {p.employee ? `${p.employee.first_name} ${p.employee.last_name}` : `Employee #${p.employee_id}`}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {p.employee?.department || 'Operations'}
                    </td>
                    <td className="py-3 text-zinc-500">{String(p.pay_month).slice(0, 7)}</td>
                    <td className="py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(p.gross_pay)}
                    </td>
                    <td className="py-3 text-rose-600 dark:text-rose-400">
                      -{formatMoney(p.total_deductions)}
                    </td>
                    <td className="py-3 font-black text-orange-600 dark:text-orange-400">
                      {formatMoney(p.net_pay)}
                    </td>
                    <td className="py-3">
                      {p.pdf_url ? (
                        <a
                          href={p.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold hover:underline inline-flex items-center gap-1 text-[10px]"
                        >
                          <Download size={11} />
                          <span>PDF Doc</span>
                        </a>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          System Calculated
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedPayslipForView(p)}
                        className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Eye size={12} />
                        <span>View Payslip</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {payslips.length === 0 && (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-zinc-400">
                      No payslips generated yet. Click "Batch Generate All" or "Generate Single Payslip" to start.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SETTLEMENTS */}
      {activeSubTab === 'settlements' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Award size={18} className="text-orange-500" />
            <span>Field & Sales Cash Settlements for Audit</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Agent</th>
                  <th className="pb-2">Deposited Amount</th>
                  <th className="pb-2">Expected Amount</th>
                  <th className="pb-2">Variance</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Slip</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3">{formatDate(s.settlement_date || s.created_at)}</td>
                    <td className="py-3 font-bold">Agent #{s.agent_id}</td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(s.amount)}</td>
                    <td className="py-3">{formatMoney(s.expected_amount)}</td>
                    <td className="py-3 font-bold">{formatMoney(s.difference_amount)}</td>
                    <td className="py-3 font-mono">{s.deposit_reference}</td>
                    <td className="py-3">
                      {s.bank_slip_url ? (
                        <a href={s.bank_slip_url} target="_blank" rel="noreferrer" className="text-orange-500 hover:underline">
                          View Slip
                        </a>
                      ) : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        s.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : (s.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500')
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {s.status !== 'approved' && (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleReviewSettlement(s.id, 'approved')} className="btn-primary text-[11px] py-1 px-2.5">
                            Approve
                          </button>
                          <button onClick={() => handleReviewSettlement(s.id, 'rejected')} className="btn-secondary text-[11px] py-1 px-2.5 text-rose-500">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: COLLECTIONS */}
      {activeSubTab === 'collections' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <WalletCards size={18} className="text-orange-500" />
            <span>Collections Recovered Ledger</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Customer Outlet</th>
                  <th className="pb-2">Amount (₦)</th>
                  <th className="pb-2">Method</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {collections.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3">{formatDate(c.payment_date || c.created_at)}</td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">Customer #{c.customer_id}</td>
                    <td className="py-3 font-black text-emerald-600 dark:text-emerald-400">{formatMoney(c.amount)}</td>
                    <td className="py-3">{c.payment_method}</td>
                    <td className="py-3 font-mono">{c.reference_number || '—'}</td>
                    <td className="py-3 text-zinc-500">{c.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: GENERATE SINGLE PAYSLIP */}
      <Modal
        title="Generate Individual Staff Payslip"
        subtitle="Calculate and issue payslip for a specific staff member"
        isOpen={singlePayslipModalOpen}
        onClose={() => setSinglePayslipModalOpen(false)}
      >
        <form onSubmit={handleSubmitSinglePayslip} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Select Staff Member *
              </label>
              <select
                required
                className="form-input"
                value={singleForm.employee_id}
                onChange={(e) => handleSelectEmployeeForSingle(e.target.value)}
              >
                <option value="">Choose Employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_code} — {emp.first_name} {emp.last_name} ({emp.department} • {emp.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Pay Month *
              </label>
              <input
                type="date"
                required
                className="form-input"
                value={singleForm.pay_month}
                onChange={(e) => setSingleForm({ ...singleForm, pay_month: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Basic Salary (₦) *
              </label>
              <input
                type="number"
                required
                className="form-input"
                value={singleForm.basic_salary}
                onChange={(e) => setSingleForm({ ...singleForm, basic_salary: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Housing Allowance (₦)
              </label>
              <input
                type="number"
                className="form-input"
                value={singleForm.housing_allowance}
                onChange={(e) => setSingleForm({ ...singleForm, housing_allowance: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Transport Allowance (₦)
              </label>
              <input
                type="number"
                className="form-input"
                value={singleForm.transport_allowance}
                onChange={(e) => setSingleForm({ ...singleForm, transport_allowance: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Other Allowances / Bonus (₦)
              </label>
              <input
                type="number"
                className="form-input"
                value={singleForm.other_allowance}
                onChange={(e) => setSingleForm({ ...singleForm, other_allowance: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Notes / Memo
              </label>
              <input
                type="text"
                placeholder="e.g. Q3 Sales bonus included"
                className="form-input"
                value={singleForm.notes}
                onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Live Calculated Net Pay Preview */}
          <div className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs space-y-1">
            <div className="flex justify-between font-bold text-zinc-800 dark:text-zinc-200">
              <span>Calculated Gross Earnings:</span>
              <span>{formatMoney(previewGross)}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Est. Statutory Deductions (8% Pension + PAYE):</span>
              <span>-{formatMoney(previewPension + previewTax)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-orange-600 dark:text-orange-400 pt-1 border-t border-orange-500/20">
              <span>Estimated Net Take-Home Pay:</span>
              <span>{formatMoney(previewNet)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={payrollLoading} className="btn-primary flex-1">
              {payrollLoading ? 'Generating…' : 'Calculate & Issue Payslip'}
            </button>
            <button type="button" onClick={() => setSinglePayslipModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: UPLOAD CUSTOM PAYSLIP DOCUMENT */}
      <Modal
        title="Upload Staff Payslip Document (PDF/Doc)"
        subtitle="Attach an externally prepared payslip PDF for a staff member"
        isOpen={uploadPayslipModalOpen}
        onClose={() => setUploadPayslipModalOpen(false)}
      >
        <form onSubmit={handleSubmitUploadPayslip} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Select Staff Member *
            </label>
            <select
              required
              className="form-input"
              value={uploadForm.employee_id}
              onChange={(e) => setUploadForm({ ...uploadForm, employee_id: e.target.value })}
            >
              <option value="">Choose Employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code} — {emp.first_name} {emp.last_name} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Pay Month *
            </label>
            <input
              type="date"
              required
              className="form-input"
              value={uploadForm.pay_month}
              onChange={(e) => setUploadForm({ ...uploadForm, pay_month: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Upload Payslip Document (PDF, Image, or DOC) *
            </label>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="form-input text-xs"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Accountant Notes / Special Remarks
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Signed payroll schedule with audited tax clearance..."
              className="form-input"
              value={uploadForm.notes}
              onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={payrollLoading} className="btn-primary flex-1">
              {payrollLoading ? 'Uploading…' : 'Upload & Publish Payslip'}
            </button>
            <button type="button" onClick={() => setUploadPayslipModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: VIEW OFFICIAL PAYSLIP */}
      {selectedPayslipForView && (
        <PayslipModal
          payslip={selectedPayslipForView}
          user={{
            full_name: selectedPayslipForView.employee ? `${selectedPayslipForView.employee.first_name} ${selectedPayslipForView.employee.last_name}` : 'Staff Member',
            employee: selectedPayslipForView.employee,
            rank: { name: selectedPayslipForView.employee?.position || 'Staff' }
          }}
          isOpen={Boolean(selectedPayslipForView)}
          onClose={() => setSelectedPayslipForView(null)}
        />
      )}
    </div>
  );
}
