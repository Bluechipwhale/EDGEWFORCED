import React, { useState } from 'react';
import Modal from '../common/Modal';
import StateCitySelect from '../common/StateCitySelect';
import { MapPin, Navigation, AlertCircle, CheckCircle2, Globe, Locate, ExternalLink, Loader2 } from 'lucide-react';
import { getCurrentGPSLocation, geocodeNigerianAddress } from '../../lib/geo';
import { api } from '../../lib/api';

export default function MerchantModal({ isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: '',
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    state: 'Lagos',
    city: 'Ikeja',
    territory: 'Lagos - Ikeja',
    credit_limit: 500000,
    latitude: 6.5244,
    longitude: 3.3792,
    geofence_radius: 150
  });

  const [loadingGps, setLoadingGps] = useState(false);
  const [isFetchingCoords, setIsFetchingCoords] = useState(false);
  const [geoFetchSuccessMsg, setGeoFetchSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAutoFetchCoordinates = async () => {
    setIsFetchingCoords(true);
    setError('');
    setGeoFetchSuccessMsg('');
    try {
      const res = await geocodeNigerianAddress(form.address, form.city, form.state);
      if (res && res.latitude && res.longitude) {
        setForm(prev => ({
          ...prev,
          latitude: res.latitude,
          longitude: res.longitude
        }));
        setGeoFetchSuccessMsg(`✓ Resolved: ${res.latitude}, ${res.longitude} (${res.source})`);
      }
    } catch (err) {
      setError(`Geocoding error: ${err.message}. Please enter coordinates manually.`);
    } finally {
      setIsFetchingCoords(false);
    }
  };

  const handleCaptureGPS = async () => {
    setLoadingGps(true);
    setError('');
    setGeoFetchSuccessMsg('');
    try {
      const loc = await getCurrentGPSLocation();
      setForm(prev => ({
        ...prev,
        latitude: parseFloat(loc.latitude.toFixed(6)),
        longitude: parseFloat(loc.longitude.toFixed(6))
      }));
      setGeoFetchSuccessMsg(`✓ Device GPS captured: ${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)} (±${Math.round(loc.accuracy || 0)}m)`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address) {
      setError('Please provide merchant name and physical address.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.post('/sales/customers', {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : 6.5244,
        longitude: form.longitude ? Number(form.longitude) : 3.3792
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Register New Merchant Outlet"
      subtitle="Onboard a retail outlet with GPS geofencing & credit limit"
      isOpen={isOpen}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Outlet / Business Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Goodies Supermarket"
              className="form-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Outlet Code (Optional)
            </label>
            <input
              type="text"
              placeholder="Auto-generated if blank"
              className="form-input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Contact Person
            </label>
            <input
              type="text"
              placeholder="e.g. Alhaji Rasheed"
              className="form-input"
              value={form.contact_person}
              onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="e.g. +2348031234567"
              className="form-input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Physical Street Address *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 14B Idowu Martins St, Victoria Island"
              className="form-input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <StateCitySelect
              selectedState={form.state}
              selectedCity={form.city}
              onStateChange={(state) => setForm(prev => ({ ...prev, state, territory: `${state} - ${prev.city || ''}` }))}
              onCityChange={(city) => setForm(prev => ({ ...prev, city, territory: `${prev.state || ''} - ${city}` }))}
              stateLabel="Merchant State (36 States & FCT) *"
              cityLabel="Merchant Town / Commercial Hub *"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Approved Credit Limit (₦)
            </label>
            <input
              type="number"
              className="form-input"
              value={form.credit_limit}
              onChange={(e) => setForm({ ...form, credit_limit: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* GPS Coordinates & Device GPS Capture */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 text-xs">
                <MapPin size={14} className="text-orange-500" />
                <span>GPS Geofence Coordinates *</span>
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Type coordinates manually or capture directly from device GPS.
              </p>
            </div>

            {/* Device GPS Action */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={loadingGps}
                onClick={handleCaptureGPS}
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-xs"
                title="Use current device GPS location"
              >
                {loadingGps ? <Loader2 size={13} className="animate-spin" /> : <Locate size={13} />}
                <span>Use Device GPS</span>
              </button>
            </div>
          </div>

          {/* Status / Success Toast */}
          {geoFetchSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center justify-between">
              <span>{geoFetchSuccessMsg}</span>
              {form.latitude && form.longitude && (
                <a
                  href={`https://maps.google.com/?q=${form.latitude},${form.longitude}`}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                Latitude (Decimal) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={form.latitude ?? ''}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || e.target.value })}
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
                value={form.longitude ?? ''}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || e.target.value })}
                placeholder="e.g. 3.421945"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="font-bold text-[11px] text-zinc-700 dark:text-zinc-300 block mb-1">
                Geofence Radius (m)
              </label>
              <input
                type="number"
                value={form.geofence_radius ?? 150}
                onChange={(e) => setForm({ ...form, geofence_radius: parseInt(e.target.value, 10) || 150 })}
                placeholder="150"
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-3 flex gap-3">
          <button type="submit" disabled={submitting} className="btn-primary flex-1">
            {submitting ? 'Saving Merchant…' : 'Save & Register Merchant'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
