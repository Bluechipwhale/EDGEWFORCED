import React, { useState, useEffect } from 'react';
import {
  Package,
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  Warehouse,
  History,
  TrendingDown,
  TrendingUp,
  MapPin,
  Edit3,
  CheckCircle2,
  X,
  FileText,
  Truck,
  ArrowRight,
  ClipboardList,
  Layers,
  Filter
} from 'lucide-react';
import { api } from '../lib/api';

const PHYSICAL_LOCATIONS = [
  'Warehouse Shelves',
  'Maryland Office Side',
  'Maryland Chidinma Office',
  'Maryland Beside Kitchen',
  'Ogba Upstairs',
  'Downstairs Middle Floor',
  'Ogba Side Store',
  'Ogba Office - Before Stairs',
  'Back of Ogba Office',
  'Diamond Estate'
];

export default function InventoryDashboard({ user }) {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [summary, setSummary] = useState({ totalSKUs: 0, totalQuantity: 0, totalValuation: 0, lowStockCount: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('stock'); // stock, movements, warehouses, collected

  // 1. Add Product Modal State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Hardware & Equipment',
    unit: 'pcs',
    price: '0',
    cost_price: '0',
    stock_quantity: 1,
    quantity_display: '1',
    reorder_level: 0,
    location_of_item: 'Warehouse Shelves',
    warehouse_name: 'Warehouse Shelves',
    condition: 'Not specified',
    shelf_number: '—'
  });
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // 2. Edit Shelve / Location Modal State
  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editLocationForm, setEditLocationForm] = useState({
    location_of_item: '',
    shelf_number: '',
    condition: '',
    quantity_display: ''
  });
  const [submittingShelf, setSubmittingShelf] = useState(false);

  // 3. Record Item Collection / Sign-Out Modal State
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    product_id: '',
    warehouse_id: 1,
    quantity: 1,
    collector_name: '',
    collector_phone: '',
    collector_department: 'Corporate Operations',
    waybill_number: '',
    purpose: 'Event / Activation Equipment Sign-Out',
    notes: ''
  });
  const [submittingCollection, setSubmittingCollection] = useState(false);

  // 4. Restock / Movement Modal State
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movementForm, setMovementForm] = useState({
    movement_type: 'RESTOCK',
    warehouse_id: 1,
    quantity: 1,
    reference_number: '',
    notes: ''
  });
  const [submittingMovement, setSubmittingMovement] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, movRes, whRes, sumRes] = await Promise.all([
        api.get('/inventory/products'),
        api.get('/inventory/movements'),
        api.get('/inventory/warehouses'),
        api.get('/inventory/summary')
      ]);

      const prods = prodRes?.data || prodRes || [];
      setProducts(prods);
      setMovements(movRes?.data || movRes || []);
      setWarehouses(whRes?.data || whRes || []);
      if (sumRes?.data || sumRes) {
        setSummary(sumRes?.data || sumRes);
      }
      if (prods.length > 0 && !collectionForm.product_id) {
        setCollectionForm(prev => ({ ...prev, product_id: prods[0].id }));
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Handle Add New Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) {
      alert('Item Name is required.');
      return;
    }
    setSubmittingProduct(true);
    try {
      await api.post('/inventory/products', {
        ...productForm,
        price: Number(productForm.price || 0),
        cost_price: Number(productForm.cost_price || 0),
        stock_quantity: Number(productForm.stock_quantity || 1),
        quantity_display: productForm.quantity_display || String(productForm.stock_quantity || 1),
        location_of_item: productForm.location_of_item || 'Warehouse Shelves',
        warehouse_name: productForm.location_of_item || 'Warehouse Shelves',
        condition: productForm.condition || 'Not specified',
        shelf_number: productForm.shelf_number || '—',
        shelve_location: productForm.shelf_number || '—',
        reorder_level: Number(productForm.reorder_level || 0)
      });
      setAddProductModalOpen(false);
      setProductForm({
        name: '',
        sku: '',
        category: 'Hardware & Equipment',
        unit: 'pcs',
        price: '0',
        cost_price: '0',
        stock_quantity: 1,
        quantity_display: '1',
        reorder_level: 0,
        location_of_item: 'Warehouse Shelves',
        warehouse_name: 'Warehouse Shelves',
        condition: 'Not specified',
        shelf_number: '—'
      });
      loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to create item');
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Handle Update Shelf / Location
  const handleSaveShelfLocation = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmittingShelf(true);
    try {
      await api.put(`/inventory/products/${editingProduct.id}`, {
        location_of_item: editLocationForm.location_of_item,
        warehouse_name: editLocationForm.location_of_item,
        shelf_number: editLocationForm.shelf_number,
        shelve_location: editLocationForm.shelf_number,
        condition: editLocationForm.condition,
        quantity_display: editLocationForm.quantity_display
      });
      setShelfModalOpen(false);
      setEditingProduct(null);
      loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to update item location & details');
    } finally {
      setSubmittingShelf(false);
    }
  };

  // Handle Record Item Collection
  const handleRecordCollection = async (e) => {
    e.preventDefault();
    if (!collectionForm.product_id || !collectionForm.collector_name) {
      alert('Product and Collector Name are required.');
      return;
    }
    setSubmittingCollection(true);
    try {
      const prod = products.find(p => String(p.id) === String(collectionForm.product_id));
      const refNum = collectionForm.waybill_number || `COLLECT-${Date.now().toString().slice(-5)}`;
      const noteDetails = `Item Collected By: ${collectionForm.collector_name} (${collectionForm.collector_department || 'Operations'}) | Phone: ${collectionForm.collector_phone || 'N/A'} | Purpose: ${collectionForm.purpose} | Notes: ${collectionForm.notes || 'Equipment released from store.'}`;

      await api.post('/inventory/movements', {
        product_id: Number(collectionForm.product_id),
        warehouse_id: Number(collectionForm.warehouse_id),
        movement_type: 'DISPATCH',
        quantity: Number(collectionForm.quantity),
        reference_number: refNum,
        notes: noteDetails
      });

      setCollectionModalOpen(false);
      setCollectionForm({
        product_id: products[0]?.id || '',
        warehouse_id: 1,
        quantity: 1,
        collector_name: '',
        collector_phone: '',
        collector_department: 'Corporate Operations',
        waybill_number: '',
        purpose: 'Event / Activation Equipment Sign-Out',
        notes: ''
      });
      loadInventory();
      setActiveTab('collected');
    } catch (err) {
      alert(err.message || 'Failed to record item collection');
    } finally {
      setSubmittingCollection(false);
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setSubmittingMovement(true);
    try {
      await api.post('/inventory/movements', {
        product_id: selectedProduct.id,
        warehouse_id: movementForm.warehouse_id,
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity),
        reference_number: movementForm.reference_number || `RESTOCK-${Date.now().toString().slice(-4)}`,
        notes: movementForm.notes
      });
      setMovementModalOpen(false);
      loadInventory();
    } catch (err) {
      alert(err.message || 'Failed to record stock movement');
    } finally {
      setSubmittingMovement(false);
    }
  };

  // Derive unique categories and locations
  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const allLocations = ['all', ...PHYSICAL_LOCATIONS];

  // Combined smart filter across all 10 locations and fields
  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.location_of_item || p.warehouse_name || '').toLowerCase().includes(q) ||
      (p.shelf_number || p.shelve_location || '').toLowerCase().includes(q) ||
      (p.condition || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.quantity_display || '').toLowerCase().includes(q);

    const matchCat = categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
    
    const pLoc = (p.location_of_item || p.warehouse_name || '').toLowerCase();
    const matchLoc = locationFilter === 'all' || pLoc === locationFilter.toLowerCase() || pLoc.includes(locationFilter.toLowerCase());

    const matchLow = !lowStockOnly || ((p.reorder_level > 0) && (p.stock_quantity <= p.reorder_level));

    return matchSearch && matchCat && matchLoc && matchLow;
  });

  const collectedMovements = movements.filter(m => m.movement_type === 'DISPATCH' || (m.notes && m.notes.toLowerCase().includes('collected')));

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Unified Physical Inventory
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              10 Locations Consolidated
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1">
            Physical Inventory & Stock Records
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Single unified workspace across all 10 physical storage facilities in Maryland, Ogba, Warehouse Shelves, and Diamond Estate.
          </p>
        </div>

        {/* Global Action Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAddProductModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <Plus size={15} /> + Add Item / SKU
          </button>

          <button
            onClick={() => setCollectionModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
          >
            <ClipboardList size={15} /> + Record Item Sign-Out
          </button>

          <button
            onClick={loadInventory}
            disabled={loading}
            className="p-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition"
            title="Refresh Inventory"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Total Items / SKUs</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600"><Package size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">{products.length}</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Across all 10 locations</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Physical Locations</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600"><MapPin size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">10 Sites</div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Maryland, Ogba, Diamond Estate</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Warehouse Shelves</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600"><Boxes size={16} /></div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
            {products.filter(p => (p.location_of_item || '').includes('Warehouse Shelves')).length}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">Numbered shelves eestr001–084</span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Dispatched / Signed Out</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600"><ClipboardList size={16} /></div>
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{collectedMovements.length}</div>
          <span className="text-[11px] text-purple-500 mt-0.5 block">Logged sign-out movements</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
          }`}
        >
          <Boxes size={14} />
          <span>Consolidated Stock Catalog ({filteredProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'warehouses'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
          }`}
        >
          <MapPin size={14} />
          <span>10 Physical Storage Sites</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
          }`}
        >
          <History size={14} />
          <span>Movement History ({movements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('collected')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'collected'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
          }`}
        >
          <ClipboardList size={13} />
          <span>Signed-Out Items Log ({collectedMovements.length})</span>
        </button>
      </div>

      {/* Tab 1: Stock Catalog */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Smart Search */}
              <div className="relative min-w-[280px] flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Smart Search: Item, Location, Shelf, Condition (e.g. Chair, Diamond Estate, eestr001)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
                />
              </div>

              {/* Location Filter Dropdown */}
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-zinc-400" />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  <option value="all">📍 All 10 Locations</option>
                  {PHYSICAL_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
                ))}
              </select>

              {(search || locationFilter !== 'all' || categoryFilter !== 'all' || lowStockOnly) && (
                <button
                  onClick={() => {
                    setSearch('');
                    setLocationFilter('all');
                    setCategoryFilter('all');
                    setLowStockOnly(false);
                  }}
                  className="px-2.5 py-1 text-xs text-zinc-400 hover:text-rose-500 transition font-bold"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <button
              onClick={() => setAddProductModalOpen(true)}
              className="px-3.5 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Plus size={13} /> Add Item
            </button>
          </div>

          {/* Unified Physical Inventory Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Item</th>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Quantity</th>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Location of Item</th>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Condition</th>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Shelf Number</th>
                    <th className="py-3 px-4 font-bold text-zinc-800 dark:text-zinc-200">Category</th>
                    <th className="py-3 px-4 font-bold text-right text-zinc-800 dark:text-zinc-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-zinc-400 text-xs">
                        No inventory records match the search/location filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const loc = p.location_of_item || p.warehouse_name || 'Warehouse Shelves';
                      const shelf = p.shelf_number || p.shelve_location || '—';
                      const cond = p.condition || '—';
                      const isDamaged = cond.toLowerCase().includes('damage') || cond.toLowerCase().includes('not good') || cond.toLowerCase().includes('notgood');

                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                          {/* 1. Item Name & SKU */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">{p.name}</div>
                            {p.sku && <div className="font-mono text-[10px] text-zinc-400 mt-0.5">{p.sku}</div>}
                          </td>

                          {/* 2. Quantity (Preserving exact original text like 1 PAIR, 4 pumps, 28 packs) */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-md font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 font-mono">
                              {p.quantity_display || p.stock_quantity || '1'}
                            </span>
                          </td>

                          {/* 3. Location of Item */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <MapPin size={11} className="text-blue-500" />
                              {loc}
                            </span>
                          </td>

                          {/* 4. Condition */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              isDamaged
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold'
                                : cond.toLowerCase().includes('good') || cond.toLowerCase().includes('new')
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-zinc-500 dark:text-zinc-400'
                            }`}>
                              {cond}
                            </span>
                          </td>

                          {/* 5. Shelf Number */}
                          <td className="py-3 px-4 font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {shelf !== '—' ? (
                              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[11px]">
                                {shelf}
                              </span>
                            ) : (
                              <span className="text-zinc-400 font-normal text-xs">—</span>
                            )}
                          </td>

                          {/* 6. Category */}
                          <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 text-[11px]">
                            {p.category || 'General'}
                          </td>

                          {/* 7. Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingProduct(p);
                                  setEditLocationForm({
                                    location_of_item: loc,
                                    shelf_number: shelf === '—' ? '' : shelf,
                                    condition: cond === '—' ? 'good' : cond,
                                    quantity_display: p.quantity_display || String(p.stock_quantity || 1)
                                  });
                                  setShelfModalOpen(true);
                                }}
                                title="Edit Location, Shelf & Condition"
                                className="p-1 rounded-lg text-zinc-400 hover:text-orange-600 hover:bg-orange-500/10 transition"
                              >
                                <Edit3 size={14} />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedProduct(p);
                                  setMovementModalOpen(true);
                                }}
                                title="Restock or Move Item"
                                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-orange-500/10 hover:text-orange-600 text-zinc-600 dark:text-zinc-300 rounded-lg font-bold text-[10px] transition"
                              >
                                Movement
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 10 Physical Storage Sites */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PHYSICAL_LOCATIONS.map((locName, idx) => {
            const itemsInLoc = products.filter(p => (p.location_of_item || p.warehouse_name || '').toLowerCase() === locName.toLowerCase());
            return (
              <div key={idx} className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600"><MapPin size={18} /></div>
                  <span className="text-xs font-mono font-bold text-zinc-400">LOC-0{idx + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{locName}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {locName.includes('Ogba') ? 'Ogba Facility, Lagos' : (locName.includes('Maryland') ? '15 Atiba Osborne, Mende, Maryland, Lagos' : (locName.includes('Diamond') ? 'Diamond Estate, Isheri Igando, Lagos' : 'Central Warehouse Facility, Lagos'))}
                  </p>
                </div>
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-semibold">{itemsInLoc.length} Recorded Items</span>
                  <button
                    onClick={() => {
                      setLocationFilter(locName);
                      setActiveTab('stock');
                    }}
                    className="text-orange-500 font-bold hover:underline flex items-center gap-1 text-[11px]"
                  >
                    View Items <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Movements */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Reference</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Product / Item</th>
                  <th className="py-3 px-4 font-bold">Quantity</th>
                  <th className="py-3 px-4 font-bold">Previous &rarr; New</th>
                  <th className="py-3 px-4 font-bold">Notes</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-600 dark:text-zinc-400">{m.reference_number}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.movement_type === 'RESTOCK'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : m.movement_type === 'DISPATCH'
                          ? 'bg-blue-500/10 text-blue-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">{m.product?.name || `Item #${m.product_id}`}</td>
                    <td className="py-3.5 px-4 font-bold text-zinc-800 dark:text-zinc-200">
                      {m.movement_type === 'RESTOCK' ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500">{m.previous_quantity} &rarr; <span className="font-bold text-zinc-800 dark:text-zinc-200">{m.new_quantity}</span></td>
                    <td className="py-3.5 px-4 text-zinc-400">{m.notes || '—'}</td>
                    <td className="py-3.5 px-4 text-zinc-400">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Collected & Dispatched Items */}
      {activeTab === 'collected' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <ClipboardList size={18} />
              <span>Log of items picked up or signed out for events, campaigns, and operations.</span>
            </div>
            <button
              type="button"
              onClick={() => setCollectionModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus size={13} /> + Record Sign-Out
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Waybill / Ref</th>
                    <th className="py-3 px-4 font-bold">Product Item</th>
                    <th className="py-3 px-4 font-bold">Qty Released</th>
                    <th className="py-3 px-4 font-bold">Collection Details & Collector</th>
                    <th className="py-3 px-4 font-bold">Timestamp</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {collectedMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-zinc-400 text-xs italic">
                        No signed out items logged yet. Click "+ Record Item Sign-Out" to record items when someone signs them out.
                      </td>
                    </tr>
                  ) : (
                    collectedMovements.map((m) => {
                      const prod = products.find(p => p.id === m.product_id);
                      return (
                        <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">{m.reference_number}</td>
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                            {prod?.name || m.product?.name || `Item #${m.product_id}`}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">
                              {m.quantity} {prod?.unit || 'units'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                            {m.notes || 'Direct Store Pick-up'}
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                            {new Date(m.created_at).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase flex items-center gap-1 w-max">
                              <CheckCircle2 size={11} /> Dispatched & Signed Out
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW ITEM / PRODUCT */}
      {addProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-transparent">
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-base flex items-center gap-2">
                  <Package size={18} className="text-orange-500" />
                  <span>Add Item to Physical Inventory</span>
                </h3>
                <p className="text-xs text-zinc-400">Add a new item to one of the 10 consolidated storage sites</p>
              </div>
              <button onClick={() => setAddProductModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Item Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Iron Gate, Red gazebo cover cloth, Golden rods"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Quantity (e.g. 1 PAIR, 4 pumps, 28 packs, 10)</label>
                  <input
                    type="text"
                    required
                    value={productForm.quantity_display}
                    onChange={(e) => setProductForm({ ...productForm, quantity_display: e.target.value, stock_quantity: parseInt(e.target.value) || 1 })}
                    placeholder="e.g. 1 PAIR, 28 packs, 4"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Category</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="e.g. Activation Props, Hardware, Catering"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Location of Item *</label>
                  <select
                    value={productForm.location_of_item}
                    onChange={(e) => setProductForm({ ...productForm, location_of_item: e.target.value, warehouse_name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  >
                    {PHYSICAL_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Shelf Number (e.g. eestr001, —)</label>
                  <input
                    type="text"
                    value={productForm.shelf_number}
                    onChange={(e) => setProductForm({ ...productForm, shelf_number: e.target.value })}
                    placeholder="e.g. eestr001 or —"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Condition</label>
                  <input
                    type="text"
                    value={productForm.condition}
                    onChange={(e) => setProductForm({ ...productForm, condition: e.target.value })}
                    placeholder="good, not good, new, Not specified, —"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">SKU (Optional)</label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="Auto or custom SKU"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setAddProductModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingProduct ? 'Saving...' : 'Add Item to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT LOCATION, SHELF & CONDITION */}
      {shelfModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                  <Edit3 size={16} className="text-orange-500" />
                  <span>Edit Location & Details</span>
                </h3>
                <p className="text-xs text-zinc-400 truncate max-w-xs">{editingProduct.name}</p>
              </div>
              <button onClick={() => setShelfModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveShelfLocation} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Location of Item *</label>
                <select
                  value={editLocationForm.location_of_item}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, location_of_item: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  {PHYSICAL_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Shelf Number</label>
                <input
                  type="text"
                  value={editLocationForm.shelf_number}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, shelf_number: e.target.value })}
                  placeholder="e.g. eestr001 or —"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Condition</label>
                <input
                  type="text"
                  value={editLocationForm.condition}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, condition: e.target.value })}
                  placeholder="good, not good, new, Not specified"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Quantity Display</label>
                <input
                  type="text"
                  value={editLocationForm.quantity_display}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, quantity_display: e.target.value })}
                  placeholder="e.g. 1 PAIR, 4 pumps, 28 packs"
                  className="w-full px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShelfModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingShelf}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingShelf ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD ITEM SIGN-OUT */}
      {collectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-base flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-500" />
                  <span>Record Item Sign-Out</span>
                </h3>
                <p className="text-xs text-zinc-400">Log equipment/items signed out for field activations or operations</p>
              </div>
              <button onClick={() => setCollectionModalOpen(false)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordCollection} className="p-6 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Select Item *</label>
                <select
                  required
                  value={collectionForm.product_id}
                  onChange={(e) => setCollectionForm({ ...collectionForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} &bull; [{p.location_of_item || 'Warehouse'}] ({p.quantity_display || p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Quantity Taken *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={collectionForm.quantity}
                    onChange={(e) => setCollectionForm({ ...collectionForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Facility Location</label>
                  <select
                    value={collectionForm.warehouse_id}
                    onChange={(e) => setCollectionForm({ ...collectionForm, warehouse_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Collector's Full Name *</label>
                  <input
                    type="text"
                    required
                    value={collectionForm.collector_name}
                    onChange={(e) => setCollectionForm({ ...collectionForm, collector_name: e.target.value })}
                    placeholder="e.g. Gloria Adebayo (Ops)"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Collector's Phone / ID</label>
                  <input
                    type="text"
                    value={collectionForm.collector_phone}
                    onChange={(e) => setCollectionForm({ ...collectionForm, collector_phone: e.target.value })}
                    placeholder="+2348012345678"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Department / Event</label>
                  <input
                    type="text"
                    value={collectionForm.collector_department}
                    onChange={(e) => setCollectionForm({ ...collectionForm, collector_department: e.target.value })}
                    placeholder="e.g. Carex Activation, Trade Fair"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300">Waybill / Requisition #</label>
                  <input
                    type="text"
                    value={collectionForm.waybill_number}
                    onChange={(e) => setCollectionForm({ ...collectionForm, waybill_number: e.target.value })}
                    placeholder="e.g. WAYBILL-2026-092"
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-700 dark:text-zinc-300">Purpose & Notes</label>
                <textarea
                  rows={2}
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                  placeholder="e.g. Signed out for Lagos activation weekend."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCollectionModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollection}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingCollection ? 'Signing out...' : 'Sign Out & Release Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RESTOCK / STOCK MOVEMENT */}
      {movementModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm">Stock Movement & Restock</h3>
                <p className="text-xs text-zinc-400">{selectedProduct.name}</p>
              </div>
              <button onClick={() => setMovementModalOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordMovement} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Movement Type</label>
                <select
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                >
                  <option value="RESTOCK">RESTOCK (+ Add Stock)</option>
                  <option value="DISPATCH">DISPATCH (- Outlet Delivery / Sign-out)</option>
                  <option value="TRANSFER">TRANSFER (Facility Rebalance)</option>
                  <option value="DAMAGE">DAMAGE (- Write Off)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Storage Site</label>
                <select
                  value={movementForm.warehouse_id}
                  onChange={(e) => setMovementForm({ ...movementForm, warehouse_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Reference PO / Receipt No.</label>
                <input
                  type="text"
                  value={movementForm.reference_number}
                  onChange={(e) => setMovementForm({ ...movementForm, reference_number: e.target.value })}
                  placeholder="e.g. PO-2026-AUG-88"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMovement}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-xs transition"
                >
                  {submittingMovement ? 'Saving...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
