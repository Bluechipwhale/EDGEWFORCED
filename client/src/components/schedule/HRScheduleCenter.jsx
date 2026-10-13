import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Building2,
  Users,
  ShieldCheck,
  Sparkles,
  FileText,
  UserCheck,
  RefreshCw,
  Send
} from 'lucide-react';
import Modal from '../common/Modal';
import { formatDate, formatTime } from '../../lib/formatters';
import { api } from '../../lib/api';

export default function HRScheduleCenter({ user }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [metrics, setMetrics] = useState({
    total_active_staff: 0,
    total_submitted_today: 0,
    approved_count: 0,
    pending_review_count: 0,
    compliance_rate: 100
  });
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (deptFilter && deptFilter !== 'ALL') params.append('department', deptFilter);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/hr/schedules?${params.toString()}`);
      const data = res?.data || res || {};
      setSchedules(data.schedules || []);
      setMetrics(data.metrics || {
        total_active_staff: 0,
        total_submitted_today: 0,
        approved_count: 0,
        pending_review_count: 0,
        compliance_rate: 100
      });
    } catch (err) {
      console.warn('Failed to load HR schedules:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, deptFilter, statusFilter, searchQuery]);

  const handleAcknowledge = async (schId) => {
    try {
      await api.put(`/hr/schedules/${schId}/review`, {
        status: 'ACKNOWLEDGED',
        notes: 'Acknowledged & Logged by HR Command Center'
      });
      setStatusMsg('Schedule acknowledged by HR Command Center.');
      loadData();
      if (selectedSchedule?.id === schId) {
        setSelectedSchedule(prev => ({ ...prev, hr_status: 'ACKNOWLEDGED' }));
      }
    } catch (err) {
      alert(`Acknowledgement failed: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (schedules.length === 0) {
      alert('No schedule data available to export.');
      return;
    }
    const headers = ['Date', 'Employee Code', 'Employee Name', 'Department', 'Position', 'Shift Start', 'Shift End', 'Location', 'Objective', 'Status', 'Supervisor', 'Supervisor Status'];
    const rows = schedules.map(s => [
      s.date,
      s.employee_code,
      `"${s.employee_name}"`,
      `"${s.department}"`,
      `"${s.position}"`,
      s.shift_start,
      s.shift_end,
      `"${s.work_location}"`,
      `"${s.title?.replace(/"/g, '""')}"`,
      s.status,
      `"${s.supervisor_name || ''}"`,
      s.supervisor_status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Workforce_Schedules_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = ['ALL', 'Commercial Sales', 'Field Operations', 'Human Resources', 'Finance & Accounts', 'Technology & IT', 'Executive Management'];

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" /> Workforce Intelligence & Operations Roster
          </div>
          <h2 className="text-xl font-black tracking-tight">
            Company-Wide Daily Schedules & Roster
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time visibility into staff daily schedules, territory distribution, supervisor reviews and workforce compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl"
          >
            <Download size={14} />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-semibold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-zinc-600">×</button>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">Active Workforce</div>
          <div className="text-xl font-black mt-0.5">{metrics.total_active_staff}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Registered Staff</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Submitted Today</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{metrics.total_submitted_today}</div>
          <div className="text-[10px] text-blue-500/70 mt-0.5">{metrics.compliance_rate}% Submission Rate</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Approved by Supervisor</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.approved_count}</div>
          <div className="text-[10px] text-emerald-500/70 mt-0.5">Verified plans</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Review</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{metrics.pending_review_count}</div>
          <div className="text-[10px] text-amber-500/70 mt-0.5">Under supervisor review</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-orange-500/20 bg-orange-500/5">
          <div className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">Compliance Rate</div>
          <div className="text-xl font-black text-orange-600 dark:text-orange-400 mt-0.5">{metrics.compliance_rate}%</div>
          <div className="text-[10px] text-orange-500/70 mt-0.5">Daily submissions</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 surface-card rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <input
              type="date"
              className="form-input py-1 px-2.5 text-xs font-bold"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <select
            className="form-input py-1 px-2 text-xs font-semibold"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept === 'ALL' ? 'All Departments' : dept}</option>
            ))}
          </select>

          <select
            className="form-input py-1 px-2 text-xs font-semibold"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Pending Review</option>
            <option value="REVISION_REQUESTED">Revision Requested</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <div className="relative min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search employee, title, location..."
            className="form-input pl-8 py-1.5 text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Daily Schedule Registry Table */}
      <div className="surface-card rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="p-3.5">Staff Member</th>
                <th className="p-3.5">Department & Territory</th>
                <th className="p-3.5">Shift & Objective</th>
                <th className="p-3.5">Tasks</th>
                <th className="p-3.5">Supervisor Review</th>
                <th className="p-3.5">HR Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {schedules.map((sch) => {
                const isApproved = sch.supervisor_status === 'APPROVED' || sch.status === 'APPROVED';
                const isPending = sch.supervisor_status === 'PENDING' || sch.status === 'SUBMITTED';

                return (
                  <tr key={sch.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-zinc-900 dark:text-zinc-100">{sch.employee_name}</div>
                      <div className="text-[11px] text-zinc-400">{sch.position} • {sch.employee_code}</div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{sch.department}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-orange-500 shrink-0" />
                        <span className="truncate max-w-[150px]">{sch.work_location || 'Territory'}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400">
                        {sch.shift_start} - {sch.shift_end} ({sch.total_planned_hours || 8}h)
                      </div>
                      <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[200px] mt-0.5">
                        {sch.title}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-300 text-[11px]">
                        {(sch.tasks || []).length} items
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : isPending
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {sch.supervisor_status || sch.status}
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {sch.supervisor_name || 'Supervisor'}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        sch.hr_status === 'ACKNOWLEDGED'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}>
                        {sch.hr_status || 'Pending'}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sch.hr_status !== 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => handleAcknowledge(sch.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSchedule(sch)}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                          title="View Full Itinerary"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {schedules.length === 0 && !loading && (
          <div className="p-10 text-center text-zinc-400 text-xs italic">
            No schedule submissions matching your filter for {formatDate(date)}.
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSchedule(null)}
          title={`Daily Schedule: ${selectedSchedule.employee_name}`}
          subtitle={`${selectedSchedule.position} • ${selectedSchedule.department} (${formatDate(selectedSchedule.date)})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl surface-card-subtle border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{selectedSchedule.title}</div>
              <div className="flex flex-wrap items-center gap-3 text-zinc-500">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-orange-500" />
                  <b>{selectedSchedule.work_location}</b>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-orange-500" />
                  <b>{selectedSchedule.shift_start} - {selectedSchedule.shift_end} ({selectedSchedule.total_planned_hours || 8}h)</b>
                </span>
              </div>
              {selectedSchedule.notes && (
                <p className="text-zinc-600 dark:text-zinc-300 italic pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  "{selectedSchedule.notes}"
                </p>
              )}
            </div>

            {/* Task list */}
            <div className="space-y-2">
              <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100">
                Hourly Tasks & Objectives ({(selectedSchedule.tasks || []).length} items)
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(selectedSchedule.tasks || []).map((t, idx) => (
                  <div key={t.id || idx} className="p-3 rounded-xl surface-card border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded text-[10px]">
                          {t.time_start} - {t.time_end}
                        </span>
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{t.activity}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {t.priority}
                      </span>
                    </div>
                    {t.location && (
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <MapPin size={11} className="text-orange-500 shrink-0" />
                        <span>{t.location}</span>
                      </div>
                    )}
                    {t.notes && (
                      <div className="text-[10px] text-zinc-400 italic">
                        "{t.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor feedback */}
            {selectedSchedule.supervisor_notes && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <div className="font-bold text-[11px]">Supervisor Review ({selectedSchedule.supervisor_name}):</div>
                <div className="mt-0.5">"{selectedSchedule.supervisor_notes}"</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Close
              </button>

              {selectedSchedule.hr_status !== 'ACKNOWLEDGED' && (
                <button
                  type="button"
                  onClick={() => handleAcknowledge(selectedSchedule.id)}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md"
                >
                  Acknowledge as HR
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
