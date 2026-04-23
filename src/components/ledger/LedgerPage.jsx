import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import {
  formatCurrency, paiseToRupees, formatDate, formatDateSeparator,
  buildWhatsAppURL, deleteBillImage, getSignedUrl,
} from '../../lib/supabase';
import {
  ArrowLeft, MessageCircle, Trash2, Pencil, ExternalLink,
  Paperclip, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import AddTransactionModal from './AddTransactionModal';
import AddCustomerModal from '../customers/AddCustomerModal';

const FILTER = { ALL: 'all', UDHAAR: 'udhaar', JAMA: 'jama' };

export default function LedgerPage({ customerId, onBack }) {
  const { customers, getTransactions, deleteTransaction, profile, lang } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(FILTER.ALL);
  const [modalType, setModalType] = useState(null); // 'udhaar' | 'jama' | null
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [expandedTx, setExpandedTx] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  // Cache of signed URLs keyed by "txId-index" — generated on expand, valid 1hr
  const [signedUrls, setSignedUrls] = useState({});

  const customer = customers.find(
    (c) => c.customer_id === customerId || c.id === customerId
  );

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const { data } = await getTransactions(customerId);
    setTransactions(data || []);
    setLoading(false);
  }, [customerId, getTransactions]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // ── Running balance calculation ───────────────────────
  // All amounts in paise (integers) to avoid floating point errors
  const txWithRunningBalance = useMemo(() => {
    let running = 0;
    return transactions.map((tx) => {
      if (tx.type === 'udhaar') running += Number(tx.amount_paise);
      else running -= Number(tx.amount_paise);
      return { ...tx, runningBalance: running };
    });
  }, [transactions]);

  // ── Filtered list ─────────────────────────────────────
  const filtered = useMemo(() => {
    if (filter === FILTER.ALL) return txWithRunningBalance;
    return txWithRunningBalance.filter((tx) => tx.type === filter);
  }, [txWithRunningBalance, filter]);

  // ── Group by date ─────────────────────────────────────
  const grouped = useMemo(() => {
    const groups = {};
    // Reverse to show newest first but keep running balance computed from oldest
    const reversed = [...filtered].reverse();
    reversed.forEach((tx) => {
      const dateKey = new Date(tx.created_at).toDateString();
      if (!groups[dateKey]) groups[dateKey] = { label: formatDateSeparator(tx.created_at, lang), items: [] };
      groups[dateKey].items.push(tx);
    });
    return Object.values(groups);
  }, [filtered, lang]);

  const balancePaise = Number(customer?.balance_paise) || 0;
  const isSettled = balancePaise === 0;
  const isInCredit = balancePaise < 0; // shop owes customer

  async function handleExpandTx(tx) {
    const isExpanded = expandedTx === tx.id;
    setExpandedTx(isExpanded ? null : tx.id);

    // Sign URLs when expanding, if not already cached
    if (!isExpanded && tx.image_urls?.length > 0) {
      const entries = await Promise.all(
        tx.image_urls.map(async (path, i) => {
          const cacheKey = `${tx.id}-${i}`;
          if (signedUrls[cacheKey]) return [cacheKey, signedUrls[cacheKey]];
          const url = await getSignedUrl(path);
          return [cacheKey, url];
        })
      );
      setSignedUrls((prev) => ({
        ...prev,
        ...Object.fromEntries(entries.filter(([, url]) => url)),
      }));
    }
  }

  async function handleDelete(txId) {
    await deleteTransaction(txId, customerId);
    setConfirmDeleteId(null);
    await loadTransactions();
  }

  const reminderMessage = (
    profile?.whatsapp_template ||
    'Namaste! {ShopName} se yaad dilaya ja raha hai ki aapka ₹{Amount} ka udhaar pending hai. Please jaldi clear karein.'
  )
    .replace('{ShopName}', profile?.shop_name || 'Shop')
    .replace('{Amount}', paiseToRupees(Math.abs(balancePaise)));

  // If mobile exists → open direct chat; if not → open WhatsApp with just the message (user picks contact)
  const whatsappUrl = customer?.mobile_no
    ? buildWhatsAppURL(
        customer.mobile_no,
        profile?.whatsapp_template ||
          'Namaste! {ShopName} se yaad dilaya ja raha hai ki aapka ₹{Amount} ka udhaar pending hai. Please jaldi clear karein.',
        profile?.shop_name || 'Shop',
        Math.abs(balancePaise)
      )
    : `https://wa.me/?text=${encodeURIComponent(reminderMessage)}`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-ambient rounded-b-2xl">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            {/* Back + Name */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant active:bg-surface-container-high mt-0.5 shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <button
                  onClick={() => setShowEditCustomer(true)}
                  className="flex items-center gap-1.5 group"
                >
                  <h1 className="font-black text-xl text-on-surface tracking-tight truncate">
                    {customer?.name || '...'}
                  </h1>
                  <Pencil size={13} className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-on-surface-variant">
                    {customer?.mobile_no || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Balance + WhatsApp */}
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {t(lang, 'balanceDue')}
              </p>
              <p className={`font-black text-2xl mt-0.5 ${
                isSettled ? 'text-on-surface-variant' :
                isInCredit ? 'text-secondary' : 'text-tertiary-container'
              }`}>
                {isSettled ? t(lang, 'settled') : `₹${paiseToRupees(Math.abs(balancePaise))}`}
              </p>
              {balancePaise > 0 && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-[#25D366] text-white text-xs font-bold rounded-full shadow-ambient active:scale-95 transition-transform"
                >
                  <MessageCircle size={12} fill="white" />
                  {t(lang, 'sendReminder')}
                </a>
              )}
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
            {[
              { id: FILTER.ALL, label: t(lang, 'allEntries') },
              { id: FILTER.UDHAAR, label: t(lang, 'udhaarsOnly') },
              { id: FILTER.JAMA, label: t(lang, 'jamasOnly') },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === id
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Transaction List ── */}
      <main className="flex-1 overflow-y-auto pb-44 pt-4 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-container/30 border-t-primary-container rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-sm">
            {t(lang, 'noTransactions')}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group, gIdx) => (
              <div key={gIdx}>
                {/* Date separator */}
                <div className="flex justify-center mb-3">
                  <span className="bg-surface-container-low text-on-surface-variant px-3 py-1 rounded-full text-xs font-semibold">
                    {group.label}
                  </span>
                </div>

                <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
                  {group.items.map((tx, txIdx) => {
                    const isUdhaar = tx.type === 'udhaar';
                    const isExpanded = expandedTx === tx.id;
                    const hasImages = tx.image_urls?.length > 0;

                    return (
                      <div
                        key={tx.id}
                        className={txIdx < group.items.length - 1 ? 'border-b border-outline-variant/10' : ''}
                      >
                        <button
                          onClick={() => handleExpandTx(tx)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-container-high transition-colors"
                        >
                          {/* Type indicator */}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isUdhaar ? 'bg-error-container' : 'bg-secondary-container'
                          }`}>
                            <span className={`text-lg font-black ${
                              isUdhaar ? 'text-tertiary-container' : 'text-on-secondary-container'
                            }`}>
                              {isUdhaar ? '↑' : '↓'}
                            </span>
                          </div>

                          {/* Description + time */}
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-semibold text-sm text-on-surface truncate">
                              {tx.description || (isUdhaar ? t(lang, 'udhaar') : t(lang, 'jama'))}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-on-surface-variant">
                                {formatDate(tx.created_at, lang)}
                              </p>
                              {hasImages && (
                                <span className="flex items-center gap-0.5 text-[10px] text-primary-container font-semibold">
                                  <Paperclip size={10} />
                                  Bill
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Amount + running balance */}
                          <div className="text-right shrink-0">
                            <p className={`font-black text-base ${
                              isUdhaar ? 'text-tertiary-container' : 'text-secondary'
                            }`}>
                              {isUdhaar ? '+' : '−'}₹{paiseToRupees(tx.amount_paise)}
                            </p>
                            <p className="text-[10px] text-on-surface-variant font-medium">
                              {t(lang, 'runningBalance')} ₹{paiseToRupees(Math.abs(tx.runningBalance))}
                            </p>
                          </div>

                          {/* Expand chevron */}
                          {isExpanded
                            ? <ChevronUp size={14} className="text-on-surface-variant shrink-0" />
                            : <ChevronDown size={14} className="text-on-surface-variant shrink-0" />
                          }
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-surface-container-low space-y-3">
                            {/* Bill images */}
                            {hasImages && (
                              <div>
                                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wide mb-2">
                                  {t(lang, 'viewBills')}
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {tx.image_urls.map((_, i) => {
                                    const cacheKey = `${tx.id}-${i}`;
                                    const signedUrl = signedUrls[cacheKey];
                                    return signedUrl ? (
                                      <a
                                        key={i}
                                        href={signedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-3 py-1.5 bg-primary-container/10 text-primary-container rounded-lg text-xs font-semibold"
                                      >
                                        <ExternalLink size={11} />
                                        Bill {i + 1}
                                      </a>
                                    ) : (
                                      <span
                                        key={i}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-surface-container text-on-surface-variant rounded-lg text-xs"
                                      >
                                        <div className="w-3 h-3 border border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
                                        Loading...
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Delete action */}
                            {confirmDeleteId === tx.id ? (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-on-surface-variant flex-1">
                                  {t(lang, 'deleteTransaction')}
                                </p>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1.5 text-xs font-bold text-on-surface-variant bg-surface-container rounded-lg"
                                >
                                  {t(lang, 'cancel')}
                                </button>
                                <button
                                  onClick={() => handleDelete(tx.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-on-primary bg-error rounded-lg"
                                >
                                  {t(lang, 'delete')}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(tx.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-error"
                              >
                                <Trash2 size={13} />
                                {t(lang, 'delete')} entry
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer Action Buttons — sits above the 80px bottom nav ── */}
      <div className="fixed left-0 right-0 z-40 px-4 pt-3 pb-3 bg-surface-container-lowest/95 backdrop-blur-xl shadow-ambient-up"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex gap-3">
          <button
            onClick={() => setModalType('udhaar')}
            className="flex-1 py-3.5 bg-tertiary-container text-on-primary font-black text-sm rounded-xl shadow-ambient active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
          >
            ↑ {t(lang, 'addUdhaar')}
          </button>
          <button
            onClick={() => setModalType('jama')}
            className="flex-1 py-3.5 bg-secondary text-on-primary font-black text-sm rounded-xl shadow-ambient active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
          >
            ↓ {t(lang, 'addJama')}
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      {modalType && (
        <AddTransactionModal
          customerId={customerId}
          type={modalType}
          onClose={() => setModalType(null)}
          onSuccess={loadTransactions}
        />
      )}

      {showEditCustomer && customer && (
        <AddCustomerModal
          editCustomer={{ ...customer, id: customer.customer_id || customer.id }}
          onClose={() => setShowEditCustomer(false)}
        />
      )}
    </div>
  );
}