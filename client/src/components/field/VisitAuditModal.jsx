import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import LiveCameraModal from '../common/LiveCameraModal';
import { Camera, PenTool, CheckCircle2, AlertCircle, Clock, Trash2, Eye } from 'lucide-react';
import { api } from '../../lib/api';

export default function VisitAuditModal({ visit, isOpen, onClose, onCompleted }) {
  const [share, setShare] = useState(visit?.shelf_share_percent || 50);
  const [oos, setOos] = useState(visit?.out_of_stock_skus || '');
  const [compNotes, setCompNotes] = useState(visit?.competitor_notes || '');
  const [notes, setNotes] = useState(visit?.notes || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(visit?.photo_evidence_url || null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [signatureBlob, setSignatureBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Visit elapsed timer
  useEffect(() => {
    if (!visit?.check_in_time) return;
    const startTime = new Date(visit.check_in_time).getTime();

    const updateTimer = () => {
      const mins = Math.floor((Date.now() - startTime) / 60000);
      setElapsedMinutes(Math.max(1, mins));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [visit]);

  // Setup HTML5 Canvas for Signature
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#F57C00';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      canvas.toBlob((blob) => {
        setSignatureBlob(blob);
      }, 'image/png');
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDraw);

    return () => {
      canvas.removeEventListener('mousedown', startDraw);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDraw);
      canvas.removeEventListener('touchstart', startDraw);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDraw);
    };
  }, [isOpen]);

  const handleClearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureBlob(null);
  };

  const handleLivePhotoCaptured = (file, previewUrl) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setError('');
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!photoFile && !photoPreview && !visit?.photo_evidence_url) {
      setError('Live store audit photo evidence is mandatory before visit completion.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('visit_id', visit.id);
      fd.append('shelf_share_percent', share);
      fd.append('out_of_stock_skus', oos);
      fd.append('competitor_notes', compNotes);
      fd.append('notes', notes);
      if (photoFile) fd.append('photo', photoFile);
      if (signatureBlob) fd.append('signature', signatureBlob, 'customer-signature.png');

      await api.post('/field/visits/complete', fd);
      onCompleted?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        title={`Store Audit: ${visit?.customer?.name || 'Customer Visit'}`}
        subtitle={`On-site duration: ~${elapsedMinutes} mins • Verified within 150m geofence`}
        isOpen={isOpen}
        onClose={onClose}
      >
        <form onSubmit={handleComplete} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Audit Status Bar */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Geofence Check-in Verified ({visit?.check_in_distance_meters ? `${Number(visit.check_in_distance_meters).toFixed(0)}m` : 'On-Site'})</span>
            </div>
            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-semibold">
              <Clock size={14} />
              <span>{elapsedMinutes}m Active</span>
            </div>
          </div>

          {/* Shelf Share Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
              <span>Our Shelf Space Share:</span>
              <span className="text-orange-600 dark:text-orange-400 font-black">{share}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full accent-orange-500"
              value={share}
              onChange={(e) => setShare(Number(e.target.value))}
            />
          </div>

          {/* Out of stock checklist */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Out-of-Stock SKUs (Comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. SKU-1001, SKU-1005"
              className="form-input"
              value={oos}
              onChange={(e) => setOos(e.target.value)}
            />
          </div>

          {/* Competitor notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Competitor Presence & Promotions
            </label>
            <textarea
              rows="2"
              placeholder="Observed competitor pricing, endcap banners or discounts..."
              className="form-input"
              value={compNotes}
              onChange={(e) => setCompNotes(e.target.value)}
            />
          </div>

          {/* Live Photo Evidence Capture */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Audit Shelf Photo (Mandatory Live Picture) *
            </label>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-48 group">
                <img
                  src={photoPreview}
                  alt="Shelf Evidence"
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCameraModalOpen(true)}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    <Camera size={14} />
                    <span>Retake Live Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="btn-danger text-xs py-1.5 px-3"
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-400" />
                  <span>Live Photo Attached</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="w-full p-4 border-2 border-dashed border-orange-500/40 hover:border-orange-500 bg-orange-500/5 dark:bg-orange-500/10 rounded-xl flex flex-col items-center justify-center gap-2 transition group"
              >
                <div className="p-3 rounded-full bg-orange-500 text-white group-hover:scale-110 transition-transform">
                  <Camera size={20} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Launch Live Camera Viewfinder
                  </div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Snap live photo of store shelf & product facing
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Canvas Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <PenTool size={13} className="text-orange-500" />
                <span>Customer Representative Signature</span>
              </label>
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold"
              >
                Clear Signature
              </button>
            </div>
            <canvas
              ref={canvasRef}
              width={460}
              height={130}
              className="signature-canvas"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Completing Audit…' : 'Complete Visit & Submit Evidence'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </form>
      </Modal>

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleLivePhotoCaptured}
        title="Live Store Shelf Camera"
        subtitle="Aim camera at store shelf display and snap evidence"
      />
    </>
  );
}
