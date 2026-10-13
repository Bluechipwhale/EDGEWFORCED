import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, Store, Phone, User, CheckCircle2, AlertCircle, Loader2, Navigation, Globe, ExternalLink } from 'lucide-react';
import { apiRequest } from '../../utils/api';
import StateCitySelect from '../common/StateCitySelect';
import { geocodeNigerianAddress } from '../../lib/geo';

export default function StoreRequestModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    store_name: '',
    address: '',
    store_type: 'Supermarket',
    contact_person: '',
    phone: '',
    state: 'Lagos',
    city: 'Lekki Phase 1',
    territory: 'Lagos - Lekki Phase 1',
    notes: ''
  });

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null
  });

  const [storePhoto, setStorePhoto] = useState(null);
  const [storefrontPhoto, setStorefrontPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch device GPS coordinates automatically on mount
  useEffect(() => {
    if (isOpen) {
      captureLocation();
    }
  }, [isOpen]);

  const captureLocation = () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation({
        latitude: 6.4281,
        longitude: 3.4219,
        accuracy: 5.0,
        loading: false,
        error: 'Geolocation not supported by browser. Defaulted to Victoria Island GPS.'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          loading: false,
          error: null
        });
      },
      (err) => {
        setLocation({
          latitude: 6.4281,
          longitude: 3.4219,
          accuracy: 5.0,
          loading: false,
          error: `GPS fallback active: ${err.message}`
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAutoFetchCoordinates = async () => {
    setLocation(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await geocodeNigerianAddress(formData.address, formData.city, formData.state);
      if (res && res.latitude && res.longitude) {
        setLocation({
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: 10,
          loading: false,
          error: null
        });
        setSuccessMsg(`✓ Resolved coordinates from Google Map / Address: ${res.latitude}, ${res.longitude}`);
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setLocation(prev => ({ ...prev, loading: false, error: err.message }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.store_name.trim()) {
      setErrorMsg('Store name is required.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Store physical address is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = new FormData();
      data.append('store_name', formData.store_name);
      data.append('address', formData.address);
      data.append('store_type', formData.store_type);
      data.append('contact_person', formData.contact_person);
      data.append('phone', formData.phone);
      data.append('territory', formData.territory);
      data.append('notes', formData.notes);
      data.append('latitude', location.latitude || 6.4281);
      data.append('longitude', location.longitude || 3.4219);
      data.append('accuracy', location.accuracy || 5);

      if (storePhoto) data.append('store_photo', storePhoto);
      if (storefrontPhoto) data.append('storefront_photo', storefrontPhoto);

      const res = await apiRequest('/field/store-requests', 'POST', data);
      setSuccessMsg('Store request submitted successfully! Your supervisor will review and activate the geofenced outlet.');
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit store registration request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="surface-card rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Register New Store</h3>
              <p className="text-xs text-zinc-500">Submit on-site retail outlet for geofenced supervisor approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Coordinate Status Bar & Auto-Fetch */}
        <div className="mt-4 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {location.loading ? 'Acquiring GPS coordinates...' : `GPS: ${Number(location.latitude || 6.4281).toFixed(5)}, ${Number(location.longitude || 3.4219).toFixed(5)}`}
                </span>
                <div className="text-[10px] text-zinc-500">
                  Accuracy: ±{Math.round(location.accuracy || 5)}m &bull; Geofenced Site Verification
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={captureLocation}
                disabled={location.loading}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <Navigation className={`w-3.5 h-3.5 ${location.loading ? 'animate-spin' : ''}`} />
                <span>Capture Live GPS</span>
              </button>
            </div>
          </div>

          {/* Manual Coordinate Editing Row */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={location.latitude ?? ''}
                onChange={(e) => setLocation(prev => ({ ...prev, latitude: parseFloat(e.target.value) || e.target.value }))}
                className="w-full px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-0.5">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={location.longitude ?? ''}
                onChange={(e) => setLocation(prev => ({ ...prev, longitude: parseFloat(e.target.value) || e.target.value }))}
                className="w-full px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Store Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Store / Outlet Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prince Ebeano Supermarket - Phase 2"
              value={formData.store_name}
              onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Store Type
              </label>
              <select
                value={formData.store_type}
                onChange={(e) => setFormData({ ...formData, store_type: e.target.value })}
                className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="Supermarket">Supermarket</option>
                <option value="Wholesaler">Wholesaler</option>
                <option value="Retail Store">Retail Store</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Distributor">Distributor</option>
                <option value="Kiosk">Kiosk</option>
                <option value="Open Market">Open Market</option>
              </select>
            </div>
          </div>

          <StateCitySelect
            selectedState={formData.state}
            selectedCity={formData.city}
            onStateChange={(state) => setFormData(prev => ({ ...prev, state, territory: `${state} - ${prev.city || ''}` }))}
            onCityChange={(city) => setFormData(prev => ({ ...prev, city, territory: `${prev.state || ''} - ${city}` }))}
            stateLabel="State (36 States & FCT) *"
            cityLabel="Town / Commercial District *"
          />

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Physical Street Address *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 14B Admiralty Way, Lekki Phase 1, Lagos"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-zinc-400" /> Contact Person
              </label>
              <input
                type="text"
                placeholder="Manager / Owner"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-zinc-400" /> Phone Number
              </label>
              <input
                type="tel"
                placeholder="+234..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Photo Uploads */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-zinc-400" /> Storefront Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setStorePhoto(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-zinc-400" /> Shelf / Aisles Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setStorefrontPhoto(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Field Notes / Business Remarks
            </label>
            <textarea
              rows={2}
              placeholder="High foot traffic near central junction, 6 checkout lanes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || location.loading}
              className="px-5 py-2 text-sm font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  Submit For Approval
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
