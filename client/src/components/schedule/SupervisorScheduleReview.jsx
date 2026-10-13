import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Eye,
  UserCheck,
  ShieldCheck,
  Building2,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ChevronRight,
  Layers,
  Users
} from 'lucide-react';
import Modal from '../common/Modal';
import StatCard from '../common/StatCard';
import { formatDate, formatTime } from '../../lib/formatters';
import { api } from '../../lib/api';

export default function SupervisorScheduleReview({ user }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [metrics, setMetrics] = useState({
    total_team_members: 0,
    submitted_today: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    compliance_rate: 100
  });
  const [teamList, setTeamList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/workforce/schedules?${params.toString()}`);
      const data = res?.data || res || {};
      setSchedules(data.schedules || []);
      setMetrics(data.metrics || {
        total_team_members: 0,
        submitted_today: 0,
        pending_review: 0,
        approved: 0,
        rejected: 0,
        compliance_rate: 100
      });
      setTeamList(data.team || []);
    } catch (err) {
      console.warn('Failed to load supervisor schedules:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date, statusFilter, searchQuery]);

  const handleReviewAction = async (status) => {
    if (!selectedSchedule) return;
    setReviewing(true);
    try {
      await api.put(`/workforce/schedules/${selectedSchedule.id}/review`, {
        status,
        notes: reviewNotes
      });
      setStatusMsg(`Schedule marked as ${status}. Staff member notified.`);
      setSelectedSchedule(null);
      setReviewNotes('');
      loadData();
    } catch (err) {
      alert(`Review failed: ${err.message}`);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Team Workforce Telemetry
          </div>
          <h2 className="text-xl font-black tracking-tight">
            Team Daily Schedules & Route Approvals
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Review daily work plans, verify territory coverage, and approve subordinate itineraries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition"
            title="Refresh Schedules"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-zinc-600">×</button>
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div className="surface-card p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">Team Size</div>
          <div className="text-xl font-black mt-0.5">{metrics.total_team_members}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Subordinates</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Submitted Today</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{metrics.submitted_today}</div>
          <div className="text-[10px] text-blue-500/70 mt-0.5">{metrics.compliance_rate}% Compliance</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Pending Review</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{metrics.pending_review}</div>
          <div className="text-[10px] text-amber-500/70 mt-0.5">Awaiting decision</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Approved</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{metrics.approved}</div>
          <div className="text-[10px] text-emerald-500/70 mt-0.5">Ready for execution</div>
        </div>

        <div className="surface-card p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Revisions / Rejected</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{metrics.rejected}</div>
          <div className="text-[10px] text-rose-500/70 mt-0.5">Requires update</div>
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

          <div className="flex items-center gap-1">
            {['ALL', 'PENDING', 'APPROVED', 'REVISION_REQUESTED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                  statusFilter === st
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'PENDING' ? 'Pending' : st === 'APPROVED' ? 'Approved' : 'Revision'}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-w-[220px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search staff, location, activity..."
            className="form-input pl-8 py-1.5 text-xs w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Schedules List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map((sch) => {
          const isPending = sch.supervisor_status === 'PENDING' || sch.status === 'SUBMITTED';
          const isApproved = sch.supervisor_status === 'APPROVED' || sch.status === 'APPROVED';
          const isRejected = sch.supervisor_status === 'REJECTED' || sch.supervisor_status === 'REVISION_REQUESTED';

          return (
            <div
              key={sch.id}
              className={`p-4 rounded-2xl surface-card border transition flex flex-col justify-between space-y-3 hover:border-orange-500/50 group ${
                isPending
                  ? 'border-amber-500/40 bg-amber-500/[0.02]'
                  : isApproved
                  ? 'border-emerald-500/30'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition">
                      {sch.employee_name}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {sch.position} • {sch.employee_code}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isApproved
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : isRejected
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                  }`}>
                    {sch.supervisor_status || sch.status}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl surface-card-subtle text-xs space-y-1">
                  <div className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                    {sch.title}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <MapPin size={12} className="text-orange-500 shrink-0" />
                    <span className="truncate">{sch.work_location || 'Assigned Territory'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1">
                    <span>🕒 {sch.shift_start} - {sch.shift_end} ({sch.total_planned_hours || 8}h)</span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">{(sch.tasks || []).length} Planned Tasks</span>
                  </div>
                </div>

                {sch.supervisor_notes && (
                  <div className="text-[11px] text-zinc-500 italic bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg">
                    Supervisor: "{sch.supervisor_notes}"
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">
                  {sch.submitted_at ? formatTime(sch.submitted_at) : 'Draft'}
                </span>

                <button
                  onClick={() => {
                    setSelectedSchedule(sch);
                    setReviewNotes(sch.supervisor_notes || '');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    isPending
                      ? 'btn-primary bg-orange-500 text-white'
                      : 'btn-secondary text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Eye size={13} />
                  <span>{isPending ? 'Review & Decide' : 'View Details'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {schedules.length === 0 && !loading && (
        <div className="surface-card rounded-2xl p-10 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Users size={24} />
          </div>
          <div className="text-sm font-bold text-zinc-500">
            No team schedules matching your filter for {formatDate(date)}.
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedSchedule && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSchedule(null)}
          title={`Supervisor Review: ${selectedSchedule.employee_name}`}
          subtitle={`Schedule for ${formatDate(selectedSchedule.date)} (${selectedSchedule.department})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-xl surface-card-subtle border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-black text-orange-500">Day Theme</span>
                <div className="text-sm font-black text-zinc-900 dark:text-zinc-100">{selectedSchedule.title}</div>
                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-orange-500" />
                  <span>{selectedSchedule.work_location}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {selectedSchedule.shift_start} - {selectedSchedule.shift_end}
                </div>
                <div className="text-[10px] text-zinc-400">{selectedSchedule.total_planned_hours || 8} Total Planned Hours</div>
              </div>
            </div>

            {/* Task list breakdown */}
            <div className="space-y-2">
              <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
                <span>Task Itinerary ({(selectedSchedule.tasks || []).length} items)</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(selectedSchedule.tasks || []).map((t, idx) => (
                  <div key={t.id || idx} className="p-3 rounded-xl surface-card border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded text-[10px]">
                          {t.time_start} - {t.time_end}
                        </span>
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{t.activity}</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        t.priority === 'URGENT' ? 'bg-rose-500/20 text-rose-500' : t.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
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

            {/* Supervisor feedback notes */}
            <div>
              <label className="block font-bold mb-1 text-zinc-700 dark:text-zinc-300">
                Supervisor Feedback Notes & Instructions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Approved. Prioritize retail accounts with overdue invoice balances first..."
                className="form-input w-full text-xs"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSelectedSchedule(null)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewAction('REVISION_REQUESTED')}
                  className="py-2 px-3.5 rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-500/10 text-xs transition flex items-center gap-1"
                >
                  <ThumbsDown size={14} />
                  <span>Request Revision</span>
                </button>

                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewAction('APPROVED')}
                  className="btn-primary py-2 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <ThumbsUp size={14} />
                  <span>Approve Schedule</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
