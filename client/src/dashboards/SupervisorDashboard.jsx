import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, UserX, Clock, AlertTriangle, MapPin, Store,
  CheckCircle2, ShieldAlert, FileText, Download, Filter, Search,
  Eye, RefreshCw, ChevronRight, X, Phone, Calendar, CalendarCheck, ArrowUpRight,
  Sparkles, Layers, ShieldCheck, Activity, Award, ShoppingCart,
  Building2
} from 'lucide-react';
import SupervisorLiveMap from '../components/maps/SupervisorLiveMap';
import SupervisorScheduleReview from '../components/schedule/SupervisorScheduleReview';
import { apiRequest } from '../utils/api';
import { formatDistance } from '../lib/formatters';

export default function SupervisorDashboard({ user, initialTab = 'radar' }) {
  const [metrics, setMetrics] = useState({
    total_field_force: 0,
    total_field_agents: 0,
    total_sales_agents: 0,
    checked_in: 0,
    not_checked_in: 0,
    currently_active: 0,
    checked_out: 0,
    late: 0,
    absent: 0,
    outside_geofence: 0,
    missing_checkout: 0,
    active_store_visits: 0,
    active_alerts_count: 0
  });

  const [team, setTeam] = useState([]);
  const [stores, setStores] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [storeRequests, setStoreRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL'); // 'ALL' | 'FIELD_AGENT' | 'SALES_AGENT'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'LATE' | 'ALERT' | 'COMPLETED'
  const [territoryFilter, setTerritoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mainTab, setMainTab] = useState(initialTab === 'schedules' ? 'schedules' : 'radar');

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab === 'schedules' ? 'schedules' : 'radar');
    }
  }, [initialTab]);

  // Selected Employee Profile Drawer State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Modal States
  const [isStoreRequestModalOpen, setIsStoreRequestModalOpen] = useState(false);
  const [selectedStoreRequest, setSelectedStoreRequest] = useState(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideAttendanceRecord, setOverrideAttendanceRecord] = useState(null);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportType, setReportType] = useState('attendance');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  // Load Dashboard Data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [metricsRes, teamRes, storesRes, alertsRes, reqsRes] = await Promise.all([
        apiRequest('/field/supervisor/metrics'),
        apiRequest('/field/supervisor/team'),
        apiRequest('/field/stores'),
        apiRequest('/field/supervisor/alerts?status=active'),
        apiRequest('/field/store-requests?status=pending')
      ]);

      setMetrics(metricsRes.data || metricsRes);
      setTeam(teamRes.data || teamRes.team || []);
      setStores(storesRes.data || storesRes.stores || []);
      setAlerts(alertsRes.data || alertsRes.alerts || []);
      setStoreRequests(reqsRes.data || reqsRes.requests || []);
    } catch (err) {
      console.error('Failed to load supervisor telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Fetch Detailed Employee Profile & Timeline
  const openEmployeeProfile = async (emp) => {
    setSelectedEmployee(emp);
    setProfileLoading(true);
    try {
      const res = await apiRequest(`/field/supervisor/employee/${emp.id}`);
      setProfileData(res.data);
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  // Resolve Alert
  const handleResolveAlert = async (alertId) => {
    try {
      await apiRequest(`/field/supervisor/alerts/${alertId}/resolve`, 'POST', {
        resolution_notes: 'Validated and acknowledged by supervisor'
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to resolve alert');
    }
  };

  // Approve Store Request
  const handleApproveStoreRequest = async (requestId) => {
    try {
      await apiRequest(`/field/store-requests/${requestId}/approve`, 'POST', {
        geofence_radius: 150
      });
      setIsStoreRequestModalOpen(false);
      setSelectedStoreRequest(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to approve store request');
    }
  };

  // Reject Store Request
  const handleRejectStoreRequest = async (requestId) => {
    const reason = prompt('Enter rejection reason:') || 'Physical verification did not meet company criteria';
    try {
      await apiRequest(`/field/store-requests/${requestId}/reject`, 'POST', {
        rejection_reason: reason
      });
      setIsStoreRequestModalOpen(false);
      setSelectedStoreRequest(null);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to reject store request');
    }
  };

  // Submit Attendance Override
  const handleSubmitOverride = async () => {
    if (!overrideAttendanceRecord) return;
    try {
      await apiRequest('/field/supervisor/override-attendance', 'POST', {
        attendance_id: overrideAttendanceRecord.id,
        action: 'APPROVE_MISSING_CHECKOUT',
        notes: overrideNotes || 'Supervisor manual shift completion override'
      });
      setIsOverrideModalOpen(false);
      setOverrideAttendanceRecord(null);
      fetchDashboardData();
      if (selectedEmployee) openEmployeeProfile(selectedEmployee);
    } catch (err) {
      alert(err.message || 'Failed to override attendance');
    }
  };

  // Generate Daily EOD Summary
  const handleGenerateEODSummary = async () => {
    try {
      const res = await apiRequest('/field/supervisor/daily-summary', 'POST');
      alert(`✓ Daily Team Summary Generated!\nTotal Team: ${res.data.total_members} | Present: ${res.data.present} | Visits: ${res.data.store_visits} | Sales: ₦${Number(res.data.sales_generated).toLocaleString()}`);
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to generate EOD summary');
    }
  };

  // Load Reports
  const handleOpenReports = async (type = 'attendance') => {
    setReportType(type);
    setIsReportModalOpen(true);
    setReportLoading(true);
    try {
      const res = await apiRequest(`/field/reports?reportType=${type}`);
      setReportData(res.data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Filter Team Members
  const filteredTeam = team.filter(emp => {
    if (roleFilter !== 'ALL' && emp.role_code !== roleFilter) return false;
    if (territoryFilter !== 'ALL' && emp.territory !== territoryFilter) return false;
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && emp.status_color !== 'GREEN') return false;
      if (statusFilter === 'LATE' && emp.status_color !== 'YELLOW') return false;
      if (statusFilter === 'ALERT' && emp.status_color !== 'RED') return false;
      if (statusFilter === 'COMPLETED' && emp.status_color !== 'GREY') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchCode = emp.employee_code.toLowerCase().includes(q);
      const matchStore = emp.store?.name?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchStore) return false;
    }
    return true;
  });

  // Unique Territories for Filter
  const territories = Array.from(new Set(stores.map(s => s.territory).filter(Boolean)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Field Force Supervisor Command Center
          </div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Field & Sales Operations Visibility
          </h1>
          <p className="text-sm text-zinc-500">
            Real-time GPS tracking, 150m store geofencing, team presence & automated telemetry
          </p>
        </div>

        {/* Quick Command Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMainTab(mainTab === 'schedules' ? 'radar' : 'schedules')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ${
              mainTab === 'schedules'
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Team Daily Schedules
          </button>

          <button
            type="button"
            onClick={() => setIsStoreRequestModalOpen(true)}
            className="px-3.5 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Store className="w-4 h-4 text-primary" />
            Store Requests ({storeRequests.length})
          </button>

          <button
            type="button"
            onClick={() => handleOpenReports('attendance')}
            className="px-3.5 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-primary" />
            Reports & Export
          </button>

          <button
            type="button"
            onClick={handleGenerateEODSummary}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate EOD Summary
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setMainTab('radar')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            mainTab === 'radar'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <MapPin size={14} />
          <span>Workforce 360 Radar & Live Map</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('schedules')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            mainTab === 'schedules'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <CalendarCheck size={14} />
          <span>Team Daily Schedules & Route Reviews</span>
        </button>
      </div>

      {mainTab === 'schedules' ? (
        <SupervisorScheduleReview user={user} />
      ) : (
        <>
          {/* KPI Stats Counter Grid (10 Requirement Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Field Force */}
        <div className="surface-card p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold mb-1">
            <span>Total Team</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">
            {metrics.total_field_force || team.length}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {metrics.total_field_agents} Field &bull; {metrics.total_sales_agents} Sales
          </div>
        </div>

        {/* Card 2: Checked In */}
        <div className="surface-card p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
            <span>Checked In</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.checked_in}
          </div>
          <div className="text-[10px] text-emerald-600/70 mt-0.5">
            {metrics.currently_active} active shifts now
          </div>
        </div>

        {/* Card 3: Not Checked In */}
        <div className="surface-card p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold mb-1">
            <span>Not Checked In</span>
            <UserX className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-700 dark:text-zinc-300">
            {metrics.not_checked_in}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Pending morning check-in
          </div>
        </div>

        {/* Card 4: Late Arrivals */}
        <div className="surface-card p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">
            <span>Late Check-in</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.late}
          </div>
          <div className="text-[10px] text-amber-600/70 mt-0.5">
            Arrived past 08:30 AM
          </div>
        </div>

        {/* Card 5: Outside Geofence */}
        <div className="surface-card p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 shadow-sm">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold mb-1">
            <span>Outside Geofence</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {metrics.outside_geofence}
          </div>
          <div className="text-[10px] text-rose-600/70 mt-0.5">
            &gt; 150m from store
          </div>
        </div>

        {/* Card 6: Active Store Visits */}
        <div className="surface-card p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold mb-1">
            <span>Store Visits</span>
            <Store className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">
            {metrics.active_store_visits}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Audits in progress
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Live Map (Left/Center) + Alerts & Action Queue (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Live Map (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Live Field Force Radar Map
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              Showing {stores.length} Geofenced Stores &bull; {filteredTeam.length} Active Agents
            </span>
          </div>

          <SupervisorLiveMap
            team={filteredTeam}
            stores={stores}
            selectedEmployee={selectedEmployee}
            onSelectEmployee={openEmployeeProfile}
            height="520px"
            onRefresh={fetchDashboardData}
          />
        </div>

        {/* Right Side: Active Telemetry Alerts & EOD Overview */}
        <div className="space-y-4">
          {/* Active Alerts Queue */}
          <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Live Alert Queue</h3>
                  <p className="text-[11px] text-zinc-500">Automated exception notifications</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs font-bold">
                {alerts.length}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[320px] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-400">
                  ✓ Zero active alerts. All field agents operating within assigned geofence boundaries.
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[10px]">
                        {alert.alert_type}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResolveAlert(alert.id)}
                        className="px-2.5 py-1 bg-white dark:bg-zinc-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-zinc-200 dark:border-zinc-600 rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Resolve Alert
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Store Requests Card */}
          <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Store Approvals</h3>
              </div>
              <span className="text-xs font-bold text-primary">
                {storeRequests.length} Pending
              </span>
            </div>

            <div className="mt-3 space-y-2 max-h-[160px] overflow-y-auto">
              {storeRequests.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-400">
                  No pending store registration requests.
                </div>
              ) : (
                storeRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">{req.store_name}</div>
                      <div className="text-[10px] text-zinc-500">{req.territory} &bull; GPS verified</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApproveStoreRequest(req.id)}
                        className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs"
                        title="Approve 150m Geofenced Store"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectStoreRequest(req.id)}
                        className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs"
                        title="Reject Store"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Supervisor Team Table & Multi-Filtering */}
      <div className="surface-card rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Field Force Live Status Directory ({filteredTeam.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search agent name, code, store..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-none w-48"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="FIELD_AGENT">Field Agents</option>
              <option value="SALES_AGENT">Sales Agents</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (Green)</option>
              <option value="LATE">Attention/Late (Yellow)</option>
              <option value="ALERT">Alert/Outside (Red)</option>
              <option value="COMPLETED">Shift Concluded (Grey)</option>
            </select>

            {/* Territory Filter */}
            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="ALL">All Territories</option>
              {territories.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role & Territory</th>
                <th className="py-3 px-4">Assigned Store</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Geofence Status</th>
                <th className="py-3 px-4">Store Distance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No team members matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTeam.map(emp => {
                  const isSales = emp.role_code === 'SALES_AGENT';

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => openEmployeeProfile(emp)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      {/* Employee Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-zinc-400">{emp.employee_code} &bull; {emp.phone}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Territory */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isSales ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-orange-500/10 text-primary'
                        }`}>
                          {emp.role}
                        </span>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{emp.territory || 'Lagos'}</div>
                      </td>

                      {/* Store */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {emp.store?.name || 'Unassigned Store'}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Radius: {emp.store?.radius || 150}m
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {emp.check_in_time ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {new Date(emp.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        {emp.check_out_time ? (
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {new Date(emp.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                        {emp.duration}
                      </td>

                      {/* Status Color Pill */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-xs ${
                          emp.status_color === 'GREEN' ? 'bg-emerald-600' :
                          emp.status_color === 'YELLOW' ? 'bg-amber-500' :
                          emp.status_color === 'RED' ? 'bg-rose-600 animate-pulse' :
                          'bg-zinc-500'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          {emp.status_label}
                        </span>
                      </td>

                      {/* Distance */}
                      <td className="py-3 px-4">
                        <span className={`font-mono text-xs ${
                          emp.distance_meters > (emp.store?.radius || 150) ? 'text-rose-600 font-bold' : 'text-zinc-600 dark:text-zinc-400'
                        }`}>
                          {emp.formatted_distance || formatDistance(emp.distance_meters || 0)}
                        </span>
                      </td>


                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeProfile(emp);
                          }}
                          className="p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-primary hover:text-white text-zinc-700 dark:text-zinc-300 rounded-lg transition-all"
                          title="View Employee Profile & Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-Over Employee Detail Profile & Timeline Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[2500] flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-xl h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-slide-left">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                  {selectedEmployee.first_name[0]}{selectedEmployee.last_name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {selectedEmployee.name}
                  </h3>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>{selectedEmployee.role}</span> &bull;
                    <span>{selectedEmployee.employee_code}</span> &bull;
                    <span className="text-primary font-semibold">{selectedEmployee.territory}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {profileLoading ? (
                <div className="py-20 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  Loading comprehensive field telemetry...
                </div>
              ) : profileData ? (
                <>
                  {/* Section 1: Attendance & Shift Stats */}
                  <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Attendance & Working Shift
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                        <div className="text-zinc-400 text-[10px]">Check-In Time</div>
                        <div className="font-bold text-zinc-900 dark:text-white mt-0.5">
                          {profileData.attendance?.check_in_time ? new Date(profileData.attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                        <div className="text-zinc-400 text-[10px]">Working Duration</div>
                        <div className="font-bold text-primary mt-0.5">
                          {profileData.attendance?.working_duration || '—'}
                        </div>
                      </div>
                      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                        <div className="text-zinc-400 text-[10px]">Lateness</div>
                        <div className="font-bold text-amber-600 mt-0.5">
                          {profileData.attendance?.late_duration || '0m'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Location Telemetry */}
                  <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-primary" /> Location Radar & Geofence Status
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500">Current Address:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profileData.location?.current_location}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500">Assigned Store:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{profileData.location?.assigned_store}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500">Distance from Geofence:</span>
                        <span className={`font-bold ${profileData.location?.distance_from_store > 150 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {profileData.location?.distance_from_store ? `${Math.round(profileData.location.distance_from_store)}m` : '0m'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Field Activities vs Sales Performance */}
                  {selectedEmployee.role_code === 'SALES_AGENT' ? (
                    <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-blue-500" /> Commercial Sales Performance
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <div className="text-zinc-500 text-[10px]">Monthly Target</div>
                          <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            ₦{Number(profileData.sales_activity?.sales_target || 10000000).toLocaleString()}
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                          <div className="text-zinc-500 text-[10px]">Sales Achieved ({profileData.sales_activity?.achievement_percentage}%)</div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ₦{Number(profileData.sales_activity?.sales_achieved || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="surface-card p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-primary" /> Field Operations Audits
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                          <div className="text-2xl font-black text-zinc-900 dark:text-white">{profileData.field_activity?.stores_visited}</div>
                          <div className="text-[10px] text-zinc-400">Stores Visited</div>
                        </div>
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                          <div className="text-2xl font-black text-emerald-600">{profileData.field_activity?.tasks_completed}</div>
                          <div className="text-[10px] text-zinc-400">Tasks Done</div>
                        </div>
                        <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                          <div className="text-2xl font-black text-primary">{profileData.field_activity?.photos_uploaded}</div>
                          <div className="text-[10px] text-zinc-400">Photos Proof</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 4: Chronological Daily Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" /> Daily Chronological Event Trace
                    </h4>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                      {profileData.timeline && profileData.timeline.length > 0 ? (
                        profileData.timeline.map((event, idx) => (
                          <div key={idx} className="relative text-xs">
                            <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-primary border-2 border-white dark:border-zinc-900" />
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center justify-between">
                              <span>{event.title}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-[11px] mt-0.5">{event.description}</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-zinc-400 py-3">No activity events recorded yet today.</div>
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
      </>
    )}

      {/* Store Request Review Modal */}
      {isStoreRequestModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="surface-card rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Store Registration Requests</h3>
              </div>
              <button onClick={() => setIsStoreRequestModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {storeRequests.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400">
                  No pending store registration requests.
                </div>
              ) : (
                storeRequests.map(req => (
                  <div key={req.id} className="p-4 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-zinc-900 dark:text-white">{req.store_name}</div>
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-bold rounded-full">
                        Pending Approval
                      </span>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300">{req.address}</div>
                    <div className="text-[11px] text-zinc-500">
                      Territory: <b>{req.territory}</b> &bull; GPS: {Number(req.latitude).toFixed(5)}, {Number(req.longitude).toFixed(5)} (±{req.accuracy}m)
                    </div>
                    {req.notes && (
                      <div className="text-[11px] text-zinc-500 italic bg-white dark:bg-zinc-900 p-2 rounded-lg">
                        "{req.notes}"
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() => handleRejectStoreRequest(req.id)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveStoreRequest(req.id)}
                        className="px-4 py-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve & Set 150m Geofence
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reports & Export Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="surface-card rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Field Force Reports & Export</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Report Type Selector */}
            <div className="flex items-center gap-2 mt-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
              {['attendance', 'location', 'activity', 'sales'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleOpenReports(type)}
                  className={`flex-1 py-2 rounded-lg capitalize transition-all ${
                    reportType === type ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm' : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {type} Report
                </button>
              ))}
            </div>

            {/* Report Table */}
            <div className="mt-4 overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl max-h-[400px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/60 dark:bg-zinc-800/60 text-zinc-500 font-bold uppercase text-[10px] sticky top-0">
                  <tr>
                    {reportType === 'attendance' && (
                      <>
                        <th className="p-3">Date</th>
                        <th className="p-3">Staff Name</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Store</th>
                        <th className="p-3">Check-In</th>
                        <th className="p-3">Check-Out</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                      </>
                    )}
                    {reportType === 'location' && (
                      <>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3">Staff</th>
                        <th className="p-3">Address</th>
                        <th className="p-3">Activity</th>
                        <th className="p-3">Geofence Verified</th>
                        <th className="p-3">Distance</th>
                      </>
                    )}
                    {reportType === 'activity' && (
                      <>
                        <th className="p-3">Date</th>
                        <th className="p-3">Agent</th>
                        <th className="p-3">Store</th>
                        <th className="p-3">Purpose</th>
                        <th className="p-3">Shelf Share %</th>
                        <th className="p-3">Duration</th>
                        <th className="p-3">Status</th>
                      </>
                    )}
                    {reportType === 'sales' && (
                      <>
                        <th className="p-3">Order #</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Sales Agent</th>
                        <th className="p-3">Customer / Store</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Payment</th>
                        <th className="p-3">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {reportLoading ? (
                    <tr><td colSpan={8} className="p-6 text-center text-zinc-400">Loading records...</td></tr>
                  ) : reportData.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-zinc-400">No records found.</td></tr>
                  ) : (
                    reportData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        {reportType === 'attendance' && (
                          <>
                            <td className="p-3 font-mono">{row.date}</td>
                            <td className="p-3 font-bold text-zinc-900 dark:text-white">{row.employee_name}</td>
                            <td className="p-3">{row.role}</td>
                            <td className="p-3">{row.store_name}</td>
                            <td className="p-3 font-mono">{row.check_in_time ? new Date(row.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="p-3 font-mono">{row.check_out_time ? new Date(row.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="p-3 font-bold">{row.working_duration_text || `${row.working_hours}h`}</td>
                            <td className="p-3 font-bold text-emerald-600">{row.status}</td>
                          </>
                        )}
                        {reportType === 'location' && (
                          <>
                            <td className="p-3 font-mono">{new Date(row.timestamp).toLocaleTimeString()}</td>
                            <td className="p-3 font-bold">{row.employee_name}</td>
                            <td className="p-3">{row.address}</td>
                            <td className="p-3">{row.current_activity}</td>
                            <td className="p-3 font-bold">{row.is_inside_geofence ? '✓ Inside' : 'Outside'}</td>
                            <td className="p-3 font-mono">{Math.round(row.distance_from_store || 0)}m</td>
                          </>
                        )}
                        {reportType === 'activity' && (
                          <>
                            <td className="p-3 font-mono">{row.date}</td>
                            <td className="p-3 font-bold">{row.agent_name}</td>
                            <td className="p-3">{row.store_name}</td>
                            <td className="p-3">{row.visit_purpose}</td>
                            <td className="p-3 font-bold">{row.shelf_share_percent}%</td>
                            <td className="p-3">{row.duration_minutes}m</td>
                            <td className="p-3 font-bold text-emerald-600">{row.status}</td>
                          </>
                        )}
                        {reportType === 'sales' && (
                          <>
                            <td className="p-3 font-mono font-bold text-primary">{row.order_number}</td>
                            <td className="p-3 font-mono">{row.order_date}</td>
                            <td className="p-3 font-bold">{row.sales_agent}</td>
                            <td className="p-3">{row.customer_name}</td>
                            <td className="p-3 font-bold">₦{Number(row.total_amount).toLocaleString()}</td>
                            <td className="p-3">{row.payment_method}</td>
                            <td className="p-3 font-bold text-emerald-600">{row.status}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Export Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Showing {reportData.length} records</span>
              <button
                type="button"
                onClick={() => {
                  const jsonStr = JSON.stringify(reportData, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `edgewforce_${reportType}_report_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export JSON / CSV Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
