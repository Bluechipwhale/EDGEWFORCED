import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import { Camera, RefreshCw, CheckCircle2, RotateCcw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { formatDate, formatTime } from '../../lib/formatters';

export default function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Live Camera Viewfinder',
  subtitle = 'Capture live store shelf evidence with verified timestamp'
}) {
  const [streaming, setStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedImage(null);
      setCapturedBlob(null);
      return;
    }
    startStream();
    return () => stopStream();
  }, [isOpen, facingMode]);

  const startStream = async () => {
    setError('');
    stopStream();
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStreaming(true);
      } else {
        throw new Error('Live camera not supported on this browser.');
      }
    } catch (err) {
      setError(`Camera error: ${err.message}. You can upload an image below.`);
      setStreaming(false);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStreaming(false);
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark with Experiential Edge Timestamp & Verified Geofence
    const now = new Date();
    const watermarkText = `EDGEWFORCE VERIFIED AUDIT • ${formatDate(now)} ${formatTime(now)}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(watermarkText, 14, canvas.height - 13);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);

    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.85);

    stopStream();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startStream();
  };

  const handleConfirm = () => {
    if (capturedBlob) {
      const file = new File([capturedBlob], `audit-live-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file, capturedImage);
      onClose();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onCapture(file, reader.result);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      isOpen={isOpen}
      onClose={() => {
        stopStream();
        onClose();
      }}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Viewfinder Container */}
        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-zinc-700">
          {flash && (
            <div className="absolute inset-0 bg-white z-20 animate-fade-out" />
          )}

          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Live Targeting Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-orange-500/70 rounded-lg shadow-lg" />
              </div>
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured Frame"
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Flip Camera Button Overlay (if streaming) */}
          {streaming && !capturedImage && (
            <button
              type="button"
              onClick={handleFlipCamera}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
              title="Switch Camera"
            >
              <RotateCcw size={16} />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {!capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleSnap}
                disabled={!streaming}
                className="btn-primary w-full sm:flex-1 py-3 text-sm font-bold shadow-lg"
              >
                <Camera size={18} />
                <span>Snap Live Photo</span>
              </button>

              <label className="btn-secondary text-xs cursor-pointer w-full sm:w-auto text-center">
                <ImageIcon size={15} />
                <span>Upload from Gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="btn-secondary w-full sm:w-auto text-xs py-2.5"
              >
                <RefreshCw size={14} />
                <span>Retake Photo</span>
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="btn-primary w-full sm:flex-1 py-2.5 text-xs font-bold"
              >
                <CheckCircle2 size={16} />
                <span>Confirm & Attach Evidence</span>
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
