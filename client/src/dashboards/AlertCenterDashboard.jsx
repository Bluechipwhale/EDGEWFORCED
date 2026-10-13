import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  User,
  Shield,
  MapPin,
  X,
  MessageSquare
} from 'lucide-react';
import { api } from '../lib/api';


export default function AlertCenterDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [severityTab, setSeverityTab] = useState('ALL'); // ALL, CRITICAL, HIGH, MEDIUM, LOW
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Resolution Modal State
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [resolutionAction, setResolutionAction] = useState('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/field/supervisor/alerts');
      setAlerts(res?.data || res || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolveAlert = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setSubmittingResolution(true);
    try {
      await api.post(`/field/supervisor/alerts/${selectedAlert.id}/resolve`, {
        action: resolutionAction,
        resolution_notes: resolutionNotes || 'Resolved by operations supervisor'
      });
      setResolveModalOpen(false);
      loadAlerts();
    } catch (err) {
      alert(err.message || 'Failed to resolve alert');
    } finally {
      setSubmittingResolution(false);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'danger').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH' || a.severity === 'warning').length;
  const openCount = alerts.filter(a => a.status === 'active' || a.status === 'OPEN').length;

  const filteredAlerts = alerts.filter(a => {
    const sev = (a.severity || '').toUpperCase();
    const matchSev = severityTab === 'ALL' || sev === severityTab || (severityTab === 'CRITICAL' && sev === 'DANGER') || (severityTab === 'HIGH' && sev === 'WARNING');
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter || (statusFilter === 'OPEN' && a.status === 'active');
    const matchSearch = !search ||
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.message?.toLowerCase().includes(search.toLowerCase()) ||
      a.employee?.first_name?.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchStatus && matchSearch;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Red Flag & Exception Engine
            </span>
            <span className="text-xs text-zinc-400 font-medium">Real-Time Operational Sentry</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Exception & Alert Command Center
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Automated detection for boundary violations, schedule delays, low battery devices, and unverified completions.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Alerts
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Active Unresolved</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600"><AlertOctagon size={16} /></div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{openCount}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Requires action</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">High / Critical</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><AlertTriangle size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{criticalCount + highCount}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Priority items</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Total Logged</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Info size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{alerts.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">All historical triggers</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Resolved Rate</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {alerts.length > 0 ? Math.round(((alerts.length - openCount) / alerts.length) * 100) : 100}%
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Resolution efficiency</span>
        </div>
      </div>

      {/* Severity Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-bold">
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSeverityTab(tab)}
            className={`px-3.5 py-1.5 rounded-xl transition ${
              severityTab === tab
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert description or officer..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open / Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-xs">
            No exceptions or red flag alerts match the selected criteria.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isResolved = alert.status === 'resolved' || alert.status === 'RESOLVED';
            const isCritical = (alert.severity || '').toUpperCase() === 'CRITICAL' || alert.severity === 'danger';
            return (
              <div
                key={alert.id}
                className={`p-4 bg-white dark:bg-zinc-900 border rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  isCritical
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : isResolved
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-75'
                    : 'border-amber-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                    isCritical
                      ? 'bg-rose-500/10 text-rose-600'
                      : isResolved
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {isResolved ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-zinc-400">
                        {alert.alert_type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical
                          ? 'bg-rose-500 text-white'
                          : alert.severity === 'HIGH' || alert.severity === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isResolved ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600 animate-pulse'
                      }`}>
                        {alert.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {alert.description || alert.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                      {alert.employee && (
                        <span className="flex items-center gap-1">
                          <User size={12} /> {alert.employee.first_name} {alert.employee.last_name} ({alert.employee.employee_code})
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(alert.created_at).toLocaleString()}
                      </span>
                      {alert.resolution_notes && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Resolution: {alert.resolution_notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!isResolved && (
                  <button
                    onClick={() => {
                      setSelectedAlert(alert);
                      setResolveModalOpen(true);
                    }}
                    className="self-start sm:self-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition"
                  >
                    Take Action / Resolve
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Resolution Modal */}
      {resolveModalOpen && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Shield size={16} className="text-orange-500" /> Resolve Exception Alert
              </h3>
              <button onClick={() => setResolveModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResolveAlert} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <span className="text-zinc-400 font-mono block text-[10px]">{selectedAlert.alert_type}</span>
                <p className="font-bold text-zinc-900 dark:text-zinc-100 mt-1">{selectedAlert.description || selectedAlert.message}</p>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Resolution Action</label>
                <select
                  value={resolutionAction}
                  onChange={(e) => setResolutionAction(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  <option value="RESOLVED">RESOLVED (Verified with Officer)</option>
                  <option value="DISMISSED">DISMISSED (False Positive)</option>
                  <option value="INVESTIGATING">INVESTIGATING (Escalated to HR / Operations)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Investigation Notes & Sign-Off</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Officer contacted. Bad GPS signal inside basement confirmed."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolution}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingResolution ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
