// ==============================================================================
// EDGEWFORCE - WORK LOCATION CREATION & EDIT MODAL
// Interactive Map Pin Dropper, "Use My Current Location" GPS Capture,
// Geofence Radius Slider (20m - 10,000m), Nigerian States & LGA / Town Hierarchy
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Crosshair,
  Building2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Navigation,
  Globe,
  Loader2
} from 'lucide-react';
import StateCitySelect from '../common/StateCitySelect';
import { getCurrentGPSLocation, validateCoordinates } from '../../lib/geo';
import { apiRequest } from '../../lib/api';

const LOCATION_TYPES = [
  'Office',
  'Market',
  'Store',
  'Supermarket',
  'Client Location',
  'Warehouse',
  'Branch',
  'Distributor',
  'Event Location',
  'Other'
];

const RADIUS_PRESETS = [50, 100, 150, 200, 300, 500, 1000];

export default function LocationManagerModal({
  isOpen,
  onClose,
  onLocationSaved,
  editLocation = null
}) {
  const [formData, setFormData] = useState({
    name: '',
    location_type: 'Office',
    address: '',
    state: 'Lagos',
    city: 'Ikeja',
    lga: '',
    latitude: 6.5984,
    longitude: 3.3524,
    geofence_radius: 150
  });

  const [loadingGps, setLoadingGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Initialize or populate form on open/edit
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      if (editLocation) {
        setFormData({
          id: editLocation.id,
          name: editLocation.name || '',
          location_type: editLocation.location_type || 'Office',
          address: editLocation.address || '',
          state: editLocation.state || 'Lagos',
          city: editLocation.city || '',
          lga: editLocation.lga || '',
          latitude: Number(editLocation.latitude) || 6.5984,
          longitude: Number(editLocation.longitude) || 3.3524,
          geofence_radius: Number(editLocation.geofence_radius || editLocation.geofence_radius_meters || 150)
        });
      } else {
        setFormData({
          name: '',
          location_type: 'Office',
          address: '',
          state: 'Lagos',
          city: 'Ikeja',
          lga: 'Ikeja',
          latitude: 6.5984,
          longitude: 3.3524,
          geofence_radius: 150
        });
      }
    }
  }, [isOpen, editLocation]);

  // Leaflet map setup & sync
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    const lat = Number(formData.latitude) || 6.5984;
    const lng = Number(formData.longitude) || 3.3524;
    const radius = Number(formData.geofence_radius) || 150;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 15,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="
            background: #EA580C;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: pinIcon
      }).addTo(map);

      const circle = L.circle([lat, lng], {
        radius,
        color: '#EA580C',
        fillColor: '#F97316',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(map);

      // On pin drag
      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setFormData(prev => ({
          ...prev,
          latitude: Number(pos.lat.toFixed(6)),
          longitude: Number(pos.lng.toFixed(6))
        }));
      });

      // On map click
      map.on('click', (e) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        marker.setLatLng([clickedLat, clickedLng]);
        circle.setLatLng([clickedLat, clickedLng]);
        setFormData(prev => ({
          ...prev,
          latitude: Number(clickedLat.toFixed(6)),
          longitude: Number(clickedLng.toFixed(6))
        }));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    } else {
      mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || 15);
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      if (circleRef.current) {
        circleRef.current.setLatLng([lat, lng]);
        circleRef.current.setRadius(radius);
      }
    }

    return () => {
      // Map cleanup handled on unmount
    };
  }, [isOpen, formData.latitude, formData.longitude, formData.geofence_radius]);

  // Clean map instance on close
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    }
  }, [isOpen]);

  const handleUseCurrentLocation = async () => {
    setLoadingGps(true);
    setErrorMsg('');
    try {
      const pos = await getCurrentGPSLocation();
      const lat = Number(pos.latitude.toFixed(6));
      const lng = Number(pos.longitude.toFixed(6));

      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));

      if (mapInstanceRef.current && markerRef.current && circleRef.current) {
        mapInstanceRef.current.setView([lat, lng], 16);
        markerRef.current.setLatLng([lat, lng]);
        circleRef.current.setLatLng([lat, lng]);
      }
      setSuccessMsg(`✓ GPS captured with ±${Math.round(pos.accuracy || 5)}m accuracy.`);
    } catch (err) {
      setErrorMsg(err.message || 'Could not capture current GPS location.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Work location name is required.');
      return;
    }

    const check = validateCoordinates(formData.latitude, formData.longitude);
    if (!check.valid) {
      setErrorMsg(check.message || 'Invalid GPS coordinates.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        location_type: formData.location_type,
        address: formData.address.trim() || `${formData.city || formData.state}, Nigeria`,
        state: formData.state,
        lga: formData.lga || '',
        city: formData.city || '',
        latitude: formData.latitude,
        longitude: formData.longitude,
        geofence_radius: Number(formData.geofence_radius) || 150
      };

      let result;
      if (editLocation && editLocation.id) {
        result = await apiRequest(`/locations/${editLocation.id}`, 'PUT', payload);
      } else {
        result = await apiRequest('/locations', 'POST', payload);
      }

      setSuccessMsg(`✓ Work location "${formData.name}" saved successfully!`);
      setTimeout(() => {
        onLocationSaved?.(result.data || result);
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save work location.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {editLocation ? 'Edit Work Location' : 'Add New Work Location'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure Nigerian workplace geofence radius & GPS pin coordinates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Location Name & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Location Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Lagos Victoria Island Office, Dugbe Market Depot, Kano Hub"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Location Type *
              </label>
              <select
                value={formData.location_type}
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                {LOCATION_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* State & City Picker */}
          <StateCitySelect
            selectedState={formData.state}
            selectedCity={formData.city}
            onStateChange={(st) => setFormData({ ...formData, state: st })}
            onCityChange={(ct) => setFormData({ ...formData, city: ct })}
            stateLabel="State (All 36 States + FCT) *"
            cityLabel="City / Town / LGA *"
          />

          {/* Street Address */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Full Physical Address / Landmark
            </label>
            <input
              type="text"
              placeholder="e.g. 14B Idowu Martins St, Victoria Island / Dugbe Commercial Axis"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>

          {/* Interactive Map & GPS Capture */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <MapPin size={14} className="text-orange-500" />
                <span>Geofence Pin & Coordinates (Drag pin or click map)</span>
              </label>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loadingGps}
                className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer w-fit"
              >
                {loadingGps ? <Loader2 size={13} className="animate-spin" /> : <Crosshair size={13} />}
                <span>Use My Current Location</span>
              </button>
            </div>

            {/* Map Container */}
            <div
              ref={mapContainerRef}
              className="w-full h-56 rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden shadow-inner relative z-0"
            />

            {/* Coordinates Manual Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="block text-[11px] text-zinc-500 font-medium mb-1">Latitude</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div>
                <span className="block text-[11px] text-zinc-500 font-medium mb-1">Longitude</span>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-mono text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-end">
                <div className="w-full p-2 bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-lg text-[11px] text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                  <Globe size={13} className="shrink-0" />
                  <span className="truncate">{formData.state}, Nigeria</span>
                </div>
              </div>
            </div>
          </div>

          {/* Permitted Radius (Geofence Radius) */}
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sliders size={14} className="text-orange-500" />
                <span>Permitted Attendance Radius (Geofence Boundary)</span>
              </label>
              <span className="px-2.5 py-0.5 bg-orange-500 text-white rounded-full text-xs font-black shadow-xs">
                {formData.geofence_radius} meters
              </span>
            </div>

            <input
              type="range"
              min="20"
              max="2000"
              step="10"
              value={formData.geofence_radius}
              onChange={(e) => setFormData({ ...formData, geofence_radius: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />

            {/* Radius Preset Quick Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-500 font-medium mr-1">Presets:</span>
              {RADIUS_PRESETS.map((rad) => (
                <button
                  key={rad}
                  type="button"
                  onClick={() => setFormData({ ...formData, geofence_radius: rad })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    formData.geofence_radius === rad
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-orange-500/50'
                  }`}
                >
                  {rad}m
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>{editLocation ? 'Save Changes' : 'Create Location'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
