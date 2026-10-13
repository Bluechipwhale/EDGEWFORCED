import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  User,
  X,
  Globe,
  Locate,
  ExternalLink,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api';
import Customer360Modal from '../components/customers/Customer360Modal';
import StateCitySelect from '../components/common/StateCitySelect';
import { geocodeNigerianAddress, getCurrentGPSLocation } from '../lib/geo';


export default function CustomerDirectoryDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Customer Form
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    state: 'Lagos',
    city: 'Ikeja',
    territory: 'Lagos - Ikeja',
    customer_type: 'Supermarket',
    tier: 'Tier 1 - Platinum',
    credit_limit: 1000000,
    latitude: 6.5244,
    longitude: 3.3792,
    geofence_radius: 150
  });
  const [submitting, setSubmitting] = useState(false);
  const [isFetchingCoords, setIsFetchingCoords] = useState(false);
  const [geoFetchSuccessMsg, setGeoFetchSuccessMsg] = useState('');

  const handleAutoFetchCoordinates = async () => {
    setIsFetchingCoords(true);
    setGeoFetchSuccessMsg('');
    try {
      const res = await geocodeNigerianAddress(formData.address, formData.city, formData.state);
      if (res && res.latitude && res.longitude) {
        setFormData(prev => ({
          ...prev,
          latitude: res.latitude,
          longitude: res.longitude
        }));
        setGeoFetchSuccessMsg(`✓ Coordinates resolved: ${res.latitude}, ${res.longitude} (${res.source})`);
      }
    } catch (err) {
      setGeoFetchSuccessMsg(`⚠️ Could not auto-resolve: ${err.message}. You can enter manually.`);
    } finally {
      setIsFetchingCoords(false);
    }
  };

  const handleFetchDeviceGPS = async () => {
    setIsFetchingCoords(true);
    setGeoFetchSuccessMsg('');
    try {
      const loc = await getCurrentGPSLocation();
      if (loc && loc.latitude && loc.longitude) {
        setFormData(prev => ({
          ...prev,
          latitude: parseFloat(loc.latitude.toFixed(6)),
          longitude: parseFloat(loc.longitude.toFixed(6))
        }));
        setGeoFetchSuccessMsg(`✓ Current device GPS captured: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (±${Math.round(loc.accuracy || 0)}m)`);
      }
    } catch (err) {
      setGeoFetchSuccessMsg(`⚠️ Device GPS error: ${err.message}`);
    } finally {
      setIsFetchingCoords(false);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res?.data || res || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/customers', formData);
      setCreateModalOpen(false);
      loadCustomers();
    } catch (err) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const territories = ['all', ...new Set(customers.map(c => c.territory).filter(Boolean))];

  const filteredCustomers = customers.filter(c => {
    const matchSearch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase());
    const matchTerritory = territoryFilter === 'all' || c.territory === territoryFilter;
    return matchSearch && matchTerritory;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Customer 360 Master Record
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Customer Directory & Outlets
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Enterprise store accounts, GPS coordinate geofences, credit limits, and purchase ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={15} /> + Register Outlet
          </button>
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-zinc-500">Registered Outlets</span>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{customers.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Across all territories</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-zinc-500">Total Receivables</span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            ₦{customers.reduce((s, c) => s + (Number(c.balance) || 0), 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Current merchant debt</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-zinc-500">Cumulative Sales Volume</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            ₦{customers.reduce((s, c) => s + (Number(c.total_sales_ngn) || 0), 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Delivered purchases</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-zinc-500">Avg Geofence Radius</span>
          <div className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">150m</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Verified GPS perimeters</span>
        </div>
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
              placeholder="Search outlet name, contact, or code..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
            />
          </div>

          <select
            value={territoryFilter}
            onChange={(e) => setTerritoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            {territories.map(t => (
              <option key={t} value={t}>{t === 'all' ? 'All Territories' : t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-bold">Outlet Code</th>
                <th className="py-3 px-4 font-bold">Customer Name</th>
                <th className="py-3 px-4 font-bold">Territory & Address</th>
                <th className="py-3 px-4 font-bold">Contact Person</th>
                <th className="py-3 px-4 font-bold">Total Sales</th>
                <th className="py-3 px-4 font-bold">Outstanding Debt</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-400 text-xs">
                    No customers found matching search filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">{c.code}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block">{c.name}</span>
                      <span className="text-[10px] text-zinc-400">{c.customer_type} &bull; {c.tier}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-zinc-700 dark:text-zinc-300 block">{c.territory}</span>
                      <span className="text-[11px] text-zinc-400">{c.address}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 block">{c.contact_person || 'N/A'}</span>
                      <span className="text-[11px] text-zinc-400">{c.phone}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      ₦{Number(c.total_sales_ngn || 0).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${Number(c.balance) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                        ₦{Number(c.balance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                      >
                        View 360 &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Modal */}
      {selectedCustomerId && (
        <Customer360Modal
          customerId={selectedCustomerId}
          isOpen={true}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}

      {/* Register Customer Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Building2 size={16} className="text-orange-500" /> Register Customer Outlet
              </h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Outlet / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Zenith Mart Lekki Phase 1"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="e.g. Chief Okonkwo"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+2348000000000"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Store Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>

                <div className="col-span-2">
                  <StateCitySelect
                    selectedState={formData.state}
                    selectedCity={formData.city}
                    onStateChange={(state) => setFormData(prev => ({ ...prev, state, territory: `${state} - ${prev.city || ''}` }))}
                    onCityChange={(city) => setFormData(prev => ({ ...prev, city, territory: `${prev.state || ''} - ${city}` }))}
                    stateLabel="State (36 States & FCT) *"
                    cityLabel="City / Major Town / Commercial Hub *"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Credit Limit (NGN)</label>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Geofence Radius (Meters)</label>
                  <input
                    type="number"
                    value={formData.geofence_radius ?? 150}
                    onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value, 10) || 150 })}
                    placeholder="150"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>

                {/* GPS Coordinates & Device GPS Capture */}
                <div className="col-span-2 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                        <MapPin size={14} className="text-orange-500" />
                        <span>GPS Coordinates & Map Geofence *</span>
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Type coordinates manually or capture directly from device GPS.
                      </p>
                    </div>

                    {/* Device GPS Action */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isFetchingCoords}
                        onClick={handleFetchDeviceGPS}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                        title="Use current device GPS location"
                      >
                        <Locate size={13} />
                        <span>Use Device GPS</span>
                      </button>
                    </div>
                  </div>

                  {/* Status / Success Toast */}
                  {geoFetchSuccessMsg && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center justify-between">
                      <span>{geoFetchSuccessMsg}</span>
                      {formData.latitude && formData.longitude && (
                        <a
                          href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 ml-2 font-bold shrink-0"
                        >
                          <span>Open Google Maps</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Manual Coordinate Input Fields */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                        Latitude (Decimal) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude ?? ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || e.target.value })}
                        placeholder="e.g. 6.428123"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                        Longitude (Decimal) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude ?? ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || e.target.value })}
                        placeholder="e.g. 3.421945"
                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submitting ? 'Registering...' : 'Register Merchant Outlet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
