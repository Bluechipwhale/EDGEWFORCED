import AttendanceControl from '../components/employee/AttendanceControl';
import React, { useState, useEffect } from 'react';
import {
  MapPin, Clock, Navigation, ShieldAlert, CheckCircle2, AlertTriangle,
  ClipboardCheck, Phone, MessageCircle, Play, Square, ChevronRight,
  Store, Camera, Plus, RefreshCw, Layers, Compass, ExternalLink, Globe, Sparkles,
  Building2, Users, Truck, WalletCards, Search, Filter, ArrowRight, DollarSign,
  AlertOctagon, CheckCircle, Upload, FileText, Send, Eye, Shield, User, Activity, AlertCircle
} from 'lucide-react';
import FieldMap from '../components/maps/FieldMap';
import StoreRequestModal from '../components/field/StoreRequestModal';
import StoreVisitModal from '../components/field/StoreVisitModal';
import VisitAuditModal from '../components/field/VisitAuditModal';
import SOSModal from '../components/field/SOSModal';
import Customer360Modal from '../components/customers/Customer360Modal';
import ReceiptModal from '../components/sales/ReceiptModal';
import { getCurrentGPSLocation, calculateClientDistance } from '../lib/geo';
import { formatMoney, formatMoneyShort, formatDate, formatTime, getWhatsAppDeepLink, getGoogleMapsDirLink } from '../lib/formatters';
import { apiRequest } from '../utils/api';
import { api } from '../lib/api';

