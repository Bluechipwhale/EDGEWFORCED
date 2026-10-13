import React, { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronRight,
  Award,
  Phone,
  Mail,
  Building,
  MapPin,
  Plus,
  ArrowUpDown,
  Move,
  Edit3,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  TrendingDown,
  Grid,
  Layers,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { api } from '../../lib/api';

const RANK_LEVEL_CONFIG = {
  CEO: { label: 'Level 1: Executive Leadership', level: 1, color: 'from-orange-500 to-amber-500', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  CTO: { label: 'Level 2: Technology & Strategy', level: 2, color: 'from-blue-600 to-cyan-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  HR: { label: 'Level 3: People & Governance', level: 3, color: 'from-purple-600 to-pink-500', badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  ACCOUNTANT: { label: 'Level 4: Financial Controllership', level: 4, color: 'from-emerald-600 to-teal-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  SENIOR_ACCOUNTANT: { label: 'Level 4: Financial Controllership', level: 4, color: 'from-emerald-600 to-teal-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  MANAGER: { label: 'Level 6: Regional Management', level: 6, color: 'from-indigo-600 to-blue-500', badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' },
  SUPERVISOR: { label: 'Level 7: Field & Team Supervision', level: 7, color: 'from-amber-600 to-yellow-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  STAFF: { label: 'Level 8: Commercial & Field Operations', level: 8, color: 'from-zinc-600 to-zinc-700', badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' }
};

export default function OrgChartTree({ organizationData, orgTree, user, onRefresh }) {
  const data = organizationData || orgTree;
  const userRole = String(user?.role_code || user?.role || '').toUpperCase();
  const isHrOrCeo = ['HR', 'HR_MANAGER', 'CEO', 'SUPER_ADMIN', 'ADMIN', 'IT_ADMIN'].includes(userRole);

  const [viewMode, setViewMode] = useState('hierarchy'); // 'hierarchy' | 'department'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Add Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    position: '',
    department: 'Commercial Sales',
    rank_code: 'STAFF',
    reporting_manager_id: '',
    territory: 'Lagos Island',
    base_salary: 350000,
    housing_allowance: 120000,
    transport_allowance: 60000
  });

  // Reassign Form State
  const [reassignData, setReassignData] = useState({
    reporting_manager_id: '',
    department: '',
    rank_code: '',
    position: '',
    territory: ''
  });

  if (!data) {
    return (
      <div className="p-8 text-center text-zinc-400 text-xs">
        Loading organizational structure data…
      </div>
    );
  }

  const {
    ceo,
    executives = [],
    managers = [],
    supervisors = [],
    operationalStaff = [],
    all = [],
    department_groups = {},
    ranks = []
  } = data;

  const allStaff = all && all.length > 0 ? all : [ceo, ...executives, ...managers, ...supervisors, ...operationalStaff].filter(Boolean);

  // Open Reassign / Move Modal for a specific card
  const handleOpenReassign = (emp, e) => {
    e?.stopPropagation();
    setActiveCard(emp);
    setReassignData({
      reporting_manager_id: emp.reporting_manager_id || '',
      department: emp.department || 'Commercial Sales',
      rank_code: emp.rank_code || emp.rank?.code || 'STAFF',
      position: emp.position || '',
      territory: emp.territory || 'Lagos'
    });
    setErrorMsg('');
    setReassignModalOpen(true);
  };

  // Open Add Modal with optional pre-selected manager
  const handleOpenAdd = (managerId = '') => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      department: 'Commercial Sales',
      rank_code: 'STAFF',
      reporting_manager_id: managerId ? String(managerId) : '',
      territory: 'Lagos Island',
      base_salary: 350000,
      housing_allowance: 120000,
      transport_allowance: 60000
    });
    setErrorMsg('');
    setAddModalOpen(true);
  };

  // Submit New Org Node
  const handleCreateNode = async (e) => {
    e?.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.position) {
      setErrorMsg('Please fill in required name, email, and position.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await api.post('/hr/employees/register', formData);
      setStatusMsg(`Successfully added ${formData.first_name} ${formData.last_name} to the organization.`);
      setAddModalOpen(false);
      onRefresh?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to add organization node.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Reassign / Move Card
  const handleSaveReassignment = async (e) => {
    e?.preventDefault();
    if (!activeCard) return;

    setLoading(true);
    setErrorMsg('');
    try {
      await api.put(`/hr/organization/node/${activeCard.id}`, reassignData);
      setStatusMsg(`Organization structure updated for ${activeCard.first_name} ${activeCard.last_name}.`);
      setReassignModalOpen(false);
      onRefresh?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reassign organization node.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Promote / Demote
  const handleRankShift = async (emp, direction, e) => {
    e?.stopPropagation();
    const rankSequence = ['CEO', 'CTO', 'HR', 'ACCOUNTANT', 'MANAGER', 'SUPERVISOR', 'STAFF'];
    const currentIdx = rankSequence.indexOf(emp.rank_code || 'STAFF');
    let nextIdx = currentIdx;

    if (direction === 'promote' && currentIdx > 0) {
      nextIdx = currentIdx - 1;
    } else if (direction === 'demote' && currentIdx < rankSequence.length - 1) {
      nextIdx = currentIdx + 1;
    }

    if (nextIdx === currentIdx) return;
    const newRank = rankSequence[nextIdx];

    try {
      await api.put(`/hr/organization/node/${emp.id}`, { rank_code: newRank });
      setStatusMsg(`${emp.first_name} ${emp.last_name} rank updated to ${newRank}.`);
      onRefresh?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to adjust rank.');
    }
  };

  // Delete / Remove Node
  const handleDeleteNode = async (emp, e) => {
    e?.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove ${emp.first_name} ${emp.last_name} from the active organization structure?`)) {
      return;
    }

    try {
      await api.delete(`/hr/organization/node/${emp.id}`);
      setStatusMsg(`Removed ${emp.first_name} ${emp.last_name} from active hierarchy.`);
      if (selectedEmployee?.id === emp.id) setSelectedEmployee(null);
      onRefresh?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove employee.');
    }
  };

  // Filter staff by search and department
  const filterEmployee = (emp) => {
    if (!emp) return false;
    if (selectedDeptFilter !== 'ALL' && emp.department !== selectedDeptFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const pos = (emp.position || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    const code = (emp.employee_code || '').toLowerCase();
    const rankName = (emp.rank_code || emp.rank?.name || '').toLowerCase();
    return name.includes(q) || pos.includes(q) || dept.includes(q) || code.includes(q) || rankName.includes(q);
  };

  const departmentsList = Object.keys(department_groups).length > 0
    ? Object.keys(department_groups)
    : ['Commercial Sales', 'Field Operations', 'Executive Leadership', 'Human Resources', 'Accounting & Payroll', 'Technology & Systems'];

  // Card Component
  const OrgCard = ({ emp, isLeader = false }) => {
    if (!emp || !filterEmployee(emp)) return null;
    const isSelected = selectedEmployee?.id === emp.id;
    const rankCfg = RANK_LEVEL_CONFIG[emp.rank_code] || RANK_LEVEL_CONFIG.STAFF;
    const directReports = allStaff.filter(s => Number(s.reporting_manager_id) === Number(emp.id));

    return (
      <div
        onClick={() => setSelectedEmployee(emp)}
        className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none text-left flex flex-col justify-between ${
          isSelected
            ? 'border-orange-500 bg-orange-500/10 shadow-lg ring-2 ring-orange-500/30'
            : isLeader
            ? 'surface-card border-orange-500/50 shadow-md bg-gradient-to-b from-orange-500/5 to-transparent'
            : 'surface-card border-zinc-200 dark:border-zinc-800 hover:border-orange-500/40 hover:shadow-md'
        }`}
      >
        {/* Card Header: Avatar, Name & Code */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${rankCfg.color} text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0`}>
                {emp.first_name?.charAt(0) || 'E'}
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-orange-500 transition">
                  {emp.first_name} {emp.last_name}
                </div>
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                  {emp.position || 'Operations Officer'}
                </div>
              </div>
            </div>

            <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-500">
              {emp.employee_code}
            </span>
          </div>

          {/* Department & Rank Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${rankCfg.badge}`}>
              {emp.rank_code || emp.rank?.name || 'Staff'} (L{emp.rank?.level || rankCfg.level})
            </span>
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {emp.department || 'Operations'}
            </span>
          </div>

          {/* Reporting Chain & Subordinates Info */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1 text-[10px]">
            {emp.manager_name ? (
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span>Reports to:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-200 truncate max-w-[130px]">
                  {emp.manager_name}
                </span>
              </div>
            ) : isLeader ? (
              <div className="text-orange-500 font-bold text-[9px] uppercase tracking-wider">
                ★ Apex Executive Node
              </div>
            ) : (
              <div className="text-zinc-400 text-[9px]">
                Direct Board Reporting
              </div>
            )}

            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
              <span>Direct Subordinates:</span>
              <span className={`font-bold ${directReports.length > 0 ? 'text-orange-500' : 'text-zinc-400'}`}>
                👥 {directReports.length} {directReports.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Quick Action Bar */}
        <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-1">
          <button
            onClick={(e) => handleOpenReassign(emp, e)}
            title="Move / Reassign Position & Reporting Superior"
            className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-bold flex items-center gap-1 transition"
          >
            <Move size={12} />
            <span>Move / Reassign</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => handleRankShift(emp, 'promote', e)}
              title="Promote Hierarchy Level"
              className="p-1 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition"
            >
              <TrendingUp size={13} />
            </button>
            <button
              onClick={(e) => handleRankShift(emp, 'demote', e)}
              title="Demote Hierarchy Level"
              className="p-1 rounded-md text-amber-500 hover:bg-amber-500/10 transition"
            >
              <TrendingDown size={13} />
            </button>
            <button
              onClick={() => handleOpenAdd(emp.id)}
              title="Add Subordinate under this card"
              className="p-1 rounded-md text-blue-500 hover:bg-blue-500/10 transition"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={(e) => handleDeleteNode(emp, e)}
              title="Remove from Org Chart"
              className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* Control Bar & Action Buttons */}
      <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* View Toggles & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                onClick={() => setViewMode('hierarchy')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'hierarchy'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Governance Hierarchy View</span>
              </button>
              <button
                onClick={() => setViewMode('department')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'department'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-white'
                }`}
              >
                <Grid size={14} />
                <span>Department Matrix View</span>
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="form-input bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs py-1.5 px-3 rounded-xl"
            >
              <option value="ALL">All Departments ({allStaff.length})</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Action & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search staff, rank, role…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs py-1.5 pl-8 pr-3 rounded-xl w-48 sm:w-56"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
            </div>

            <button
              onClick={() => handleOpenAdd('')}
              className="btn-primary text-xs py-2 px-4 shadow-md shadow-orange-500/20 font-bold flex items-center gap-1.5"
            >
              <Plus size={15} />
              <span>Input Organization Structure</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{statusMsg}</span>
            </div>
            <button onClick={() => setStatusMsg('')} className="text-zinc-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-zinc-400 hover:text-white"><X size={14} /></button>
          </div>
        )}

        {/* Quick Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
            <span className="text-zinc-500">Total Personnel:</span>
            <b className="text-zinc-900 dark:text-zinc-100">{allStaff.length} Nodes</b>
          </div>
          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
            <span className="text-zinc-500">Departments:</span>
            <b className="text-zinc-900 dark:text-zinc-100">{departmentsList.length} Units</b>
          </div>
          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
            <span className="text-zinc-500">Managers & Leads:</span>
            <b className="text-zinc-900 dark:text-zinc-100">{managers.length + supervisors.length} Leads</b>
          </div>
          <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
            <span className="text-zinc-500">Field & Commercial:</span>
            <b className="text-zinc-900 dark:text-zinc-100">{operationalStaff.length} Agents</b>
          </div>
        </div>
      </div>

      {/* MODE 1: GOVERNANCE HIERARCHY TIER VIEW */}
      {viewMode === 'hierarchy' && (
        <div className="space-y-8">
          {/* TIER 1: EXECUTIVE LEADERSHIP (LEVEL 1) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-500 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20">
                Tier 1: Executive Leadership & Governance (Level 1)
              </span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>
            <div className="max-w-md mx-auto">
              <OrgCard emp={ceo} isLeader={true} />
            </div>
          </div>

          {/* TIER 2: CORPORATE DEPARTMENT HEADS (LEVELS 2–5) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                Tier 2: Corporate Department Heads & Controllers (Levels 2–5)
              </span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {executives.map((emp) => (
                <OrgCard key={emp.id} emp={emp} />
              ))}
            </div>
          </div>

          {/* TIER 3: REGIONAL MANAGERS & AREA LEADS (LEVEL 6) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                Tier 3: Regional Commercial & Territory Managers (Level 6)
              </span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {managers.map((emp) => (
                <OrgCard key={emp.id} emp={emp} />
              ))}
            </div>
          </div>

          {/* TIER 4: FIELD SUPERVISORS & TEAM LEADS (LEVEL 7) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                Tier 4: Field Operations & Sales Supervisors (Level 7)
              </span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {supervisors.map((emp) => (
                <OrgCard key={emp.id} emp={emp} />
              ))}
            </div>
          </div>

          {/* TIER 5: COMMERCIAL SALES & FIELD OPERATIONS STAFF (LEVEL 8) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 px-3 py-1 rounded-full bg-zinc-500/10 border border-zinc-500/20">
                Tier 5: Commercial POS Sales & Field Audit Agents (Level 8)
              </span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {operationalStaff.map((emp) => (
                <OrgCard key={emp.id} emp={emp} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DEPARTMENT MATRIX VIEW */}
      {viewMode === 'department' && (
        <div className="space-y-6">
          {departmentsList.map((deptName) => {
            const deptStaff = allStaff.filter((e) => (e.department || 'Commercial Operations') === deptName);
            if (deptStaff.length === 0 && selectedDeptFilter !== 'ALL') return null;

            return (
              <div key={deptName} className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Building size={18} className="text-orange-500" />
                    <div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{deptName}</h4>
                      <div className="text-[10px] text-zinc-500">
                        {deptStaff.length} active personnel in department
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, department: deptName }));
                      handleOpenAdd('');
                    }}
                    className="btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1"
                  >
                    <Plus size={13} />
                    <span>Add to {deptName}</span>
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {deptStaff.map((emp) => (
                    <OrgCard key={emp.id} emp={emp} isLeader={emp.id === ceo?.id} />
                  ))}
                  {deptStaff.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-zinc-400">
                      No personnel currently assigned to {deptName}. Click "+ Add" to input staff.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SELECTED EMPLOYEE PROFILE INSPECTOR MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg surface-card rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-5 animate-fade-in text-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                  {selectedEmployee.first_name?.charAt(0) || 'E'}
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <div className="text-xs text-zinc-400 font-semibold">
                    {selectedEmployee.position} • {selectedEmployee.department}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Employee Code:</span>
                <b className="font-mono text-zinc-200">{selectedEmployee.employee_code}</b>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Rank Hierarchy Level:</span>
                <b className="text-orange-400">{selectedEmployee.rank_code || 'STAFF'} (Level {selectedEmployee.rank?.level || 8})</b>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Reporting Superior:</span>
                <b className="text-zinc-200">{selectedEmployee.manager_name || 'Chief Executive / Apex'}</b>
              </div>
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Operating Territory:</span>
                <b className="text-zinc-200">{selectedEmployee.territory || 'Lagos HQ'}</b>
              </div>
              {isHrOrCeo && (
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Base Compensation:</span>
                  <b className="text-zinc-200">{formatMoney(selectedEmployee.base_salary)}</b>
                </div>
              )}
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px]">Corporate Email:</span>
                <b className="text-zinc-200 truncate block">{selectedEmployee.email || 'name@edgewforce.com'}</b>
              </div>
            </div>

            {/* Direct Reports Under This Card */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Direct Reportees ({allStaff.filter(s => Number(s.reporting_manager_id) === Number(selectedEmployee.id)).length})
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {allStaff
                  .filter(s => Number(s.reporting_manager_id) === Number(selectedEmployee.id))
                  .map(sub => (
                    <div key={sub.id} className="p-2 rounded-lg bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between text-xs">
                      <div>
                        <b>{sub.first_name} {sub.last_name}</b>
                        <span className="text-zinc-500 text-[10px] ml-1.5">({sub.position})</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold">{sub.rank_code}</span>
                    </div>
                  ))}
                {allStaff.filter(s => Number(s.reporting_manager_id) === Number(selectedEmployee.id)).length === 0 && (
                  <div className="p-3 text-center text-xs text-zinc-500 bg-zinc-900/30 rounded-xl">
                    No direct subordinates assigned.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-zinc-800">
              <button
                onClick={(e) => {
                  setSelectedEmployee(null);
                  handleOpenReassign(selectedEmployee, e);
                }}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Move size={14} />
                <span>Move / Reassign Position</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: INPUT / ADD ORGANIZATION STRUCTURE NODE */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl surface-card rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-5 animate-fade-in text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Input Organization Structure Node</h3>
                  <p className="text-[11px] text-zinc-400">
                    Add new governance role, department position, or employee to the hierarchy.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateNode} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="e.g. Babatunde"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="e.g. Adebayo"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="babatunde@edgewforce.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="+2348030000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Position / Designation Title *</label>
                  <input
                    type="text"
                    required
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="e.g. Regional Commercial Lead"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Department Unit *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                  >
                    <option value="Commercial Sales">Commercial Sales</option>
                    <option value="Field Operations">Field Operations</option>
                    <option value="Executive Leadership">Executive Leadership</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Accounting & Payroll">Accounting & Payroll</option>
                    <option value="Technology & Systems">Technology & Systems</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Rank Hierarchy Level *</label>
                  <select
                    value={formData.rank_code}
                    onChange={(e) => setFormData({ ...formData, rank_code: e.target.value })}
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                  >
                    <option value="CEO">Level 1: CEO / Managing Director</option>
                    <option value="CTO">Level 2: Chief Technology Officer</option>
                    <option value="HR">Level 3: Head of Human Resources</option>
                    <option value="ACCOUNTANT">Level 4: Financial Controller</option>
                    <option value="MANAGER">Level 6: Regional / Area Manager</option>
                    <option value="SUPERVISOR">Level 7: Field / Sales Supervisor</option>
                    <option value="STAFF">Level 8: Commercial Sales & Field Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Reports To (Superior Node)</label>
                  <select
                    value={formData.reporting_manager_id}
                    onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                  >
                    <option value="">None (Top-Level / CEO)</option>
                    {allStaff.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.first_name} {mgr.last_name} ({mgr.position} • {mgr.rank_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Base Salary (₦/mo)</label>
                  <input
                    type="number"
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2 font-mono"
                    value={formData.base_salary}
                    onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Housing Allow. (₦)</label>
                  <input
                    type="number"
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2 font-mono"
                    value={formData.housing_allowance}
                    onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-300 mb-1">Territory Hub</label>
                  <input
                    type="text"
                    className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                    placeholder="Lagos Mainland"
                    value={formData.territory}
                    onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs py-2 px-5 font-bold"
                >
                  {loading ? 'Creating Node…' : 'Save & Insert Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MOVE / REASSIGN ORGANIZATION STRUCTURE CARD */}
      {reassignModalOpen && activeCard && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md surface-card rounded-2xl p-6 border border-zinc-800 shadow-2xl space-y-5 animate-fade-in text-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                  <Move size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Move & Reassign Card</h3>
                  <p className="text-[11px] text-zinc-400">
                    Reposition {activeCard.first_name} {activeCard.last_name} within the structure.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveReassignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-300 mb-1">Reassign Reporting Superior</label>
                <select
                  value={reassignData.reporting_manager_id}
                  onChange={(e) => setReassignData({ ...reassignData, reporting_manager_id: e.target.value })}
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                >
                  <option value="">None (Apex / Board Level)</option>
                  {allStaff
                    .filter((m) => m.id !== activeCard.id)
                    .map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.first_name} {mgr.last_name} ({mgr.position} • {mgr.rank_code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Move to Department</label>
                <select
                  value={reassignData.department}
                  onChange={(e) => setReassignData({ ...reassignData, department: e.target.value })}
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                >
                  <option value="Commercial Sales">Commercial Sales</option>
                  <option value="Field Operations">Field Operations</option>
                  <option value="Executive Leadership">Executive Leadership</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Accounting & Payroll">Accounting & Payroll</option>
                  <option value="Technology & Systems">Technology & Systems</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Hierarchy Rank Level</label>
                <select
                  value={reassignData.rank_code}
                  onChange={(e) => setReassignData({ ...reassignData, rank_code: e.target.value })}
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                >
                  <option value="CEO">Level 1: CEO / Executive Leader</option>
                  <option value="CTO">Level 2: Chief Technology Officer</option>
                  <option value="HR">Level 3: Head of Human Resources</option>
                  <option value="ACCOUNTANT">Level 4: Financial Controller</option>
                  <option value="MANAGER">Level 6: Regional Manager</option>
                  <option value="SUPERVISOR">Level 7: Field Supervisor</option>
                  <option value="STAFF">Level 8: Operational Staff</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-300 mb-1">Position / Designation Title</label>
                <input
                  type="text"
                  className="form-input bg-zinc-900 border-zinc-800 text-white text-xs py-2"
                  value={reassignData.position}
                  onChange={(e) => setReassignData({ ...reassignData, position: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary text-xs py-2 px-5 font-bold"
                >
                  {loading ? 'Reassigning…' : 'Save Position Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

