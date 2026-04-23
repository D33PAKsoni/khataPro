import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import { rupeesToPaise, uploadBillImage } from '../../lib/supabase';
import { X, Camera, Paperclip, Trash2, IndianRupee } from 'lucide-react';

export default function AddTransactionModal({ customerId, type, onClose, onSuccess }) {
  const { addTransaction, session, lang } = useApp();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]); // { file, preview, uploading, url }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const isUdhaar = type === 'udhaar';
  const accentColor = isUdhaar ? 'text-tertiary-container' : 'text-secondary';
  const accentBg = isUdhaar ? 'bg-tertiary-container' : 'bg-secondary';

  async function handleImagePick(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImages = files.slice(0, 5 - images.length).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      url: null,
    }));
    setImages((prev) => [...prev, ...newImages]);
  }

  function removeImage(idx) {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[idx].preview);
      next.splice(idx, 1);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const paise = rupeesToPaise(amount);
    if (!paise || paise <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true); setError('');

    // Upload images
    let uploadedUrls = [];
    try {
      const uploads = await Promise.all(
        images.map((img) =>
          img.url ? Promise.resolve(img.url)
            : uploadBillImage(img.file, session.user.id, customerId).catch(() => null)
        )
      );
      uploadedUrls = uploads.filter(Boolean);
    } catch {
      // Images optional — proceed even if upload fails
    }

    const { error: err } = await addTransaction(
      customerId, type, paise,
      description.trim() || null,
      uploadedUrls
    );

    setLoading(false);
    if (err) { setError(err.message); return; }
    onSuccess?.();
    onClose();
  }

  const inputClass = `w-full px-4 py-3 bg-surface-container-low rounded-xl text-on-surface placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/30 focus:bg-surface-container transition-all`;

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/50 backdrop-blur-sm flex items-end">
      <div className="w-full max-h-[90vh] bg-surface-container-lowest rounded-t-3xl shadow-float flex flex-col animate-slide-up overflow-hidden" style={{ paddingBottom: '40px' }}>
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 ${isUdhaar ? 'bg-error-container/30' : 'bg-secondary-container/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {isUdhaar ? '↑ Credit Given' : '↓ Payment Received'}
              </p>
              <h2 className={`text-2xl font-black tracking-tight ${accentColor}`}>
                {isUdhaar ? `+ ${t(lang, 'udhaar')}` : `+ ${t(lang, 'jama')}`}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center active:bg-surface-container-high"
            >
              <X size={18} className="text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {error && (
            <div className="px-4 py-3 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
              {error}
            </div>
          )}

          {/* Amount input — large & prominent */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t(lang, 'amount')} *
            </label>
            <div className={`flex items-center gap-3 px-4 py-3 bg-surface-container-low rounded-xl focus-within:ring-2 focus-within:ring-primary-container/30 transition-all`}>
              <IndianRupee size={20} className={accentColor} />
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-3xl font-black text-on-surface bg-transparent outline-none placeholder-on-surface-variant/40"
                step="0.01"
                min="0.01"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t(lang, 'description')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isUdhaar ? 'e.g. Rice 5kg, Dal 2kg, Sugar 1kg' : 'e.g. Cash payment, UPI'}
              className={`${inputClass} resize-none h-20 text-sm`}
              maxLength={200}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              {t(lang, 'attachBill')}
            </label>

            <div className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface-container shrink-0">
                  <img src={img.preview} alt="bill" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 bg-on-surface/60 rounded-full flex items-center justify-center"
                  >
                    <X size={10} className="text-surface-container-lowest" />
                  </button>
                </div>
              ))}

              {images.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-outline-variant/40 flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:bg-surface-container transition-colors active:bg-surface-container-high shrink-0"
                >
                  <Camera size={20} />
                  <span className="text-[9px] font-semibold">Add Photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handleImagePick}
            />

            {images.length > 0 && (
              <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-1">
                <Paperclip size={11} />
                {images.length} bill{images.length > 1 ? 's' : ''} attached
              </p>
            )}
          </div>
        </form>

        {/* Footer CTA */}
        <div className="px-5 pb-8 pt-3 bg-surface-container-lowest border-t border-outline-variant/10">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !amount}
            className={`w-full py-4 ${accentBg} text-on-primary font-black text-base rounded-xl shadow-ambient active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                {isUdhaar ? '+ Add Udhaar' : '+ Add Jama'}
                {amount && ` — ₹${parseFloat(amount || 0).toLocaleString('en-IN')}`}
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.22s cubic-bezier(0.32, 0.72, 0, 1); }
      `}</style>
    </div>
  );
}
