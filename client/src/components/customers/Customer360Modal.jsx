import React, { useState, useEffect } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  X,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';

export default function Customer360Modal({ customerId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isOpen || !customerId) return;
    setLoading(true);
    api.get(`/customers/${customerId}/360`)
      .then(res => {
        setData(res?.data || res || null);
      })
      .catch(err => {
        console.error('Failed to load Customer 360:', err);
      })
      .finally(() => setLoading(false));
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const customer = data?.customer;
  const metrics = data?.metrics || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black">
              <Building2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {loading ? 'Loading Customer 360...' : customer?.name}
                </h2>
                {customer?.customer_type && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {customer.customer_type}
                  </span>
                )}
                {customer?.tier && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {customer.tier}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} /> {customer?.address || 'Address on file'} &bull; {customer?.territory || 'Territory'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Metric Cards */}
        {!loading && customer && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 font-medium block">Total Revenue</span>
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                ₦{(metrics.totalOrderVolume || customer.total_sales_ngn || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 font-medium block">Outstanding Balance</span>
              <span className={`text-sm font-black mt-0.5 block ${metrics.outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                ₦{(metrics.outstandingBalance || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 font-medium block">Credit Limit</span>
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                ₦{(metrics.creditLimit || 1000000).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 font-medium block">Completed Visits</span>
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {metrics.completedVisits || 0} / {metrics.totalVisits || 0}
              </span>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold gap-4 bg-white dark:bg-zinc-900">
          {[
            { key: 'overview', label: 'Overview & Contacts' },
            { key: 'orders', label: `Orders (${data?.orders?.length || 0})` },
            { key: 'visits', label: `Visits (${data?.visits?.length || 0})` },
            { key: 'collections', label: `Collections (${data?.collections?.length || 0})` }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`py-3 border-b-2 transition ${
                activeTab === t.key
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="p-12 text-center text-zinc-400 text-sm">Loading 360 customer profile...</div>
          ) : !customer ? (
            <div className="p-8 text-center text-zinc-400 text-sm">Customer profile not found.</div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-700/50">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                      <User size={15} className="text-orange-500" /> Merchant Contact
                    </h4>
                    <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                      <div><span className="text-zinc-400 font-medium">Contact Person:</span> {customer.contact_person || 'N/A'}</div>
                      <div><span className="text-zinc-400 font-medium">Phone:</span> {customer.phone || 'N/A'}</div>
                      <div><span className="text-zinc-400 font-medium">Email:</span> {customer.email || 'N/A'}</div>
                      <div><span className="text-zinc-400 font-medium">Customer Code:</span> <span className="font-mono">{customer.code}</span></div>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/70 dark:border-zinc-700/50">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm flex items-center gap-1.5">
                      <MapPin size={15} className="text-orange-500" /> Geofence & Location
                    </h4>
                    <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                      <div><span className="text-zinc-400 font-medium">Coordinates:</span> {customer.latitude}, {customer.longitude}</div>
                      <div><span className="text-zinc-400 font-medium">Configured Radius:</span> {customer.geofence_radius || 150} meters</div>
                      <div><span className="text-zinc-400 font-medium">Assigned Agent:</span> {data?.assignedAgent ? `${data.assignedAgent.first_name} ${data.assignedAgent.last_name}` : 'Unassigned'}</div>
                      <div><span className="text-zinc-400 font-medium">Assigned Supervisor:</span> {data?.assignedSupervisor ? `${data.assignedSupervisor.first_name} ${data.assignedSupervisor.last_name}` : 'Unassigned'}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-2">
                  {(data?.orders || []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs">No orders recorded for this customer yet.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                      {data.orders.map(o => (
                        <div key={o.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">{o.order_number}</span>
                            <span className="text-zinc-400 block text-[11px] mt-0.5">{new Date(o.order_date || o.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">₦{Number(o.total_amount || 0).toLocaleString()}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              o.status === 'APPROVED' || o.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : o.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'visits' && (
                <div className="space-y-2">
                  {(data?.visits || []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs">No visits logged for this customer.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                      {data.visits.map(v => (
                        <div key={v.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{v.visit_purpose || 'Store Inspection'}</span>
                            <span className="text-zinc-400 block text-[11px] mt-0.5">{v.planned_date} {v.notes ? `— ${v.notes}` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.shelf_share_percent && (
                              <span className="text-zinc-500 font-medium">Shelf: {v.shelf_share_percent}%</span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              v.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'collections' && (
                <div className="space-y-2">
                  {(data?.collections || []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 text-xs">No collections recorded yet.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden text-xs">
                      {data.collections.map(c => (
                        <div key={c.id} className="p-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">₦{Number(c.amount || 0).toLocaleString()}</span>
                            <span className="text-zinc-400 block text-[11px] mt-0.5">{c.payment_method} &bull; {c.reference_number || 'No Ref'}</span>
                          </div>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
