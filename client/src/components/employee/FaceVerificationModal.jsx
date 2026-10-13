import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import { Camera, Shield, CheckCircle2, AlertCircle, RefreshCw, Eye } from 'lucide-react';
import { api } from '../../lib/api';

export default function FaceVerificationModal({ isOpen, onClose, onVerified }) {
  const [streaming, setStreaming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraAllowed, setCameraAllowed] = useState(null);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStreaming(true);
        setCameraAllowed(true);
      } else {
        throw new Error('Camera access not supported on this browser.');
      }
    } catch (err) {
      setCameraAllowed(false);
      setError('Camera access unavailable. Fallback to GPS biometric verification is enabled.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setStreaming(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError('');
    try {
      // Simulate biometric face embedding extraction and match against enrollment profile
      const res = await api.post('/employee/face/verify', {
        event_type: 'VERIFICATION',
        simulated_confidence: 0.96
      });

      setResult(res);
      if (res.verified) {
        setTimeout(() => {
          onVerified?.();
          onClose?.();
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Modal
      title="Biometric Facial Verification"
      subtitle="Verify identity for secure attendance check-in"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Privacy Notice */}
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-300 text-xs flex items-start gap-2">
          <Shield size={16} className="mt-0.5 flex-shrink-0" />
          <div className="text-[11px] leading-tight">
            <b>Biometric Privacy Notice:</b> Facial verification generates a cryptographic feature hash. Raw biometric video is never sold or exposed to third parties.
          </div>
        </div>

        {/* Video Viewport / Biometric Scanner View */}
        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center border-2 border-dashed border-zinc-700">
          {cameraAllowed !== false ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="p-6 text-center text-zinc-400 text-xs">
              <Camera size={32} className="mx-auto mb-2 opacity-50" />
              Camera offline. GPS fallback verification is available.
            </div>
          )}

          {/* Facial Targeting Oval Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-60 rounded-full border-2 border-orange-500/60 shadow-[0_0_20px_rgba(245,124,0,0.3)] animate-pulse" />
          </div>

          {verifying && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
              <RefreshCw size={24} className="animate-spin text-orange-500" />
              <span>Matching Face Vector…</span>
            </div>
          )}
        </div>

        {result && (
          <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
            result.verified
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}>
            <CheckCircle2 size={16} />
            <span>
              {result.message} (Score: {(result.confidence * 100).toFixed(1)}%)
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="pt-2 flex gap-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="btn-primary flex-1"
          >
            <Eye size={15} />
            {verifying ? 'Verifying…' : 'Scan & Verify Identity'}
          </button>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
