import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Truck,
  Package
} from 'lucide-react';
import { api } from '../lib/api';


export default function ReportsCenterDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('daily_ops');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10)
  });

  const [reportData, setReportData] = useState({
    summaries: [],
    attendance: [],
    visits: [],
    orders: [],
    products: [],
    customers: [],
    deliveries: [],
    alerts: [],
    generated_at: new Date().toISOString()
  });

  const reportDefinitions = [
    { id: 'daily_ops', name: 'Daily Operations Executive Summary', icon: TrendingUp, category: 'Operations' },
    { id: 'attendance', name: 'Field Workforce Attendance & Time Tracking', icon: Users, category: 'Workforce' },
    { id: 'agent_perf', name: 'Agent Performance & KPI Scoring Report', icon: Users, category: 'Workforce' },
    { id: 'visits', name: 'Store Visit Audit & Merchandising Compliance', icon: Building2, category: 'Field' },
    { id: 'sales', name: 'Commercial Sales & Target Achievement', icon: ShoppingCart, category: 'Sales' },
    { id: 'orders', name: 'Sales Orders & Approval Log', icon: ShoppingCart, category: 'Sales' },
    { id: 'customers', name: 'Customer 360 & Debt Ledger Report', icon: Building2, category: 'Customers' },
    { id: 'collections', name: 'Payment Collections & Recovery Report', icon: DollarSign, category: 'Finance' },
    { id: 'inventory', name: 'Warehouse Stock & Inventory Valuation', icon: Package, category: 'Inventory' },
    { id: 'deliveries', name: 'Logistics Fleet & Proof-of-Delivery', icon: Truck, category: 'Logistics' },
    { id: 'red_flags', name: 'Exceptions & Geofence Red Flag Report', icon: AlertTriangle, category: 'Compliance' },
    { id: 'gps_tracking', name: 'Field GPS Route Telemetry Report', icon: TrendingUp, category: 'Field' }
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/field/reports?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`);
      const data = res?.data || res || {};
      setReportData({
        ...data,
        generated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const handleExportCSV = () => {
    let rows = [];
    let headers = [];

    if (reportType === 'sales' || reportType === 'orders') {
      headers = ['Order Number', 'Date', 'Subtotal', 'VAT', 'Discount', 'Total (NGN)', 'Status', 'Payment Status'];
      rows = (reportData.orders || []).map(o => [
        o.order_number,
        o.order_date || o.created_at,
        o.subtotal,
        o.vat_amount,
        o.discount_amount,
        o.total_amount,
        o.status,
        o.payment_status
      ]);
    } else if (reportType === 'attendance') {
      headers = ['Date', 'Employee Code', 'Clock In', 'Clock Out', 'Duration', 'Status', 'Geofence Verified'];
      rows = (reportData.attendance || []).map(a => [
        a.date,
        a.employee?.employee_code || a.employee_id,
        a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : '',
        a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : '',
        a.working_duration_text || '',
        a.status,
        a.is_geofence_verified ? 'YES' : 'NO'
      ]);
    } else {
      headers = ['ID', 'Customer', 'Date', 'Purpose', 'Status', 'Duration (Mins)', 'Shelf Share %'];
      rows = (reportData.visits || []).map(v => [
        v.id,
        v.customer?.name || `Customer #${v.customer_id}`,
        v.planned_date,
        v.visit_purpose || 'Store Inspection',
        v.status,
        v.duration_minutes || 0,
        v.shelf_share_percent || 50
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val || ''}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EdgeWForce_${reportType}_${dateRange.start_date}_to_${dateRange.end_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeDef = reportDefinitions.find(r => r.id === reportType) || reportDefinitions[0];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Operations Intelligence
            </span>
            <span className="text-xs text-zinc-400 font-medium">(c) Nexfeild 2026</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Enterprise Reporting & Exports
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Audit-grade operational, financial, inventory, workforce, and red flag compliance reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:bg-zinc-50 transition"
          >
            <Download size={14} className="text-orange-500" /> Export CSV / Excel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* Date Range & Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div>
          <label className="text-xs font-bold text-zinc-500 block mb-1.5">Select Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
          >
            {reportDefinitions.map(r => (
              <option key={r.id} value={r.id}>[{r.category}] {r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 block mb-1.5">Start Date</label>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-500 block mb-1.5">End Date</label>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
            className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
          />
        </div>
      </div>

      {/* Report Canvas Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Report Banner */}
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Official EdgeWForce Audit Document
            </span>
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
              {activeDef.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Period: {dateRange.start_date} &rarr; {dateRange.end_date} &bull; Generated: {new Date(reportData.generated_at).toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-zinc-400 font-mono">
            Tenant ID: CMP-001 &bull; NGN (₦)
          </div>
        </div>

        {/* Dynamic Report Data Table */}
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-sm">Compiling operational report metrics...</div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'daily_ops' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-400 font-medium">Orders Processed</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 block mt-1">
                      {(reportData.orders || []).length}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-400 font-medium">Gross Sales Volume</span>
                    <span className="text-lg font-black text-orange-600 block mt-1">
                      ₦{(reportData.orders || []).reduce((s, o) => s + (o.total_amount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-400 font-medium">Store Audits Logged</span>
                    <span className="text-lg font-black text-zinc-900 dark:text-zinc-100 block mt-1">
                      {(reportData.visits || []).length}
                    </span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <span className="text-zinc-400 font-medium">Exceptions Triggered</span>
                    <span className="text-lg font-black text-rose-600 block mt-1">
                      {(reportData.alerts || []).length}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 pt-2">Recent Order Logs</h3>
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Order #</th>
                      <th className="py-2.5 px-3 font-bold">Customer Outlet</th>
                      <th className="py-2.5 px-3 font-bold">Date</th>
                      <th className="py-2.5 px-3 font-bold">Total Amount</th>
                      <th className="py-2.5 px-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {(reportData.orders || []).map(o => (
                      <tr key={o.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-700 dark:text-zinc-300">{o.order_number}</td>
                        <td className="py-2.5 px-3 font-medium">{o.customer?.name || `Customer #${o.customer_id}`}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{o.order_date || o.created_at}</td>
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">₦{Number(o.total_amount || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'attendance' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Date</th>
                    <th className="py-2.5 px-3 font-bold">Officer</th>
                    <th className="py-2.5 px-3 font-bold">Clock In</th>
                    <th className="py-2.5 px-3 font-bold">Clock Out</th>
                    <th className="py-2.5 px-3 font-bold">Duration</th>
                    <th className="py-2.5 px-3 font-bold">150m Geofence</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(reportData.attendance || []).map(a => (
                    <tr key={a.id}>
                      <td className="py-2.5 px-3 font-mono">{a.date}</td>
                      <td className="py-2.5 px-3 font-bold">{a.employee?.first_name} {a.employee?.last_name}</td>
                      <td className="py-2.5 px-3 text-zinc-500">{a.clock_in_time ? new Date(a.clock_in_time).toLocaleTimeString() : '—'}</td>
                      <td className="py-2.5 px-3 text-zinc-500">{a.clock_out_time ? new Date(a.clock_out_time).toLocaleTimeString() : 'Active'}</td>
                      <td className="py-2.5 px-3 font-semibold">{a.working_duration_text || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">{a.is_geofence_verified ? '✓ Validated' : '⚠️ Unverified'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.is_late ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reportType !== 'daily_ops' && reportType !== 'attendance' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">ID</th>
                    <th className="py-2.5 px-3 font-bold">Title / Customer</th>
                    <th className="py-2.5 px-3 font-bold">Date</th>
                    <th className="py-2.5 px-3 font-bold">Details</th>
                    <th className="py-2.5 px-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(reportData.visits || []).map(v => (
                    <tr key={v.id}>
                      <td className="py-2.5 px-3 font-mono text-zinc-400">#{v.id}</td>
                      <td className="py-2.5 px-3 font-bold">{v.customer?.name || `Customer #${v.customer_id}`}</td>
                      <td className="py-2.5 px-3 text-zinc-400">{v.planned_date}</td>
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-300">{v.visit_purpose || 'Store Inspection'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
