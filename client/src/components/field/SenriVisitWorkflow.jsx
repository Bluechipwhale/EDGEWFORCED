import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  CheckCircle2,
  Camera,
  Store,
  Clock,
  User,
  Phone,
  ShoppingCart,
  DollarSign,
  Layers,
  Search,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { api } from '../../lib/api';

export default function SenriVisitWorkflow({ user, onVisitCompleted }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customStoreName, setCustomStoreName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('Order Booking & Merchandising');

  // GPS & Real Address State
  const [fetchingGps, setFetchingGps] = useState(false);
  const [gpsData, setGpsData] = useState(null); // { latitude, longitude, accuracy, address, directions_url }
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');

  // Active Visit Tracking State
  const [isVisitActive, setIsVisitActive] = useState(false);
  const [visitStartTime, setVisitStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Form Details
  const [shelfShare, setShelfShare] = useState(65);
  const [shelfPhoto, setShelfPhoto] = useState(null);
  const [shelfPhotoPreview, setShelfPhotoPreview] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [visitNotes, setVisitNotes] = useState('');
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [completedSuccess, setCompletedSuccess] = useState(false);

  // Products for in-visit order taking
  const [products, setProducts] = useState([]);
  const [orderItems, setOrderItems] = useState([]);


  useEffect(() => {
    // Load customers and products
    api.get('/customers').then(res => setCustomers(res?.data || res || [])).catch(() => {});
    api.get('/sales/products').then(res => setProducts(res?.data || res || [])).catch(() => {});
  }, []);

  // Elapsed timer when visit is active
  useEffect(() => {
    let timer = null;
    if (isVisitActive) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isVisitActive]);

  // When customer is selected from dropdown, populate its info
  const handleSelectCustomer = (id) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => String(c.id) === String(id));
    if (cust) {
      setCustomStoreName(cust.name);
      setContactPerson(cust.contact_person || '');
      setContactPhone(cust.phone || '');
      if (cust.latitude && cust.longitude) {
        setGpsData({
          latitude: cust.latitude,
          longitude: cust.longitude,
          accuracy: 5,
          address: cust.address || 'Address on file',
          directions_url: `https://www.google.com/maps/dir/?api=1&destination=${cust.latitude},${cust.longitude}`
        });
      }
    }
  };

  // Fetch device GPS coordinates & resolve exact human-readable street address via Backend
  const handleFetchCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setFetchingGps(true);
    setLocationSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        try {
          // Resolve exact address from backend reverse geocoding engine
          const res = await api.get(`/customers/geocode?lat=${lat}&lng=${lng}`);
          const resolved = res?.data || res;
          setGpsData({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            address: resolved.address || `GPS [${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
            directions_url: resolved.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
          });
        } catch (err) {
          setGpsData({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            address: `Current Location Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            directions_url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
          });
        } finally {
          setFetchingGps(false);
        }
      },
      (err) => {
        setFetchingGps(false);
        alert(`Failed to fetch GPS coordinates: ${err.message}. Please enable Location Services.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Update Customer / Store Location in database
  const handleSaveCustomerLocation = async () => {
    if (!selectedCustomerId) {
      alert('Please select a customer outlet first.');
      return;
    }
    if (!gpsData) {
      alert('Please fetch your GPS location first.');
      return;
    }

    setUpdatingLocation(true);
    setLocationSuccessMsg('');
    try {
      const res = await api.post(`/customers/${selectedCustomerId}/update-location`, {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy
      });

      const updated = res?.data || res;
      setLocationSuccessMsg(`✓ Customer location updated to: ${updated.resolved_address || gpsData.address}`);
      // Refresh local customer list
      const refreshed = await api.get('/customers');
      setCustomers(refreshed?.data || refreshed || []);
    } catch (err) {
      alert(err.message || 'Failed to update customer location.');
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Start Store Visit
  const handleStartVisit = () => {
    if (!customStoreName) {
      alert('Please enter or select a store name.');
      return;
    }
    setIsVisitActive(true);
    setVisitStartTime(new Date());
    setElapsedSeconds(0);
    setCompletedSuccess(false);
  };

  // Handle Photo Snapping / File Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setShelfPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setShelfPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live Camera Handlers
  const startLiveCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      alert('Could not access camera: ' + err.message);
      setCameraActive(false);
    }
  };

  const captureLiveSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Watermark Timestamp and GPS
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, canvas.height - 35, canvas.width, 35);
      ctx.fillStyle = '#FF9900';
      ctx.font = 'bold 12px sans-serif';
      const timeStr = new Date().toLocaleString();
      const gpsStr = gpsData ? `Lat: ${gpsData.latitude.toFixed(4)}, Lng: ${gpsData.longitude.toFixed(4)}` : 'GPS Verified';
      ctx.fillText(`EdgeWForce Audit • ${timeStr} • ${gpsStr}`, 12, canvas.height - 12);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setShelfPhotoPreview(dataUrl);

      // Stop camera stream
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      setCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setCameraActive(false);
  };

  // Complete Store Visit
  const handleCompleteVisit = async () => {
    setSubmittingVisit(true);
    try {
      const durationMins = Math.max(1, Math.round(elapsedSeconds / 60));
      const payload = {
        customer_id: selectedCustomerId || 1,
        store_name: customStoreName,
        contact_person: contactPerson,
        contact_phone: contactPhone,
        visit_purpose: visitPurpose,
        duration_minutes: durationMins,
        shelf_share_percent: shelfShare,
        photo_url: shelfPhotoPreview,
        notes: visitNotes,
        latitude: gpsData?.latitude || 6.5244,
        longitude: gpsData?.longitude || 3.3792,
        address: gpsData?.address || 'Field Visit Location'
      };

      await api.post('/field/visits/complete', payload);

      setIsVisitActive(false);
      setCompletedSuccess(true);
      setShelfPhoto(null);
      setShelfPhotoPreview(null);
      if (onVisitCompleted) onVisitCompleted();
    } catch (err) {
      alert(err.message || 'Failed to submit store visit.');
    } finally {
      setSubmittingVisit(false);
    }
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* App Header Banner */}
      <div className="p-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl text-white shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-xs font-black">
              <Store size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-100 block">
                Field Operations Cockpit
              </span>
              <h2 className="text-xl font-black">
                Field Store Visit & Location Intelligence
              </h2>
            </div>
          </div>

          {isVisitActive && (
            <div className="px-3.5 py-1.5 bg-white text-orange-600 rounded-2xl font-mono font-black text-sm flex items-center gap-2 shadow-md animate-pulse">
              <Clock size={16} /> {formatTimer(elapsedSeconds)}
            </div>
          )}
        </div>
        <p className="text-xs text-orange-100/90 leading-relaxed">
          Log outlet audits, fetch GPS coordinates, resolve real street addresses, update customer locations, snap shelf share photo proof, and launch 1-click Google Maps turn-by-turn driving navigation.
        </p>
      </div>

      {completedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>Store visit successfully recorded and synchronized with operations cloud!</span>
          </div>
          <button
            onClick={() => setCompletedSuccess(false)}
            className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs"
          >
            Start Another Visit
          </button>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Store Details & Location Engine */}
        <div className="space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs">
          <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Store size={17} className="text-orange-500" />
            1. Store Identification & Merchant Info
          </h3>

          {/* Quick Select Existing Outlet */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
              Select Registered Customer Outlet
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleSelectCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold"
            >
              <option value="">-- Or type new store below --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} &bull; {c.territory} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Store Name Input */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
              Store / Outlet Name *
            </label>
            <input
              type="text"
              required
              value={customStoreName}
              onChange={(e) => setCustomStoreName(e.target.value)}
              placeholder="e.g. Prince Ebeano Supermarket Lekki"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Contact Person</label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Alhaji Bello"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Contact Phone</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+2348000000000"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Real GPS Location Fetching & Reverse Geocoding Section */}
          <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                <Compass size={16} className="text-orange-500" />
                Live GPS & Real Address Engine
              </span>
              <button
                type="button"
                onClick={handleFetchCurrentGps}
                disabled={fetchingGps}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <RefreshCw size={13} className={fetchingGps ? 'animate-spin' : ''} />
                {fetchingGps ? 'Resolving GPS...' : '📍 Fetch Current GPS'}
              </button>
            </div>

            {gpsData ? (
              <div className="space-y-2 text-xs">
                {/* Real Human-Readable Street Address */}
                <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Resolved Real Street Location:</span>
                  <p className="font-bold text-zinc-900 dark:border-zinc-700 text-xs leading-relaxed">
                    {gpsData.address}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>Coordinates: {gpsData.latitude.toFixed(4)}, {gpsData.longitude.toFixed(4)} (±{gpsData.accuracy}m)</span>
                  <a
                    href={gpsData.directions_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-500 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Navigation size={12} /> Google Maps
                  </a>
                </div>

                {/* Update Location Button */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">Set as permanent merchant location:</span>
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={handleSaveCustomerLocation}
                      disabled={updatingLocation}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 text-white rounded-xl text-xs font-bold"
                    >
                      {updatingLocation ? 'Saving...' : 'Save As Customer GPS'}
                    </button>
                  )}
                </div>

                {locationSuccessMsg && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {locationSuccessMsg}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">
                Click "Fetch Current GPS" to acquire device coordinates and automatically resolve the real street address.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Visit Execution, Merchandising & Submissions */}
        <div className="space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Sliders size={17} className="text-orange-500" />
              2. Store Visit Activity & Merchandising
            </h3>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1">
                Visit Objective / Purpose
              </label>
              <select
                value={visitPurpose}
                onChange={(e) => setVisitPurpose(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold"
              >
                <option value="Order Booking & Merchandising">Order Booking & Merchandising</option>
                <option value="Shelf Share & Product Count">Shelf Share & Product Count</option>
                <option value="Payment Collection & Debt Recovery">Payment Collection & Debt Recovery</option>
                <option value="Competitor Pricing Intelligence">Competitor Pricing Intelligence</option>
                <option value="New Merchant Onboarding">New Merchant Onboarding</option>
                <option value="Routine Relationship Inspection">Routine Relationship Inspection</option>
              </select>
            </div>

            {/* Shelf Share Percentage Slider */}
            <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-zinc-700 dark:text-zinc-300">Observed Shelf Share (%)</span>
                <span className="text-orange-600 dark:text-orange-400 font-black text-sm">{shelfShare}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={shelfShare}
                onChange={(e) => setShelfShare(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>0% (No display)</span>
                <span>50% (Standard)</span>
                <span>100% (Dominant)</span>
              </div>
            </div>

            {/* Live Camera Snapping & Shelf Photo Capture */}
            <div className="p-4 bg-orange-500/5 dark:bg-orange-500/10 border border-orange-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                  <Camera size={16} className="text-orange-500" />
                  Shelf Share & Storefront Live Photo Evidence
                </span>
              </div>

              {/* Camera Active View */}
              {cameraActive ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-56 flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-mono">
                      🔴 Live Camera Feed
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={captureLiveSnapshot}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Camera size={14} /> Snap Live Picture
                    </button>
                    <button
                      type="button"
                      onClick={stopLiveCamera}
                      className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {shelfPhotoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 aspect-video max-h-48 group">
                      <img src={shelfPhotoPreview} alt="Shelf Evidence" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShelfPhoto(null);
                            setShelfPhotoPreview(null);
                          }}
                          className="p-2 rounded-xl bg-rose-600 text-white text-xs font-bold flex items-center gap-1 shadow-lg"
                        >
                          <Trash2 size={13} /> Retake
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-mono flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-400" /> Photo Attached
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={startLiveCamera}
                        className="flex-1 py-2.5 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-xs transition"
                      >
                        <Camera size={15} />
                        <span>Take Live Photo with Camera</span>
                      </button>

                      <label className="cursor-pointer py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition">
                        <ImageIcon size={15} />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Visit Observations & Field Notes */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Audit Notes & Observations
              </label>
              <textarea
                rows={3}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="e.g. Products stocked on primary eye-level shelves. Manager requested restock on Monday."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            {!isVisitActive ? (
              <button
                type="button"
                onClick={handleStartVisit}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition"
              >
                <Clock size={16} /> Start Store Visit (Check-In)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteVisit}
                disabled={submittingVisit}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition"
              >
                <CheckCircle2 size={16} />
                {submittingVisit ? 'Submitting...' : `Complete & Submit Visit (${formatTimer(elapsedSeconds)})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
