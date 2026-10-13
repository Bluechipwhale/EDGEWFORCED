import React, { useState, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Camera, PenTool, Store, ShieldCheck, Clock, Percent, Loader2 } from 'lucide-react';
import { apiRequest } from '../../utils/api';

export default function StoreVisitModal({
  isOpen,
  onClose,
  visit = null,
  store = null,
  agentCoords = null,
  onSuccess
}) {
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'activity'
  const [shelfShare, setShelfShare] = useState(50);
  const [outOfStock, setOutOfStock] = useState('');
  const [competitorNotes, setCompetitorNotes] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [activityType, setActivityType] = useState('store_inspection');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDesc, setActivityDesc] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Digital Signature Canvas Handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'manager_signature.png', { type: 'image/png' });
          setSignature(file);
        }
      });
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  // Complete Store Visit
  const handleCompleteVisit = async (e) => {
    e.preventDefault();
    if (!visit?.id) {
      setErrorMsg('No active store visit selected.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const data = new FormData();
      data.append('visit_id', visit.id);
      data.append('shelf_share_percent', shelfShare);
      data.append('out_of_stock_skus', outOfStock);
      data.append('competitor_notes', competitorNotes);
      data.append('notes', visitNotes);

      if (photo) {
        data.append('photo', photo);
        data.append('photo_evidence', photo);
      }
      if (signature) {
        data.append('signature', signature);
      }

      const res = await apiRequest('/field/visits/complete', 'POST', data);
      setSuccessMsg('Store visit & audit verification completed with timestamp proof!');
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete visit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  // Log standalone field activity
  const handleLogActivity = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const data = new FormData();
      data.append('store_id', store?.id || visit?.store_id || 1);
      data.append('visit_id', visit?.id || '');
      data.append('activity_type', activityType);
      data.append('title', activityTitle || 'Field Inspection');
      data.append('description', activityDesc);
      data.append('latitude', agentCoords?.latitude || 6.4281);
      data.append('longitude', agentCoords?.longitude || 3.4219);

      if (photo) data.append('photo', photo);

      const res = await apiRequest('/field/activities/field', 'POST', data);
      setSuccessMsg('Field activity logged successfully with GPS coordinates.');
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to log field activity.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStore = store || visit?.store || visit?.customer;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="surface-card rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {currentStore?.name || 'Store Visit Audit'}
              </h3>
              <p className="text-xs text-zinc-500">
                {currentStore?.address || 'Lagos Territory'} &bull; 150m Geofence Active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Complete Store Audit & Sign-off
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'activity'
                ? 'bg-white dark:bg-zinc-900 text-primary shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Log Activity / Inspection
          </button>
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

        {activeTab === 'audit' ? (
          /* Audit Completion Form */
          <form onSubmit={handleCompleteVisit} className="mt-4 space-y-4">
            {/* Shelf Share Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-primary" /> Observed Shelf Share (%)
                </span>
                <span className="text-primary font-bold text-sm">{shelfShare}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={shelfShare}
                onChange={(e) => setShelfShare(Number(e.target.value))}
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                <span>0% (Low)</span>
                <span>50% (Standard)</span>
                <span>100% (Dominant)</span>
              </div>
            </div>

            {/* Out of stock SKUs */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Out-of-Stock SKUs / Shortages
              </label>
              <input
                type="text"
                placeholder="e.g. Golden Penny 1L Oil (None in stock), Peak 400g (3 left)"
                value={outOfStock}
                onChange={(e) => setOutOfStock(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Competitor Intel */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Competitor Activity & Pricing Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Devon Kings promo discount: ₦48,000/carton with free merchandise"
                value={competitorNotes}
                onChange={(e) => setCompetitorNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Photo Proof (Mandatory) */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" /> Mandatory Photo Evidence Proof *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
              <p className="text-[10px] text-zinc-500 mt-1">
                Snap or upload shelf merchandising or outlet stock receipt as proof of physical visit.
              </p>
            </div>

            {/* Digital Manager Sign-off Canvas */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-primary" /> Store Manager Sign-Off Signature
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-[10px] text-rose-500 hover:underline font-semibold"
                >
                  Clear Canvas
                </button>
              </div>
              <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-28 cursor-crosshair touch-none"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Draw digital signature on canvas for customer / store verification.
              </p>
            </div>

            {/* Actions */}
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
                disabled={submitting}
                className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Verification...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Complete & Verify Visit
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Log Field Activity Form */
          <form onSubmit={handleLogActivity} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Activity Type
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="store_inspection">Store Inspection</option>
                <option value="product_inspection">Product Inspection</option>
                <option value="merchandising">Merchandising & Planogram</option>
                <option value="stock_verification">Stock Level Count</option>
                <option value="display_verification">Display Verification</option>
                <option value="market_survey">Market Price Survey</option>
                <option value="competitor_monitoring">Competitor Monitoring</option>
                <option value="customer_engagement">Customer Engagement</option>
                <option value="photo_documentation">Photo Documentation</option>
                <option value="issue_reporting">Issue Reporting</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Activity Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. End-Cap Gondola Merchandising Audit"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Detailed Field Description
              </label>
              <textarea
                rows={3}
                required
                placeholder="Observed product facing, cleaned shelf space, arranged 40 cartons..."
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" /> Activity Documentation Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="w-full text-xs text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>

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
                disabled={submitting}
                className="px-5 py-2 text-sm font-bold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging Activity...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Save Activity
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
