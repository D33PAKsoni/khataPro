import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, paiseToRupees, formatDate } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { TrendingUp, Users, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function HomePage({ setActiveTab, setSelectedCustomerId }) {
  const { profile, customers, lang } = useApp();

  // Aggregate recent transactions across all customers isn't available directly
  // so we show recent customers by their last activity (sorted by balance desc as proxy)
  const recentCustomers = useMemo(() => {
    return [...customers]
      .filter((c) => Number(c.balance_paise) !== 0)
      .sort((a, b) => Number(b.balance_paise) - Number(a.balance_paise))
      .slice(0, 5);
  }, [customers]);

  const totalPaise = useMemo(() =>
    customers.reduce((sum, c) => sum + Math.max(0, Number(c.balance_paise) || 0), 0),
    [customers]
  );

  const totalCustomers = customers.length;
  const withDues = customers.filter((c) => Number(c.balance_paise) > 0).length;

  function getAvatarBg(name) {
    const colors = [
      'bg-secondary-container text-on-secondary-container',
      'bg-error-container text-on-tertiary-fixed',
      'bg-primary-fixed text-on-primary-fixed',
      'bg-tertiary-fixed text-on-tertiary-fixed',
    ];
    const idx = name?.charCodeAt(0) % colors.length || 0;
    return colors[idx];
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-ambient px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {t(lang, 'tagline')}
            </p>
            <h1 className="text-xl font-black text-primary-container tracking-tight leading-tight">
              {profile?.shop_name || t(lang, 'appName')}
            </h1>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant active:bg-surface-container-high transition-colors"
          >
            <span className="text-lg font-bold text-primary-container">
              {(profile?.shop_name || 'K')[0].toUpperCase()}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 pt-5 px-4 space-y-6">
        {/* Hero Snapshot Card */}
        <section className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-6 relative overflow-hidden shadow-float">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute top-4 right-8 w-12 h-12 bg-white/5 rounded-full" />

          <p className="text-on-primary/70 text-xs font-bold uppercase tracking-widest mb-1">
            {t(lang, 'totalToCollect')}
          </p>
          <div className="text-4xl font-black text-on-primary tracking-tight mb-5">
            ₹{paiseToRupees(totalPaise)}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('customers')}
              className="flex-1 bg-white/15 backdrop-blur text-on-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white/25 transition-colors"
            >
              <Users size={16} />
              {withDues} {t(lang, 'customers')}
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className="flex-1 bg-white/90 text-primary py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-white transition-colors shadow"
            >
              {t(lang, 'viewAll')}
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-ambient">
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-on-surface-variant" />
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{t(lang, 'totalCustomers')}</p>
            </div>
            <p className="text-2xl font-black text-on-surface">{totalCustomers}</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-ambient">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-tertiary-container" />
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Pending</p>
            </div>
            <p className="text-2xl font-black text-tertiary-container">{withDues}</p>
          </div>
        </div>

        {/* Recent Records */}
        <section>
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-base font-black text-on-surface">{t(lang, 'recentRecords')}</h3>
            <button
              onClick={() => setActiveTab('customers')}
              className="text-xs font-bold text-primary-container uppercase tracking-wide"
            >
              {t(lang, 'seeAll')}
            </button>
          </div>

          {recentCustomers.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-8 text-center shadow-ambient">
              <p className="text-on-surface-variant text-sm">{t(lang, 'noRecentRecords')}</p>
              <button
                onClick={() => setActiveTab('customers')}
                className="mt-4 px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-bold rounded-xl"
              >
                {t(lang, 'addCustomer')}
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
              {recentCustomers.map((customer, idx) => {
                const balance = Number(customer.balance_paise) || 0;
                const isCredit = balance > 0;
                return (
                  <button
                    key={customer.customer_id}
                    onClick={() => {
                      setSelectedCustomerId(customer.customer_id);
                      setActiveTab('ledger');
                    }}
                    className={`w-full flex items-center justify-between p-4 active:bg-surface-container-high transition-colors ${
                      idx < recentCustomers.length - 1 ? 'border-b border-outline-variant/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarBg(customer.name)}`}>
                        {customer.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-on-surface leading-tight">{customer.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{customer.mobile_no || '—'}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <p className={`font-black text-base ${isCredit ? 'text-tertiary-container' : 'text-secondary'}`}>
                          ₹{paiseToRupees(Math.abs(balance))}
                        </p>
                        <p className={`text-[10px] uppercase font-bold ${isCredit ? 'text-tertiary-container' : 'text-secondary'}`}>
                          {isCredit ? t(lang, 'udhaar') : t(lang, 'jama')}
                        </p>
                      </div>
                      {isCredit
                        ? <ArrowUpRight size={16} className="text-tertiary-container" />
                        : <ArrowDownLeft size={16} className="text-secondary" />
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
