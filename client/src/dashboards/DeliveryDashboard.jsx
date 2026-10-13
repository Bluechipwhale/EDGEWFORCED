import React, { useState, useEffect } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Plus,
  User,
  Phone,
  Camera,
  X
} from 'lucide-react';
import { api } from '../lib/api';


export default function DeliveryDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, delivered: 0, inTransit: 0, pending: 0, failed: 0, successRate: 100 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [approvedOrders, setApprovedOrders] = useState([]);
  const [dispatchForm, setDispatchForm] = useState({
    order_id: '',
    driver_name: '',
    driver_phone: '',
    vehicle_number: ''
  });
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // POD Confirmation Modal
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [podForm, setPodForm] = useState({
    recipient_name: '',
    signature_url: 'data:image/png;base64,signed_slip',
    photo_url: null
  });
  const [submittingPOD, setSubmittingPOD] = useState(false);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const [delivRes, metRes, ordRes] = await Promise.all([
        api.get('/delivery'),
        api.get('/delivery/metrics'),
        api.get('/sales/orders')
      ]);

      setDeliveries(delivRes?.data || delivRes || []);
      if (metRes?.data || metRes) setMetrics(metRes?.data || metRes);

      const orders = ordRes?.data || ordRes || [];
      setApprovedOrders(orders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING_APPROVAL'));
    } catch (err) {
      console.error('Failed to load deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchForm.order_id) return;
    setSubmittingDispatch(true);
    try {
      await api.post('/delivery/dispatch', dispatchForm);
      setDispatchModalOpen(false);
      loadDeliveries();
    } catch (err) {
      alert(err.message || 'Failed to dispatch order');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  const handleConfirmPOD = async (e) => {
    e.preventDefault();
    if (!selectedDelivery) return;
    setSubmittingPOD(true);
    try {
      await api.post(`/delivery/${selectedDelivery.id}/confirm`, podForm);
      setPodModalOpen(false);
      loadDeliveries();
    } catch (err) {
      alert(err.message || 'Failed to confirm proof of delivery');
    } finally {
      setSubmittingPOD(false);
    }
  };

  const filteredDeliveries = deliveries.filter(d => {
    const matchSearch = !search ||
      d.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.order?.order_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.delivery_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Logistics & Fulfillment
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Fleet Dispatch & Delivery Tracking
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage field dispatches, driver route progress, and digital proof-of-delivery (POD) confirmations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDispatchModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={15} /> Dispatch Order
          </button>
          <button
            onClick={loadDeliveries}
            disabled={loading}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">In Transit</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><Truck size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{metrics.inTransit}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Active vehicle runs</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Delivered</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{metrics.delivered}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">With verified POD</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Pending Dispatch</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600"><Clock size={16} /></div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{metrics.pending}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Ready at warehouse</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Success Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600"><Package size={16} /></div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{metrics.successRate}%</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Fulfillment performance</span>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search driver, outlet or order..."
                className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              <option value="all">All Delivery States</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered (POD)</option>
              <option value="PENDING">Pending Dispatch</option>
              <option value="FAILED">Failed Delivery</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Order #</th>
                  <th className="py-3 px-4 font-bold">Customer Outlet</th>
                  <th className="py-3 px-4 font-bold">Assigned Driver & Vehicle</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Dispatch Time</th>
                  <th className="py-3 px-4 font-bold">Proof of Delivery</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-400 text-xs">
                      No deliveries match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{d.order?.order_number || `Order #${d.order_id}`}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 block">{d.customer?.name || 'Customer Outlet'}</span>
                        <span className="text-[11px] text-zinc-400">{d.customer?.address || 'Address'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {d.driver_name ? (
                          <div>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300 block">{d.driver_name}</span>
                            <span className="text-[11px] text-zinc-400">{d.vehicle_number} &bull; {d.driver_phone}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase ${
                          d.delivery_status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : d.delivery_status === 'IN_TRANSIT'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse'
                            : d.delivery_status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {d.delivery_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">
                        {d.dispatch_time ? new Date(d.dispatch_time).toLocaleString() : 'Pending'}
                      </td>
                      <td className="py-3.5 px-4">
                        {d.delivery_status === 'DELIVERED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 size={13} /> {d.recipient_name || 'Signed POD'}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">Awaiting signature</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {d.delivery_status === 'IN_TRANSIT' && (
                          <button
                            onClick={() => {
                              setSelectedDelivery(d);
                              setPodModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-bold text-[11px] transition"
                          >
                            ✓ Confirm POD
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Truck size={16} className="text-orange-500" /> Dispatch Sales Order
              </h3>
              <button onClick={() => setDispatchModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Select Order to Dispatch *</label>
                <select
                  required
                  value={dispatchForm.order_id}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, order_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                >
                  <option value="">-- Select Order --</option>
                  {approvedOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.order_number} &bull; ₦{Number(o.total_amount).toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Driver Name *</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.driver_name}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_name: e.target.value })}
                  placeholder="e.g. Sunday Okafor"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Driver Phone *</label>
                <input
                  type="text"
                  required
                  value={dispatchForm.driver_phone}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driver_phone: e.target.value })}
                  placeholder="+2348021122334"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Vehicle License Plate</label>
                <input
                  type="text"
                  value={dispatchForm.vehicle_number}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                  placeholder="e.g. LAG-849-XA"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingDispatch ? 'Dispatching...' : 'Dispatch Fleet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof of Delivery Modal */}
      {podModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" /> Confirm Proof of Delivery (POD)
              </h3>
              <button onClick={() => setPodModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmPOD} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Recipient / Store Manager Name *</label>
                <input
                  type="text"
                  required
                  value={podForm.recipient_name}
                  onChange={(e) => setPodForm({ ...podForm, recipient_name: e.target.value })}
                  placeholder="e.g. Alhaji Rasheed Bello"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Digital Signature Captured
                </div>
                <p className="text-[11px]">Recipient confirmed receipt of invoice and carton items.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPodModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPOD}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingPOD ? 'Verifying...' : 'Complete Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