export default function FieldDashboard({ user, initialTab = 'manifest', onSelectTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'manifest');
  
  // Shift & Route state
  const [route, setRoute] = useState([]);
  const [shift, setShift] = useState(null);
  const [windowStatus, setWindowStatus] = useState(null);
  const [stores, setStores] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [sosHistory, setSosHistory] = useState([]);

  // Telemetry & GPS
  const [agentLocation, setAgentLocation] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedWorkingSeconds, setElapsedWorkingSeconds] = useState(0);

  // Modals state
  const [sosModalOpen, setSOSModalOpen] = useState(false);
  const [storeRequestModalOpen, setStoreRequestModalOpen] = useState(false);
  const [storeVisitModalOpen, setStoreVisitModalOpen] = useState(false);
  const [selectedStoreForVisit, setSelectedStoreForVisit] = useState(null);
  const [activeAuditVisit, setActiveAuditVisit] = useState(null);
  const [selectedCustomerId360, setSelectedCustomerId360] = useState(null);
  const [receiptModalOrder, setReceiptModalOrder] = useState(null);
  const [newPaymentModalOpen, setNewPaymentModalOpen] = useState(false);
  
  // Payment recording form state
  const [paymentForm, setPaymentForm] = useState({
    customer_id: '',
    amount: '',
    payment_method: 'Direct Bank Transfer',
    reference: '',
    notes: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [territoryFilter, setTerritoryFilter] = useState('ALL');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');

  // Sync initialTab if changed by parent sidebar
  useEffect(() => {
    if (initialTab) {
      if (initialTab === 'customer_360') setActiveTab('customer_360');
      else if (initialTab === 'customers' || initialTab === 'directory') setActiveTab('directory');
      else if (initialTab === 'delivery' || initialTab === 'fleet') setActiveTab('fleet');
      else if (initialTab === 'payments' || initialTab === 'settlement' || initialTab === 'collections') setActiveTab('payments');
      else if (initialTab === 'alerts') setActiveTab('alerts');
      else if (initialTab === 'safety' || initialTab === 'sos') setActiveTab('safety');
      else if (initialTab === 'tasks' || initialTab === 'queue') setActiveTab('queue');
      else setActiveTab('manifest');
    }
  }, [initialTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [manifestRes, curShiftRes, storesRes, windowRes, custRes, delRes, colRes, alertRes, taskRes, sosRes] = await Promise.all([
        apiRequest('/field/route-manifest').catch(() => ({ data: [] })),
        apiRequest('/field/shifts/current').catch(() => ({ data: null })),
        apiRequest('/field/stores').catch(() => ({ data: [] })),
        apiRequest('/field/shifts/window-status').catch(() => ({ data: null })),
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/delivery/orders').catch(() => ({ data: [] })),
        api.get('/sales/collections').catch(() => ({ data: [] })),
        apiRequest('/field/supervisor/alerts').catch(() => apiRequest('/field/alerts').catch(() => ({ data: [] }))),
        api.get('/tasks/my').catch(() => api.get('/tasks').catch(() => ({ data: [] }))),
        apiRequest('/field/sos').catch(() => ({ data: [] }))
      ]);

      setRoute(manifestRes?.data || manifestRes?.manifest || []);
      setShift(curShiftRes?.data || curShiftRes?.shift || null);
      setStores(storesRes?.data || storesRes?.stores || []);
      setWindowStatus(windowRes?.data || windowRes || null);
      setCustomers(custRes?.data || custRes || []);
      setDeliveries(delRes?.data || delRes || []);
      setCollections(colRes?.data || colRes || []);
      setAlerts(alertRes?.data || alertRes || []);
      setTasks(taskRes?.data || taskRes || []);
      setSosHistory(sosRes?.data || sosRes || []);
    } catch (err) {
      console.error('Error loading field dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    // Watch live GPS location
    let watchId = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setAgentLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
          setGpsAccuracy(Math.round(pos.coords.accuracy));
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Telemetry Ping during active shift
  useEffect(() => {
    if (!shift?.clock_in_time || shift?.clock_out_time) return;

    const sendPing = async () => {
      if (!agentLocation) return;
      try {
        await apiRequest('/field/location-ping', 'POST', {
          latitude: agentLocation.latitude,
          longitude: agentLocation.longitude,
          accuracy: agentLocation.accuracy,
          current_activity: 'Store Route Patrol'
        });
      } catch (err) {
        console.warn('Location telemetry ping:', err.message);
      }
    };

    const interval = setInterval(sendPing, 45000);
    return () => clearInterval(interval);
  }, [shift, agentLocation]);

  // Working Duration Timer
  useEffect(() => {
    const clockInVal = shift?.clock_in || shift?.clock_in_time;
    const clockOutVal = shift?.clock_out || shift?.clock_out_time;
    if (!clockInVal || clockOutVal) {
      setElapsedWorkingSeconds(0);
      return;
    }

    const inTime = new Date(clockInVal).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      setElapsedWorkingSeconds(Math.max(0, Math.floor((now - inTime) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [shift]);

  const formatElapsed = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  const handleToggleShift = async () => {
    setShiftLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      let lat = agentLocation?.latitude;
      let lng = agentLocation?.longitude;

      if (!lat || !lng) {
        const p = await getCurrentGPSLocation();
        lat = p.latitude;
        lng = p.longitude;
        setAgentLocation(p);
        setGpsAccuracy(Math.round(p.accuracy));
      }

      const res = await apiRequest('/field/shifts/toggle', 'POST', {
        latitude: lat,
        longitude: lng,
        device: navigator.userAgent
      });

      setShift(res.data || res);
      setStatusMsg(res.clock_out_time || res.data?.clock_out_time ? `✓ Shift concluded. Total working duration logged.` : '✓ Shift started. 150m Geofence and GPS Telemetry active.');
      loadAllData();
    } catch (err) {
      setErrorMsg(err.message || 'Shift action failed');
    } finally {
      setShiftLoading(false);
    }
  };

  const handleStartStoreVisit = (store) => {
    setSelectedStoreForVisit(store);
    setStoreVisitModalOpen(true);
  };

  const handleCreatePaymentCollection = async (e) => {
    e.preventDefault();
    if (!paymentForm.customer_id || !paymentForm.amount) {
      setErrorMsg('Please select a customer and enter the collection amount');
      return;
    }
    setPaymentSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        customer_id: Number(paymentForm.customer_id),
        amount: Number(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || `COL-${Date.now().toString().slice(-6)}`,
        notes: paymentForm.notes
      };
      await api.post('/sales/collections', payload);
      setStatusMsg(`✓ Payment of ₦${Number(paymentForm.amount).toLocaleString()} successfully recorded and applied to customer balance.`);
      setNewPaymentModalOpen(false);
      setPaymentForm({ customer_id: '', amount: '', payment_method: 'Direct Bank Transfer', reference: '', notes: '' });
      loadAllData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleAcknowledgeTask = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/acknowledge`);
      setStatusMsg('✓ Task marked as Acknowledged.');
      loadAllData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to acknowledge task');
    }
  };

  const isShiftActive = shift?.clock_in_time && !shift?.clock_out_time;

  // The 8 Official Field Agent Navigation Items
  const navTabs = [
    { id: 'manifest', label: 'Field Routes & Geofencing', icon: MapPin, count: route.length },
    { id: 'customer_360', label: 'Customer 360', icon: Building2, count: customers.length },
    { id: 'directory', label: 'Directory', icon: Users, count: stores.length },
    { id: 'fleet', label: 'Fleet', icon: Truck, count: deliveries.length },
    { id: 'payments', label: 'Proof of Payment', icon: WalletCards, count: collections.length },
    { id: 'alerts', label: 'Alert & Red Flag Center', icon: AlertTriangle, count: alerts.filter(a => a.status !== 'RESOLVED').length },
    { id: 'safety', label: 'Emergency SOS', icon: ShieldAlert, danger: true },
    { id: 'queue', label: 'Queue', icon: ClipboardCheck, count: tasks.filter(t => t.status !== 'COMPLETED').length }
  ];

  return (
    <div className="space-y-5">
      {/* 1. AGENT COCKPIT HEADER & STATUS BANNER */}
      <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md">
              {user?.full_name?.[0] || 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                  {user?.full_name || 'Field Agent Operations'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  FIELD FORCE
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                  isShiftActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isShiftActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                  {isShiftActive ? 'ON-DUTY (ACTIVE SHIFT)' : 'OFF-DUTY'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Attendance uses Lagos time</span>
                <span>•</span>
                <span>GPS: {gpsAccuracy !== null ? `Fixed (±${gpsAccuracy}m)` : 'Acquiring Telemetry...'}</span>
                {isShiftActive && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      Elapsed: {formatElapsed(elapsedWorkingSeconds)}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Shift & SOS Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSOSModalOpen(true)}
              className="btn-primary text-xs py-2 px-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <ShieldAlert size={15} />
              <span>SOS PANIC BEACON</span>
            </button>

            <AttendanceControl onRecorded={loadAllData} />
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 2. THE 8 SPECIFIED OPERATIONAL TABS NAVIGATION */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1 sm:gap-2 text-xs font-bold overflow-x-auto pb-1 select-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onSelectTab?.(tab.id);
              }}
              className={`pb-2.5 px-3 pt-1.5 transition relative flex items-center gap-2 whitespace-nowrap rounded-t-xl ${
                isActive
                  ? tab.danger
                    ? 'text-rose-600 dark:text-rose-400 border-b-2 border-rose-500 bg-rose-500/5'
                    : 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-500 bg-orange-500/5'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Icon size={15} className={tab.danger ? 'text-rose-500' : ''} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-orange-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FIELD ROUTES & GEOFENCING */}
      {/* ========================================================================= */}
      {activeTab === 'manifest' && (
        <div className="space-y-5">
          {/* Shift Attendance Windows Tracker */}
          <div className="grid sm:grid-cols-3 gap-3.5">
            <div className={`p-4 rounded-xl border text-xs space-y-1 ${
              windowStatus?.window_info?.attendance_type === 'MORNING_ATTENDANCE'
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-200 dark:border-zinc-800 surface-card'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Morning Clock-In</span>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">06:00 AM – 12:00 PM</span>
              </div>
              <div className="text-[11px] text-zinc-500">Authorized shift commencement window</div>
            </div>

            <div className={`p-4 rounded-xl border text-xs space-y-1 ${
              windowStatus?.window_info?.attendance_type === 'MIDDAY_ATTENDANCE'
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-200 dark:border-zinc-800 surface-card'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Midday Clock-In</span>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">12:00 PM – 04:30 PM</span>
              </div>
              <div className="text-[11px] text-zinc-500">Midday territory shift verification</div>
            </div>

            <div className={`p-4 rounded-xl border text-xs space-y-1 ${
              windowStatus?.window_info?.attendance_type === 'EVENING_CLOCK_OUT'
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-200 dark:border-zinc-800 surface-card'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-800 dark:text-zinc-200">Evening Clock-Out</span>
                <span className="text-[10px] font-bold text-zinc-400 font-mono">04:30 PM – 12:00 AM</span>
              </div>
              <div className="text-[11px] text-zinc-500">Active Evening Clock-Out window</div>
            </div>
          </div>

          {/* Route Manifest & Outlets List */}
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <MapPin size={18} className="text-orange-500" />
                    <span>Daily Assigned Route Manifest</span>
                  </h3>
                  <p className="text-xs text-zinc-500">150m Geofenced retail merchant check-ins and audits</p>
                </div>

                <button
                  onClick={() => setStoreRequestModalOpen(true)}
                  className="btn-primary text-xs py-1.5 px-3 bg-orange-500 text-white rounded-xl font-bold flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>+ Register Store</span>
                </button>
              </div>

              <div className="space-y-3">
                {route.map((item, idx) => {
                  const dist = agentLocation && item.latitude && item.longitude
                    ? calculateClientDistance(agentLocation.latitude, agentLocation.longitude, item.latitude, item.longitude)
                    : null;
                  const isWithinGeofence = dist !== null && dist <= 150;

                  return (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 surface-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-orange-500/40 transition"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                            {item.store_name || item.customer_name || 'Retail Outlet'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            Stop #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {item.status || 'PENDING VISIT'}
                          </span>
                        </div>

                        <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                          <MapPin size={12} className="text-orange-500 shrink-0" />
                          <span className="truncate">{item.address || item.territory || 'Lagos Retail Corridor'}</span>
                        </div>

                        <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                          <span>Contact: {item.contact_person || item.phone || 'Store Manager'}</span>
                          {dist !== null && (
                            <span className={`font-mono font-bold ${isWithinGeofence ? 'text-emerald-600' : 'text-zinc-500'}`}>
                              Distance: {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-orange-500"
                            title="Call Store"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        {item.phone && (
                          <a
                            href={getWhatsAppDeepLink(item.phone, `Hello ${item.contact_person || ''}, this is EdgeWForce Field Rep.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            title="WhatsApp Chat"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => handleStartStoreVisit(item)}
                          className="btn-primary text-xs py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-1"
                        >
                          <Camera size={13} />
                          <span>Audit / Check-In</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {route.length === 0 && (
                  <div className="text-center py-10 text-zinc-400 text-xs">
                    No assigned route stops for today. Click "+ Register Store" to add an outlet.
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Live Map */}
            <div className="surface-card rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Compass size={14} className="text-orange-500" />
                  <span>Live GPS Radar & Geofence</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">150m Perimeter</span>
              </div>
              <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
                <FieldMap
                  currentLocation={agentLocation}
                  routePoints={route}
                  radiusMeters={150}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER 360 */}
      {/* ========================================================================= */}
      {activeTab === 'customer_360' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Building2 size={18} className="text-orange-500" />
                <span>Customer 360 Account Intelligence</span>
              </h3>
              <p className="text-xs text-zinc-500">Retail merchant 360° overview, debt recovery ledgers & store profiles</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search accounts & stores..."
                  className="form-input text-xs pl-8 py-1.5 rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customers
              .filter(c => {
                const q = searchQuery.toLowerCase();
                return !q || (c.name || '').toLowerCase().includes(q) || (c.business_name || '').toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
              })
              .map((c) => {
                const balance = Number(c.balance || 0);
                const limit = Number(c.credit_limit || 0);
                const hasDebt = balance > 0;

                return (
                  <div
                    key={c.id}
                    className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3 hover:border-orange-500/40 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                            {c.name || c.business_name}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400">{c.code || `CUST-100${c.id}`}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          {c.customer_type || 'Supermarket'}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <MapPin size={12} className="text-orange-500 shrink-0" />
                        <span className="truncate">{c.address || c.territory || 'Lagos Mainland'}</span>
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Credit Limit:</span>
                          <b className="text-zinc-900 dark:text-zinc-100">₦{limit.toLocaleString()}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Outstanding Debt:</span>
                          <b className={hasDebt ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                            ₦{balance.toLocaleString()}
                          </b>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-orange-500"
                            title="Call Outlet"
                          >
                            <Phone size={13} />
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={getWhatsAppDeepLink(c.phone, `Hello ${c.contact_person || c.name}, this is EdgeWForce Field Rep.`)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                            title="WhatsApp Chat"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                        {c.address && (
                          <a
                            href={getGoogleMapsDirLink(c.address)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                            title="Google Maps Navigation"
                          >
                            <Navigation size={13} />
                          </a>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedCustomerId360(c.id)}
                        className="px-3 py-1 text-xs font-bold text-orange-600 hover:bg-orange-500/10 rounded-lg transition"
                      >
                        View 360° Profile →
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'directory' && (
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users size={18} className="text-orange-500" />
                <span>Commercial Merchant & Outlet Directory</span>
              </h3>
              <p className="text-xs text-zinc-500">Retail store verification statuses, addresses, and contacts</p>
            </div>

            <button
              onClick={() => setStoreRequestModalOpen(true)}
              className="btn-primary text-xs py-1.5 px-3.5 bg-orange-500 text-white rounded-xl font-bold flex items-center gap-1"
            >
              <Plus size={13} />
              <span>+ Register New Outlet</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Merchant Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Contact Person</th>
                  <th className="pb-2">Address</th>
                  <th className="pb-2">Credit Limit</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-500/5 transition">
                    <td className="py-3 font-mono font-bold text-orange-600 dark:text-orange-400">
                      {c.code || `CUST-${c.id}`}
                    </td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      {c.name || c.business_name}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      {c.customer_type || 'Retail Outlets'}
                    </td>
                    <td className="py-3 text-zinc-600 dark:text-zinc-400">
                      <div>{c.contact_person || 'Store Manager'}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{c.phone || '—'}</div>
                    </td>
                    <td className="py-3 text-zinc-500 truncate max-w-[200px]" title={c.address}>
                      {c.address || c.territory || 'Lagos, Nigeria'}
                    </td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">
                      ₦{(c.credit_limit || 0).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedCustomerId360(c.id)}
                        className="px-2.5 py-1 text-xs font-bold text-orange-600 hover:bg-orange-500/10 rounded-lg transition"
                      >
                        360 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: FLEET */}
      {/* ========================================================================= */}
      {activeTab === 'fleet' && (
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Truck size={18} className="text-orange-500" />
                <span>Fleet Dispatches & Waybills</span>
              </h3>
              <p className="text-xs text-zinc-500">Live order deliveries, proof of delivery (POD), and carrier tracking</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {deliveries.map((del) => (
              <div
                key={del.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 surface-card-subtle space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono font-bold text-orange-600 dark:text-orange-400 text-xs">
                    {del.order_number || `WAYBILL-${del.id}`}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    del.delivery_status === 'DELIVERED'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {del.delivery_status || 'IN TRANSIT'}
                  </span>
                </div>

                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">
                    {del.customer_name || 'Retail Supermarket'}
                  </div>
                  <div className="text-zinc-500 text-[11px] mt-0.5">{del.delivery_address || 'Lagos Central Depot'}</div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-mono text-[11px]">
                    Total: ₦{(del.total_amount || 0).toLocaleString()}
                  </span>
                  <span className="text-emerald-600 font-bold text-[11px]">
                    {del.delivery_status === 'DELIVERED' ? '✓ Proof of Delivery Confirmed' : 'In Dispatch Fleet'}
                  </span>
                </div>
              </div>
            ))}

            {deliveries.length === 0 && (
              <div className="col-span-2 text-center py-10 text-zinc-400 text-xs">
                No active fleet deliveries assigned to your vehicle/territory.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PROOF OF PAYMENT */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <WalletCards size={18} className="text-orange-500" />
                  <span>Proof of Payment & Field Collections</span>
                </h3>
                <p className="text-xs text-zinc-500">Log cash collections, POS slips, bank transfers and invoice settlements</p>
              </div>

              <button
                onClick={() => setNewPaymentModalOpen(true)}
                className="btn-primary text-xs py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>+ Record Payment Collection</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Ref / Receipt #</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Amount (₦)</th>
                    <th className="pb-2">Method</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {collections.map((col) => (
                    <tr key={col.id} className="hover:bg-zinc-500/5 transition">
                      <td className="py-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {col.reference || `COL-00${col.id}`}
                      </td>
                      <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {col.customer_name || 'Retail Outlet'}
                      </td>
                      <td className="py-3 font-bold text-emerald-600">
                        ₦{(col.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-zinc-600 dark:text-zinc-400">
                        {col.payment_method || 'Bank Transfer'}
                      </td>
                      <td className="py-3 text-zinc-400 font-mono text-[11px]">
                        {formatDate(col.created_at || new Date().toISOString())}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setReceiptModalOrder({
                            order_number: col.reference || `COL-00${col.id}`,
                            customer_name: col.customer_name || 'Merchant',
                            total_amount: col.amount,
                            payment_method: col.payment_method,
                            created_at: col.created_at || new Date().toISOString(),
                            items: []
                          })}
                          className="px-2.5 py-1 text-xs font-bold text-orange-600 hover:bg-orange-500/10 rounded-lg transition"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  {collections.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-400 text-xs">
                        No payment collections recorded yet. Click "+ Record Payment Collection" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: ALERT & RED FLAG CENTER */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                <span>Alert & Red Flag Operational Center</span>
              </h3>
              <p className="text-xs text-zinc-500">Live geofence breaches, out-of-route notifications, and urgent advisories</p>
            </div>
          </div>

          <div className="space-y-3">
            {alerts.map((al) => (
              <div
                key={al.id}
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  al.severity === 'CRITICAL' || al.type === 'GEOFENCE_BREACH'
                    ? 'border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-200'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200'
                }`}
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-orange-500" />
                <div className="flex-1 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {al.title || al.alert_type || 'Operational Advisory'}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatTime(al.created_at || new Date().toISOString())}
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {al.message || al.description || 'Geofence boundary monitored. Maintain proximity within 150m of assigned stops.'}
                  </p>
                </div>
              </div>
            ))}

            {alerts.length === 0 && (
              <div className="text-center py-10 text-zinc-400 text-xs">
                ✓ No active red flags or geofence breaches. Field operations nominal.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: EMERGENCY SOS */}
      {/* ========================================================================= */}
      {activeTab === 'safety' && (
        <div className="space-y-5">
          <div className="surface-card rounded-2xl p-6 border-2 border-rose-500/30 bg-rose-500/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <ShieldAlert size={22} />
                  <span>Emergency SOS Distress System</span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                  1-Tap instant distress panic beacon. Broadcasts your live GPS coordinates to Management & Security.
                </p>
              </div>

              <button
                onClick={() => setSOSModalOpen(true)}
                className="btn-primary py-3 px-6 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition flex items-center gap-2"
              >
                <ShieldAlert size={18} />
                <span>TRIGGER SOS BEACON</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-rose-500/20 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">Corporate Security Control</div>
                <div className="text-zinc-500">24/7 Rapid Response Dispatch Hotline</div>
                <a href="tel:+2348000000001" className="font-mono font-bold text-orange-600 block mt-1">
                  📞 +234 800 000 0001
                </a>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-zinc-100">National Emergency Services</div>
                <div className="text-zinc-500">Nigeria Police Force & Emergency Ambulance</div>
                <a href="tel:112" className="font-mono font-bold text-rose-600 block mt-1">
                  🚨 Toll-Free: 112 / 199
                </a>
              </div>
            </div>
          </div>

          {/* Past SOS Beacons History */}
          <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Your Emergency SOS Signals History
            </h4>
            <div className="space-y-2 text-xs">
              {sosHistory.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <b className="text-rose-600">{s.reason || 'Distress Alarm'}</b>
                    <div className="text-[11px] text-zinc-400">
                      GPS: {s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)} • {formatDate(s.created_at)}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {s.status || 'RECORDED'}
                  </span>
                </div>
              ))}
              {sosHistory.length === 0 && (
                <div className="text-zinc-400 text-xs py-4 text-center">No past emergency signals recorded.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'queue' && (
        <div className="surface-card rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ClipboardCheck size={18} className="text-orange-500" />
                <span>Daily Operational Tasks & Deliverables Queue</span>
              </h3>
              <p className="text-xs text-zinc-500">Acknowledge assignments, verify store audits, and complete deliverables</p>
            </div>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 surface-card-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {task.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {task.status || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-zinc-500 leading-relaxed">{task.description || 'Assigned task for today.'}</p>
                  <div className="text-[10px] text-zinc-400 font-mono">
                    Due: {formatDate(task.due_date || new Date().toISOString())}
                  </div>
                </div>

                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleAcknowledgeTask(task.id)}
                    className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0"
                  >
                    I'm Aware / Acknowledge
                  </button>
                )}
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="text-center py-10 text-zinc-400 text-xs">
                No active tasks in your operational queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. SOS Panic Modal */}
      <SOSModal
        isOpen={sosModalOpen}
        onClose={() => setSOSModalOpen(false)}
        currentLocation={agentLocation}
      />

      {/* 2. Store Request / Registration Modal */}
      <StoreRequestModal
        isOpen={storeRequestModalOpen}
        onClose={() => setStoreRequestModalOpen(false)}
        onCreated={loadAllData}
        currentLocation={agentLocation}
      />

      {/* 3. Store Visit Modal */}
      <StoreVisitModal
        store={selectedStoreForVisit}
        isOpen={storeVisitModalOpen}
        onClose={() => {
          setStoreVisitModalOpen(false);
          setSelectedStoreForVisit(null);
        }}
        onCompleted={loadAllData}
        currentLocation={agentLocation}
      />

      {/* 4. Customer 360 Modal */}
      <Customer360Modal
        customerId={selectedCustomerId360}
        isOpen={Boolean(selectedCustomerId360)}
        onClose={() => setSelectedCustomerId360(null)}
      />

      {/* 5. Printable Receipt Modal */}
      <ReceiptModal
        order={receiptModalOrder}
        isOpen={Boolean(receiptModalOrder)}
        onClose={() => setReceiptModalOrder(null)}
      />

      {/* 6. Record Payment Collection Modal */}
      {newPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="surface-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <WalletCards size={18} className="text-emerald-600" />
              <span>Record Payment Collection</span>
            </h3>
            <p className="text-xs text-zinc-500">Collect cash, POS slip or bank transfer from merchant</p>

            <form onSubmit={handleCreatePaymentCollection} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">Select Customer Outlet *</label>
                <select
                  required
                  className="form-input text-xs"
                  value={paymentForm.customer_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, customer_id: e.target.value })}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.business_name} (Bal: ₦{(c.balance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">Amount Collected (₦) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  className="form-input text-xs"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">Payment Method</label>
                <select
                  className="form-input text-xs"
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                >
                  <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                  <option value="POS Terminal Slip">POS Terminal Slip</option>
                  <option value="Cash">Cash Handover</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-800 dark:text-zinc-200 mb-1">Transaction Ref / Slip No.</label>
                <input
                  type="text"
                  placeholder="e.g. REF-9830219"
                  className="form-input text-xs"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setNewPaymentModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3 border rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="btn-primary text-xs py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1"
                >
                  {paymentSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  <span>{paymentSubmitting ? 'Recording...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
