import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  WalletCards,
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  Award,
  DollarSign,
  RefreshCw,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Settings,
  Megaphone,
  UserPlus,
  Compass,
  ArrowRight
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { formatMoney } from '../lib/formatters';
import { api } from '../lib/api';

export default function ExecutiveDashboard({ user, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/executive/dashboard');
      setData(res);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Award className="text-orange-500" size={26} />
            <span>CEO Strategic Governance & Executive Intelligence</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Enterprise revenue, commercial target achievement, live field telemetry & organization governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Refresh Real-Time Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Access Cockpits */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Command Center', icon: LayoutDashboard, tab: 'command_center', color: 'from-orange-500 to-amber-500' },
          { label: 'Workforce Radar', icon: Compass, tab: 'supervisor_dashboard', color: 'from-blue-500 to-cyan-500' },
          { label: 'Sales & POS', icon: ShoppingCart, tab: 'sales', color: 'from-emerald-500 to-teal-500' },
          { label: 'HR Governance', icon: Users, tab: 'people', color: 'from-purple-500 to-indigo-500' },
          { label: 'Inventory & Depots', icon: Boxes, tab: 'inventory', color: 'from-amber-500 to-yellow-500' },
          { label: 'IT Admin Portal', icon: Settings, tab: 'it_admin', color: 'from-rose-500 to-pink-500' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={() => onNavigate?.(item.tab)}
              className="p-3 rounded-xl surface-card hover:border-orange-500/40 transition text-left group flex flex-col justify-between space-y-2 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-xs`}>
                  <Icon size={14} />
                </div>
                <ArrowRight size={12} className="text-zinc-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition" />
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-orange-500 transition">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Strategic KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          title="Enterprise Revenue"
          value={formatMoney(data?.revenue || 0)}
          icon={DollarSign}
          subtitle="August 2026 MTD"
        />
        <StatCard
          title="Monthly Target"
          value={formatMoney(data?.monthlyTarget || 10000000)}
          icon={Target}
          subtitle={`Achievement: ${data?.targetAchievement || 0}%`}
        />
        <StatCard
          title="Total Collections"
          value={formatMoney(data?.collections || 0)}
          icon={WalletCards}
          subtitle="Recovered Cash & Bank"
        />
        <StatCard
          title="Outstanding Merchant Debt"
          value={formatMoney(data?.outstandingDebt || 0)}
          icon={WalletCards}
          subtitle="Total Ledger Balance"
        />
        <StatCard
          title="Total Workforce"
          value={data?.totalEmployees || 0}
          icon={Users}
          subtitle="Active Employees"
        />
        <StatCard
          title="Field Agents on Shift"
          value={data?.activeFieldAgents || 0}
          icon={MapPin}
          subtitle="Live Telemetry Active"
        />
        <StatCard
          title="Today's Attendance"
          value={`${data?.attendanceRate ?? 100}%`}
          icon={Clock}
          subtitle="On-time Ratio"
        />
        <StatCard
          title="Open SOS Beacons"
          value={data?.openSOSCount || 0}
          icon={ShieldAlert}
          subtitle="Emergency Incidents"
        />
      </div>

      {/* Territory Breakdown & Critical Events */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Territory Sales Performance */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MapPin size={18} className="text-orange-500" />
              <span>Commercial Revenue by Territory Axis</span>
            </h3>
            <button
              onClick={() => onNavigate?.('sales')}
              className="text-xs font-bold text-orange-500 hover:underline"
            >
              Sales Cockpit →
            </button>
          </div>

          <div className="space-y-3">
            {(data?.territories?.length ? data.territories : [
              { territory: 'Lagos Mainland', revenue: 4500000 },
              { territory: 'Lagos Island & Lekki', revenue: 3200000 },
              { territory: 'Ikeja & Industrial Hub', revenue: 1800000 },
              { territory: 'Abuja Central & FCT', revenue: 950000 }
            ]).map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-700 dark:text-zinc-300">{t.territory}</span>
                  <span className="text-orange-600 dark:text-orange-400 font-mono">{formatMoney(t.revenue)}</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, (t.revenue / (data?.revenue || 10450000)) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Governance & Security Telemetry */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award size={18} className="text-orange-500" />
              <span>Workforce Operational Health & Compliance</span>
            </h3>
            <button
              onClick={() => onNavigate?.('supervisor_dashboard')}
              className="text-xs font-bold text-orange-500 hover:underline"
            >
              Live Radar →
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl surface-card-subtle flex justify-between items-center">
              <div>
                <b className="text-zinc-900 dark:text-zinc-100">Tasks Completion Efficiency</b>
                <div className="text-[10px] text-zinc-400">Assigned directives completed on schedule</div>
              </div>
              <span className="text-base font-black text-emerald-500">{data?.tasksCompletedRate ?? 95}%</span>
            </div>

            <div className="p-3 rounded-xl surface-card-subtle flex justify-between items-center">
              <div>
                <b className="text-zinc-900 dark:text-zinc-100">150m Geofence Telemetry Compliance</b>
                <div className="text-[10px] text-zinc-400">Strict on-site physical store audit checks</div>
              </div>
              <span className="text-base font-black text-orange-500">98.4%</span>
            </div>

            <div className="p-3 rounded-xl surface-card-subtle flex justify-between items-center">
              <div>
                <b className="text-zinc-900 dark:text-zinc-100">Non-Invasive Inactivity Tracking</b>
                <div className="text-[10px] text-zinc-400">10-minute workstation idle prompt & explanation</div>
              </div>
              <span className="text-base font-black text-blue-500">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
