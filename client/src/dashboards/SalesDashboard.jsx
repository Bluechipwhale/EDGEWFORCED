import AttendanceControl from '../components/employee/AttendanceControl';
import React, { useState, useEffect } from 'react';
import {
  WalletCards,
  Target,
  ShoppingCart,
  Users,
  MapPin,
  CheckCircle2,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Package,
  Award,
  Sparkles,
  Phone,
  MessageCircle,
  ExternalLink,
  DollarSign,
  Clock,
  Play,
  Square,
  AlertTriangle,
  Store,
  Globe,
  Trash2,
  Boxes
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import ReceiptModal from '../components/sales/ReceiptModal';
import MerchantModal from '../components/sales/MerchantModal';
import CompetitorModal from '../components/sales/CompetitorModal';
import SettlementModal from '../components/sales/SettlementModal';
import CopilotDrawer from '../components/sales/CopilotDrawer';
import StoreRequestModal from '../components/field/StoreRequestModal';
import GeoLocationReportView from '../components/field/GeoLocationReportView';
import { formatMoney, formatMoneyShort, formatPercent, formatDate, getWhatsAppDeepLink, getGoogleMapsDirLink } from '../lib/formatters';
import { getCurrentGPSLocation } from '../lib/geo';
import { api } from '../lib/api';
import { apiRequest } from '../utils/api';
import { enqueueOfflineAction } from '../lib/offline';

export default function SalesDashboard({ user }) {
  const [tab, setTab] = useState('overview');
  const [windowStatus, setWindowStatus] = useState(null);
  const [report, setReport] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [collections, setCollections] = useState([]);
  const [intel, setIntel] = useState([]);
  const [settlements, setSettlements] = useState([]);

  // Shift & Telemetry State
  const [shift, setShift] = useState(null);
  const [agentLocation, setAgentLocation] = useState(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftStatusMsg, setShiftStatusMsg] = useState('');
  const [shiftErrorMsg, setShiftErrorMsg] = useState('');
  const [elapsedWorkingSeconds, setElapsedWorkingSeconds] = useState(0);

  // POS State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [posCustomerSearch, setPosCustomerSearch] = useState('');
  const [posCustomerDropdownOpen, setPosCustomerDropdownOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [posSuccessMsg, setPosSuccessMsg] = useState('');
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Collections State
  const [collectCustomerId, setCollectCustomerId] = useState('');
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('Cash');
  const [collectRef, setCollectRef] = useState('');
  const [collectMsg, setCollectMsg] = useState('');

  // Modals & Drawers
  const [merchantModalOpen, setMerchantModalOpen] = useState(false);
  const [competitorModalOpen, setCompetitorModalOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [storeRequestModalOpen, setStoreRequestModalOpen] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Beverages & Drinks',
    unit: 'carton',
    price: 15000,
    cost_price: 12000,
    stock_quantity: 50,
    reorder_level: 10,
    warehouse_name: 'Ikeja Central Depot'
  });

  // Filters
  const [customerSearch, setCustomerSearch] = useState('');
  const [productCategory, setProductCategory] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const loadData = async () => {
    try {
      const [rData, cData, pData, oData, colData, iData, sData, curShift, windowRes] = await Promise.all([
        api.get('/sales/my-report').catch(() => null),
        api.get('/sales/customers').catch(() => []),
        api.get('/sales/products').catch(() => []),
        api.get('/sales/orders').catch(() => []),
        api.get('/sales/payments').catch(() => []),
        api.get('/sales/competitor-intel').catch(() => []),
        api.get('/sales/settlements').catch(() => []),
        apiRequest('/field/shifts/current').catch(() => ({ data: null })),
        apiRequest('/field/shifts/window-status').catch(() => ({ data: null }))
      ]);
      if (rData) setReport(rData);
      setCustomers(cData || []);
      setProducts(pData || []);
      setOrders(oData || []);
      setCollections(colData || []);
      setIntel(iData || []);
      setSettlements(sData || []);
      setShift(curShift?.data || curShift?.shift || null);
      setWindowStatus(windowRes?.data || windowRes || null);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadData();

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
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Periodic Telemetry Ping during active shift
  useEffect(() => {
    if (!shift?.clock_in_time || shift?.clock_out_time) return;

    const sendPing = async () => {
      if (!agentLocation) return;
      try {
        await apiRequest('/field/location-ping', 'POST', {
          latitude: agentLocation.latitude,
          longitude: agentLocation.longitude,
          accuracy: agentLocation.accuracy,
          current_activity: 'Store Sales Route'
        });
      } catch (err) {
        console.warn('Sales location ping:', err.message);
      }
    };

    const interval = setInterval(sendPing, 45000);
    return () => clearInterval(interval);
  }, [shift, agentLocation]);

  // Working Duration Timer
  useEffect(() => {
    if (!shift?.clock_in_time || shift?.clock_out_time) {
      setElapsedWorkingSeconds(0);
      return;
    }

    const inTime = new Date(shift.clock_in_time).getTime();
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
    setShiftStatusMsg('');
    setShiftErrorMsg('');
    try {
      let lat = agentLocation?.latitude;
      let lng = agentLocation?.longitude;

      if (!lat || !lng) {
        const p = await getCurrentGPSLocation();
        lat = p.latitude;
        lng = p.longitude;
        setAgentLocation(p);
      }

      const res = await apiRequest('/field/shifts/toggle', 'POST', {
        latitude: lat,
        longitude: lng,
        device: navigator.userAgent
      });

      setShift(res.data || res);
      setShiftStatusMsg(res.clock_out_time || res.data?.clock_out_time ? '✓ Shift concluded. Total working duration logged.' : '✓ Shift started. GPS 150m geofencing & tracking active.');
      loadData();
    } catch (err) {
      setShiftErrorMsg(err.message || 'Shift action failed');
    } finally {
      setShiftLoading(false);
    }
  };

  const isShiftActive = shift?.clock_in_time && !shift?.clock_out_time;


  // POS Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.quantity * Number(item.price)), 0);
  const discountVal = Math.min(Number(discount || 0), subtotal);
  const taxable = Math.max(0, subtotal - discountVal);
  const vat = Math.round(taxable * 0.075 * 100) / 100;
  const grandTotal = taxable + vat;

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock_quantity) }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: 1,
          max_stock: product.stock_quantity
        }
      ];
    });
  };

  const handleCreateOrder = async () => {
    if (!selectedCustomerId || cart.length === 0) return;
    setSubmittingOrder(true);
    setPosSuccessMsg('');

    const orderPayload = {
      customer_id: selectedCustomerId,
      items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      discount: discountVal,
      payment_method: paymentMethod,
      notes: orderNotes
    };

    try {
      if (!navigator.onLine) {
        await enqueueOfflineAction('/sales/orders', 'POST', orderPayload, 'Book POS Order');
        setPosSuccessMsg('Order queued locally in Offline Mode. It will sync upon reconnection.');
        setCart([]);
      } else {
        const order = await api.post('/sales/orders', orderPayload);
        setPosSuccessMsg(`Order ${order.order_number} booked successfully!`);
        setActiveReceipt(order);
        setCart([]);
        loadData();
      }
    } catch (err) {
      setPosSuccessMsg(`Order Failed: ${err.message}`);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handlePostCollection = async (e) => {
    e.preventDefault();
    if (!collectCustomerId || !collectAmount) return;

    try {
      await api.post('/sales/payments', {
        customer_id: collectCustomerId,
        amount: Number(collectAmount),
        payment_method: collectMethod,
        reference_number: collectRef
      });
      setCollectMsg('Payment collected and customer balance updated!');
      setCollectAmount('');
      setCollectCustomerId('');
      loadData();
    } catch (err) {
      setCollectMsg(`Error: ${err.message}`);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.price) return;
    setAddingProduct(true);
    try {
      await api.post('/sales/products', productForm);
      setAddProductModalOpen(false);
      setProductForm({
        name: '',
        sku: '',
        category: 'Beverages & Drinks',
        unit: 'carton',
        price: 15000,
        cost_price: 12000,
        stock_quantity: 50,
        reorder_level: 10,
        warehouse_name: 'Ikeja Central Depot'
      });
      loadData();
    } catch (err) {
      alert(`Failed to add product: ${err.message}`);
    } finally {
      setAddingProduct(false);
    }
  };

  const handleDeleteProduct = async (prodId, prodName) => {
    if (!window.confirm(`Are you sure you want to delete SKU "${prodName}" from commercial catalog?`)) return;
    try {
      await api.delete(`/sales/products/${prodId}`);
      loadData();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedCustomerId));

  return (
    <div className="space-y-6">
      {/* Cockpit Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span>Commercial Sales Cockpit</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
              5% Commission Engine
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            POS order execution, customer credit ledger, competitor intelligence & automated commission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStoreRequestModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
          >
            <Store size={15} className="text-orange-500" />
            <span>Register Store / Outlet</span>
          </button>
          <button
            onClick={() => setCopilotOpen(true)}
            className="btn-primary bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-md text-xs py-2 px-3.5"
          >
            <Sparkles size={15} />
            <span>Sales AI Copilot</span>
          </button>
          <button
            onClick={() => setMerchantModalOpen(true)}
            className="btn-secondary text-xs py-2 px-3.5"
          >
            <Plus size={15} />
            <span>Register Merchant</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-zinc-200 dark:border-zinc-800">
        {[
          ['overview', 'Cockpit KPIs & Target'],
          ['orders', 'New POS Terminal'],
          ['history', 'Sales History'],
          ['customers', 'Customer Directory & GPS'],
          ['catalog', 'Product Catalog'],
          ['collections', 'Collections Ledger'],
          ['intel', 'Competitor Intelligence'],
          ['settlement', 'Daily Settlement'],
          ['geolocation', 'Geo-Location Report']
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              tab === id
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: COCKPIT OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* GPS Shift & Geofence Telemetry Banner */}
          <div className={`p-4.5 rounded-2xl border transition-all ${
            isShiftActive
              ? 'bg-gradient-to-r from-emerald-600/15 via-emerald-500/10 to-teal-500/15 border-emerald-500/30'
              : 'surface-card border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs ${
                  windowStatus?.window_info?.allowed ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}>
                  <Clock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                      Smart Shift Attendance
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      windowStatus?.window_info?.allowed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {windowStatus?.window_info?.label || (isShiftActive ? 'SHIFT ACTIVE' : 'ATTENDANCE STANDBY')}
                    </span>
                    {windowStatus?.lagos_time && (
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        Lagos: {windowStatus.lagos_time.formatted12h}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5 flex items-center gap-2">
                    {windowStatus?.window_info?.allowed ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ {windowStatus.window_info.message}
                      </span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {windowStatus?.window_info?.message || 'Attendance window closed.'}
                      </span>
                    )}
                  </div>
                  {agentLocation && (
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      GPS: {agentLocation.latitude.toFixed(5)}, {agentLocation.longitude.toFixed(5)} (±{Math.round(agentLocation.accuracy)}m) &bull; Geofencing Active
                    </div>
                  )}
                </div>
              </div>

              <AttendanceControl onRecorded={loadData} />
            </div>


            {shiftStatusMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{shiftStatusMsg}</span>
              </div>
            )}

            {shiftErrorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{shiftErrorMsg}</span>
              </div>
            )}
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <StatCard
              title="Today's Sales"
              value={formatMoney(report?.todaySales || 0)}
              icon={WalletCards}
              subtitle="Closed Today"
            />
            <StatCard
              title="Monthly Sales"
              value={formatMoney(report?.monthlySales || 0)}
              icon={Target}
              subtitle={`Target: ${formatMoneyShort(report?.monthlyTarget || 10000000)}`}
            />
            <StatCard
              title="Target Achievement"
              value={formatPercent(report?.targetAchievement || 0)}
              icon={CheckCircle2}
              trend={report?.targetAchievement > 70 ? 12.5 : -2.1}
            />
            <StatCard
              title="Take-Home Commission (5%)"
              value={formatMoney(report?.commission || 0)}
              icon={Award}
              subtitle="Earned on Closed Orders"
            />
            <StatCard
              title="Orders Today"
              value={report?.ordersToday || 0}
              icon={ShoppingCart}
            />
            <StatCard
              title="Outstanding Debt"
              value={formatMoney(report?.outstandingDebt || 0)}
              icon={WalletCards}
              subtitle="Across Merchant Ledgers"
            />
            <StatCard
              title="New Outlets Added"
              value={report?.newOutletsAdded || 0}
              icon={Users}
              subtitle="This Month"
            />
            <StatCard
              title="Visits Completed"
              value={report?.visitsCompletedToday || 0}
              icon={MapPin}
              subtitle="Today's Itinerary"
            />
          </div>

          {/* Commission Engine & Target Celebration Box */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 surface-card rounded-xl p-5 sunburst-card border border-orange-500/30">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500">
                    Commercial Incentive Engine
                  </span>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                    5% Take-Home Sales Commission
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg">
                    Automatically calculated from confirmed and delivered sales. Every booking directly increments your payout ledger.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-orange-500">
                    {formatMoney(report?.commission || 0)}
                  </div>
                  <div className="text-[10px] text-zinc-400">Current Take-Home</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  <span>Progress to Target ({formatMoney(report?.monthlySales || 0)} / {formatMoney(report?.monthlyTarget || 10000000)})</span>
                  <span>{formatPercent(report?.targetAchievement || 0)}</span>
                </div>
                <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, report?.targetAchievement || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Today's Scheduled Itinerary */}
            <div className="surface-card rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <MapPin size={16} className="text-orange-500" />
                <span>Today's Customer Itinerary</span>
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {(report?.schedule || []).map((v) => (
                  <div key={v.id} className="p-2.5 rounded-lg surface-card-subtle flex items-center justify-between text-xs">
                    <div>
                      <b className="text-zinc-900 dark:text-zinc-100">{v.customer?.name || 'Customer Outlet'}</b>
                      <div className="text-[10px] text-zinc-400">{v.priority || 'Normal'} priority • {v.status}</div>
                    </div>
                    {v.customer?.phone && (
                      <a
                        href={getWhatsAppDeepLink(v.customer.phone, `Good day, this is Adebanjo from Experiential Edge. I will be visiting your outlet today.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg"
                      >
                        <MessageCircle size={15} />
                      </a>
                    )}
                  </div>
                ))}
                {(!report?.schedule || report.schedule.length === 0) && (
                  <div className="text-xs text-zinc-400 text-center py-4">
                    No scheduled stops assigned for today.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NEW POS TERMINAL */}
      {tab === 'orders' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Product & Customer Selector */}
          <div className="lg:col-span-2 space-y-4">
            {/* Customer Picker & Credit Warning */}
            <div className="surface-card rounded-xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  1. Select Retail Customer Outlet *
                </label>
                {selectedCustomerObj && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId('');
                      setPosCustomerSearch('');
                      setPosCustomerDropdownOpen(true);
                    }}
                    className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    Change Outlet
                  </button>
                )}
              </div>

              {/* Searchable Combobox Container */}
              <div className="relative">
                {selectedCustomerObj && !posCustomerDropdownOpen ? (
                  <div
                    onClick={() => setPosCustomerDropdownOpen(true)}
                    className="p-3 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400">
                          {selectedCustomerObj.code}
                        </span>
                        <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                          {selectedCustomerObj.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        {selectedCustomerObj.address} • {selectedCustomerObj.territory} • {selectedCustomerObj.phone}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        Number(selectedCustomerObj.balance) > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        Debt: {formatMoney(selectedCustomerObj.balance)}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        Limit: {formatMoney(selectedCustomerObj.credit_limit)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        autoFocus={posCustomerDropdownOpen}
                        placeholder="Search merchant by name, code (e.g. CUST-1001), territory, phone..."
                        className="form-input pl-9 pr-8 text-xs"
                        value={posCustomerSearch}
                        onChange={(e) => {
                          setPosCustomerSearch(e.target.value);
                          setPosCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setPosCustomerDropdownOpen(true)}
                      />
                      {posCustomerSearch && (
                        <button
                          type="button"
                          onClick={() => setPosCustomerSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filtered Dropdown List */}
                    {posCustomerDropdownOpen && (
                      <div className="max-h-60 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl divide-y divide-zinc-100 dark:divide-zinc-800/60 z-20">
                        {customers
                          .filter(c => {
                            if (!posCustomerSearch) return true;
                            const q = posCustomerSearch.toLowerCase();
                            return (
                              c.name?.toLowerCase().includes(q) ||
                              c.code?.toLowerCase().includes(q) ||
                              c.territory?.toLowerCase().includes(q) ||
                              c.address?.toLowerCase().includes(q) ||
                              c.phone?.includes(q) ||
                              c.contact_person?.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 30)
                          .map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomerId(String(c.id));
                                setPosCustomerDropdownOpen(false);
                                setPosCustomerSearch('');
                              }}
                              className={`p-3 text-xs cursor-pointer transition flex items-center justify-between hover:bg-orange-500/10 ${
                                String(selectedCustomerId) === String(c.id) ? 'bg-orange-500/15 font-bold' : ''
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-zinc-400">{c.code}</span>
                                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{c.name}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate max-w-sm mt-0.5">
                                  {c.address} • {c.territory} • {c.phone}
                                </div>
                              </div>

                              <div className="text-right shrink-0 pl-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  Number(c.balance) > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                                }`}>
                                  Debt: {formatMoney(c.balance)}
                                </span>
                                <div className="text-[10px] text-zinc-400 mt-0.5">
                                  Limit: {formatMoney(c.credit_limit)}
                                </div>
                              </div>
                            </div>
                          ))}

                        {customers.filter(c => {
                          if (!posCustomerSearch) return true;
                          const q = posCustomerSearch.toLowerCase();
                          return (
                            c.name?.toLowerCase().includes(q) ||
                            c.code?.toLowerCase().includes(q) ||
                            c.territory?.toLowerCase().includes(q) ||
                            c.address?.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="p-4 text-center text-xs text-zinc-400">
                            No matching customer outlets found for "{posCustomerSearch}".
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Credit Status Pill */}
              {selectedCustomerObj && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
                  Number(selectedCustomerObj.balance) >= Number(selectedCustomerObj.credit_limit) * 0.8
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}>
                  <span>Credit Availability:</span>
                  <span>
                    {formatMoney(Math.max(0, selectedCustomerObj.credit_limit - selectedCustomerObj.balance))} Remaining of {formatMoney(selectedCustomerObj.credit_limit)}
                  </span>
                </div>
              )}
            </div>

            {/* Product Catalog Grid */}
            <div className="surface-card rounded-xl p-4.5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  2. Select Products to Add to Cart
                </h3>
                <div className="flex gap-2">
                  <select
                    className="form-input text-xs py-1"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option>Cooking Essentials</option>
                    <option>Beverages</option>
                    <option>Commodities</option>
                    <option>Noodles & Pasta</option>
                    <option>Dairy</option>
                    <option>Seasonings</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {products
                  .filter(p => productCategory === 'all' || p.category === productCategory)
                  .map((product) => {
                    const isOutOfStock = product.stock_quantity <= 0;
                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && addToCart(product)}
                        className={`p-3.5 rounded-xl border text-left transition select-none flex flex-col justify-between ${
                          isOutOfStock
                            ? 'opacity-45 bg-zinc-100 dark:bg-zinc-900 border-zinc-200 cursor-not-allowed'
                            : 'surface-card-subtle border-zinc-200 dark:border-zinc-800 hover:border-orange-500 cursor-pointer shadow-xs'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">{product.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">{product.sku} • {product.category}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                          <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                            {formatMoney(product.price)}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            product.stock_quantity <= 20
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}>
                            {product.stock_quantity} in stock
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right: Cart, VAT & Checkout */}
          <div className="surface-card rounded-xl p-5 space-y-4 h-fit sticky top-20 border border-orange-500/20">
            <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShoppingCart size={18} className="text-orange-500" />
              <span>POS Cart & Checkout</span>
            </h3>

            {/* Cart Items */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.product_id} className="p-2.5 rounded-lg surface-card-subtle flex items-center justify-between text-xs">
                  <div className="pr-2 min-w-0">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-400">{formatMoney(item.price)} each</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setCart(c => c.map(x => x.product_id === item.product_id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x))}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs"
                    >
                      −
                    </button>
                    <span className="font-bold text-xs w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => setCart(c => c.map(x => x.product_id === item.product_id ? { ...x, quantity: Math.min(item.max_stock, x.quantity + 1) } : x))}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="p-6 text-center text-zinc-400 text-xs">
                  Cart is empty. Click any product to add.
                </div>
              )}
            </div>

            {/* Discount & Payment Method */}
            <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 mb-1">Commercial Discount (₦)</label>
                <input
                  type="number"
                  className="form-input text-xs"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 mb-1">Payment Method</label>
                <select
                  className="form-input text-xs"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option>Bank Transfer</option>
                  <option>POS Terminal</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Credit</option>
                </select>
              </div>
            </div>

            {/* Order Totals Summary */}
            <div className="p-3 rounded-xl surface-card-subtle space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-emerald-500 font-semibold">
                  <span>Discount:</span>
                  <span>-{formatMoney(discountVal)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500">
                <span>VAT (7.5%):</span>
                <span>{formatMoney(vat)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-100 pt-1.5 border-t border-zinc-200 dark:border-zinc-800">
                <span>Grand Total:</span>
                <span className="text-orange-500">{formatMoney(grandTotal)}</span>
              </div>
            </div>

            {posSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                {posSuccessMsg}
              </div>
            )}

            <button
              onClick={handleCreateOrder}
              disabled={!selectedCustomerId || cart.length === 0 || submittingOrder}
              className="btn-primary w-full py-3"
            >
              <ShoppingCart size={16} />
              <span>{submittingOrder ? 'Processing…' : 'Submit & Book Order'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SALES & ORDER HISTORY */}
      {tab === 'history' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText size={18} className="text-orange-500" />
              <span>Commercial Order Records</span>
            </h3>
            <select
              className="form-input text-xs py-1 max-w-xs"
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
            >
              <option value="all">All Order Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Order #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Subtotal</th>
                  <th className="pb-2">VAT</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Payment</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {orders
                  .filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter)
                  .map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-3 font-bold font-mono text-zinc-900 dark:text-zinc-100">{order.order_number}</td>
                      <td className="py-3 font-semibold">{order.customer?.name || `Customer #${order.customer_id}`}</td>
                      <td className="py-3">{formatMoney(order.subtotal)}</td>
                      <td className="py-3">{formatMoney(order.vat_amount)}</td>
                      <td className="py-3 font-bold text-orange-600 dark:text-orange-400">{formatMoney(order.total_amount)}</td>
                      <td className="py-3">{order.payment_method}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'delivered' || order.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setActiveReceipt(order)}
                          className="text-xs font-semibold text-orange-500 hover:underline"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER DIRECTORY & GPS */}
      {tab === 'customers' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users size={18} className="text-orange-500" />
              <span>Merchant Register & GPS Navigation</span>
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search merchant by name, code or address..."
                className="form-input text-xs py-1"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <button onClick={() => setMerchantModalOpen(true)} className="btn-primary text-xs py-1 px-3 whitespace-nowrap">
                <Plus size={14} /> New Outlet
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Outlet & Address</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Balance</th>
                  <th className="pb-2">Credit Limit</th>
                  <th className="pb-2 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {customers
                  .filter(c => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.code.toLowerCase().includes(customerSearch.toLowerCase()))
                  .map((cust) => (
                    <tr key={cust.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-3 font-mono font-bold">{cust.code}</td>
                      <td className="py-3">
                        <div className="font-bold text-zinc-900 dark:text-zinc-100">{cust.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate max-w-xs">{cust.address}</div>
                      </td>
                      <td className="py-3">
                        <div>{cust.contact_person || '—'}</div>
                        <div className="text-[10px] text-zinc-400">{cust.phone}</div>
                      </td>
                      <td className="py-3 font-bold text-rose-500">{formatMoney(cust.balance)}</td>
                      <td className="py-3">{formatMoney(cust.credit_limit)}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {cust.latitude && (
                            <a
                              href={getGoogleMapsDirLink(cust.latitude, cust.longitude)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-orange-500 hover:bg-orange-500/10 rounded"
                              title="Directions"
                            >
                              <MapPin size={15} />
                            </a>
                          )}
                          {cust.phone && (
                            <a
                              href={getWhatsAppDeepLink(cust.phone, 'Good day from Experiential Edge.')}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                              title="WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PRODUCT CATALOG */}
      {tab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 surface-card p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Boxes size={18} className="text-orange-500" />
                <span>Commercial SKU Catalog & Price Directory</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Browse SKU prices, active inventory levels, or add new products to the catalog.
              </p>
            </div>
            <button
              onClick={() => setAddProductModalOpen(true)}
              className="btn-primary text-xs py-2 px-3 shadow-xs"
            >
              <Plus size={14} />
              <span>+ Add Product / SKU</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="surface-card rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-orange-500/30 transition">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-orange-500">{p.category}</span>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="text-zinc-400 hover:text-rose-500 p-1 rounded transition"
                      title="Delete Product"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{p.name}</h4>
                  <div className="text-[11px] text-zinc-400 font-mono mt-1">SKU: {p.sku}</div>
                </div>

                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-orange-600 dark:text-orange-400">{formatMoney(p.price)}</div>
                    <div className="text-[10px] text-zinc-400">Pack of {p.carton_pack_count || 12}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    p.stock_quantity <= 20
                      ? 'bg-rose-500/10 text-rose-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {p.stock_quantity} {p.unit}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: COLLECTIONS LEDGER */}
      {tab === 'collections' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="surface-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <DollarSign size={16} className="text-orange-500" />
              <span>Record Debt Recovery Payment</span>
            </h3>
            <form onSubmit={handlePostCollection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Customer Outlet</label>
                <select
                  required
                  className="form-input"
                  value={collectCustomerId}
                  onChange={(e) => setCollectCustomerId(e.target.value)}
                >
                  <option value="">Select owing customer...</option>
                  {customers.filter(c => Number(c.balance) > 0).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Owing: {formatMoney(c.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Amount Collected (₦)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  className="form-input"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Payment Method</label>
                <select
                  className="form-input"
                  value={collectMethod}
                  onChange={(e) => setCollectMethod(e.target.value)}
                >
                  <option>Bank Transfer</option>
                  <option>POS Terminal</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                </select>
              </div>

              {collectMsg && (
                <div className="text-xs text-emerald-500 font-semibold">{collectMsg}</div>
              )}

              <button type="submit" className="btn-primary w-full">
                Post Payment Collection
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 surface-card rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">
              Recent Recovered Collections
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Merchant</th>
                    <th className="pb-2">Amount Collected</th>
                    <th className="pb-2">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {collections.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5">{formatDate(c.payment_date || c.created_at)}</td>
                      <td className="py-2.5 font-bold">{c.customer?.name || `Customer #${c.customer_id}`}</td>
                      <td className="py-2.5 font-bold text-emerald-600">{formatMoney(c.amount)}</td>
                      <td className="py-2.5">{c.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: COMPETITOR INTEL */}
      {tab === 'intel' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Search size={18} className="text-orange-500" />
              <span>Competitor Market Pricing & Shelf Share</span>
            </h3>
            <button onClick={() => setCompetitorModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={14} /> Log Competitor Intel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {intel.map((item) => (
              <div key={item.id} className="surface-card-subtle rounded-xl p-4 space-y-2 border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-orange-500">{item.competitor_brand}</span>
                  <span className="text-[10px] text-zinc-400">{formatDate(item.created_at)}</span>
                </div>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{item.product_name}</h4>
                <div className="text-xs flex justify-between py-1 border-y border-zinc-200 dark:border-zinc-800">
                  <span>Shelf Price: <b>{formatMoney(item.observed_price)}</b></span>
                  <span>Our Price: <b>{formatMoney(item.our_price)}</b></span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Shelf Share: <b>{item.shelf_share_percent}%</b>
                </div>
                {item.promo_details && (
                  <p className="text-[11px] text-zinc-400 italic">"{item.promo_details}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: DAILY SETTLEMENT */}
      {tab === 'settlement' && (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Award size={18} className="text-orange-500" />
              <span>Cash-in-Hand EOD Reconciliation</span>
            </h3>
            <button onClick={() => setSettlementModalOpen(true)} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={14} /> Submit Reconciliation
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Actual Deposit</th>
                  <th className="pb-2">Expected Amount</th>
                  <th className="pb-2">Variance</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {settlements.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3">{formatDate(s.settlement_date || s.created_at)}</td>
                    <td className="py-3 font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(s.amount)}</td>
                    <td className="py-3">{formatMoney(s.expected_amount)}</td>
                    <td className="py-3 font-bold">{formatMoney(s.difference_amount)}</td>
                    <td className="py-3 font-mono">{s.deposit_reference}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 capitalize">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: GEO-LOCATION REPORT */}
      {tab === 'geolocation' && (
        <GeoLocationReportView user={user} defaultRoleFilter="SALES_AGENT" />
      )}

      {/* Modals & Copilot Drawer */}
      <ReceiptModal
        order={activeReceipt}
        isOpen={Boolean(activeReceipt)}
        onClose={() => setActiveReceipt(null)}
      />
      <MerchantModal
        isOpen={merchantModalOpen}
        onClose={() => setMerchantModalOpen(false)}
        onSaved={loadData}
      />
      <CompetitorModal
        customers={customers}
        isOpen={competitorModalOpen}
        onClose={() => setCompetitorModalOpen(false)}
        onSaved={loadData}
      />
      <SettlementModal
        isOpen={settlementModalOpen}
        onClose={() => setSettlementModalOpen(false)}
        onSaved={loadData}
      />
      <StoreRequestModal
        isOpen={storeRequestModalOpen}
        onClose={() => setStoreRequestModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Add Product / SKU Modal */}
      <Modal
        title="Add Commercial Product / SKU"
        isOpen={addProductModalOpen}
        onClose={() => setAddProductModalOpen(false)}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Product / Item Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Golden Penny Spaghetti 500g"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                SKU Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. SKU-GP-500G"
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                className="form-input font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Category
              </label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="form-input"
              >
                <option>Beverages & Drinks</option>
                <option>Food & Grains</option>
                <option>Personal Care & Hygiene</option>
                <option>Household Essentials</option>
                <option>General FMCG</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Selling Price (₦) *
              </label>
              <input
                type="number"
                required
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                className="form-input font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Cost Price (₦)
              </label>
              <input
                type="number"
                value={productForm.cost_price}
                onChange={(e) => setProductForm({ ...productForm, cost_price: Number(e.target.value) })}
                className="form-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number(e.target.value) })}
                className="form-input font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                className="form-input"
              >
                <option value="carton">Carton</option>
                <option value="pack">Pack</option>
                <option value="crate">Crate</option>
                <option value="bag">Bag</option>
                <option value="piece">Piece / Bottle</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="submit"
              disabled={addingProduct}
              className="btn-primary flex-1 py-2.5"
            >
              {addingProduct ? 'Adding SKU…' : '+ Add Product to Catalog'}
            </button>
            <button
              type="button"
              onClick={() => setAddProductModalOpen(false)}
              className="btn-secondary py-2.5 px-4"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        selectedCustomer={selectedCustomerObj}
        currentCart={cart}
      />
    </div>
  );
}

