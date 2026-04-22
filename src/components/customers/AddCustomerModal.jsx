import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import { X, UserPlus } from 'lucide-react';

export default function AddCustomerModal({ onClose, editCustomer = null }) {
  const { addCustomer, updateCustomer, lang } = useApp();
  const [name, setName] = useState(editCustomer?.name || '');
  const [mobile, setMobile] = useState(editCustomer?.mobile_no || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    const { error: err } = editCustomer
      ? await updateCustomer(editCustomer.customer_id || editCustomer.id, { name: name.trim(), mobile_no: mobile || null })
      : await addCustomer(name.trim(), mobile || null);
    if (err) setError(err.message);
    else onClose();
    setLoading(false);
  }

  const inputClass = `w-full px-4 py-3 bg-surface-container-low rounded-xl text-on-surface text-base placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/40 transition-all`;

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-end">
      <div className="w-full bg-surface-container-lowest rounded-t-3xl shadow-float px-6 pt-6 pb-safe animate-slide-up"
        style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 88px), 96px)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-on-surface">
            {editCustomer ? t(lang, 'edit') : t(lang, 'addCustomer')}
          </h2>
          <button onClick={onClose} className="w-9 h-9 bg-surface-container rounded-full flex items-center justify-center active:bg-surface-container-high">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-error-container rounded-lg text-on-error-container text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
              {t(lang, 'customerName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className={inputClass}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
              {t(lang, 'mobileNumber')}
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl active:scale-[0.98] transition-transform"
            >
              {t(lang, 'cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-ambient active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <UserPlus size={16} />
              {loading ? t(lang, 'loading') : t(lang, 'save')}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  );
}
