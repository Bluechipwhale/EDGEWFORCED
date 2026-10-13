import React, { useState } from 'react';
import Modal from '../common/Modal';
import LiveCameraModal from '../common/LiveCameraModal';
import { Camera, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { api } from '../../lib/api';

export default function CompetitorModal({ customers = [], isOpen, onClose, onSaved }) {
  const [form, setForm] = useState({
    customer_id: '',
    competitor_brand: '',
    product_name: '',
    observed_price: '',
    our_price: '',
    shelf_share_percent: 50,
    promo_details: ''
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const observedNum = Number(form.observed_price || 0);
  const ourNum = Number(form.our_price || 0);
  const priceDifference = observedNum - ourNum;

  const handleLivePhotoCaptured = (file, previewUrl) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.competitor_brand || !form.product_name || !form.observed_price || !form.our_price) {
      setError('Please fill in competitor brand, product name, shelf price and our price.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);

      await api.post('/sales/competitor-intel', fd);
      onSaved?.();
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
        title="Log Competitor Market Intelligence"
        subtitle="Track competitor pricing, promotional schemes & shelf presence"
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
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Observed Outlet
              </label>
              <select
                className="form-input"
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
              >
                <option value="">Select Outlet (Optional)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Competitor Brand *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Devon Kings, Bournvita"
                className="form-input"
                value={form.competitor_brand}
                onChange={(e) => setForm({ ...form, competitor_brand: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Competitor Product Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kings Pure Vegetable Oil 1L x 12"
                className="form-input"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Observed Shelf Price (₦) *
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 49500"
                className="form-input"
                value={form.observed_price}
                onChange={(e) => setForm({ ...form, observed_price: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                Our Equivalent Price (₦) *
              </label>
              <input
                type="number"
                required
                placeholder="e.g. 48500"
                className="form-input"
                value={form.our_price}
                onChange={(e) => setForm({ ...form, our_price: e.target.value })}
              />
            </div>
          </div>

          {/* Auto Price Difference Banner */}
          {form.observed_price && form.our_price && (
            <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between ${
              priceDifference >= 0
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}>
              <span>Price Difference:</span>
              <span>
                {priceDifference >= 0
                  ? `+${formatMoney(priceDifference)} (Our price is cheaper)`
                  : `${formatMoney(priceDifference)} (Competitor is cheaper)`}
              </span>
            </div>
          )}

          {/* Shelf Share Slider */}
          <div>
            <div className="flex justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5">
              <span>Observed Shelf Share:</span>
              <span className="text-orange-600 dark:text-orange-400 font-bold">{form.shelf_share_percent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full accent-orange-500"
              value={form.shelf_share_percent}
              onChange={(e) => setForm({ ...form, shelf_share_percent: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Promotion Scheme / Trade Notes
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Buy 10 cartons get 1 free promotional bottle..."
              className="form-input"
              value={form.promo_details}
              onChange={(e) => setForm({ ...form, promo_details: e.target.value })}
            />
          </div>

          {/* Live Photo Evidence */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
              Competitor Shelf Photo (Live Picture)
            </label>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 max-h-44 group">
                <img
                  src={photoPreview}
                  alt="Competitor Evidence"
                  className="w-full h-40 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCameraModalOpen(true)}
                    className="btn-primary text-xs py-1 px-3"
                  >
                    <Camera size={13} />
                    <span>Retake</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="btn-danger text-xs py-1 px-3"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCameraModalOpen(true)}
                className="w-full p-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-orange-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-orange-500 transition"
              >
                <Camera size={16} className="text-orange-500" />
                <span>Snap Live Competitor Photo</span>
              </button>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Logging Intel…' : 'Save Competitor Intel'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <LiveCameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleLivePhotoCaptured}
        title="Live Competitor Photo"
        subtitle="Capture competitor shelf pricing and display"
      />
    </>
  );
}
