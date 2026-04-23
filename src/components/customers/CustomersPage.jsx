import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import { paiseToRupees } from '../../lib/supabase';
import { Search, UserPlus, X, ChevronRight, SortDesc, SortAsc, User } from 'lucide-react';
import AddCustomerModal from './AddCustomerModal';

const SORT = { HIGH_DUES: 'high_dues', NAME: 'name', RECENT: 'recent' };

export default function CustomersPage({ setActiveTab, setSelectedCustomerId }) {
  const { customers, lang } = useApp();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(SORT.HIGH_DUES);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    let list = [...customers];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.mobile_no?.includes(q)
      );
    }

    // Sort
    if (sort === SORT.HIGH_DUES) {
      list.sort((a, b) => Number(b.balance_paise) - Number(a.balance_paise));
    } else if (sort === SORT.NAME) {
      list.sort((a, b) => a.name?.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [customers, search, sort]);

  function getAvatarBg(name) {
    const colors = [
      'bg-secondary-container text-on-secondary-container',
      'bg-error-container text-on-error-container',
      'bg-primary-fixed text-on-primary-fixed',
      'bg-tertiary-fixed text-on-tertiary-fixed',
    ];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-ambient px-4 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-black text-on-surface tracking-tight">
            {t(lang, 'allCustomers')}
            <span className="ml-2 text-sm font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
              {customers.length}
            </span>
          </h1>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary px-3 py-2 rounded-xl text-sm font-bold shadow-ambient active:scale-95 transition-transform"
          >
            <UserPlus size={16} />
            {t(lang, 'addCustomer')}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(lang, 'searchCustomers')}
            className="w-full pl-9 pr-9 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/30 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-on-surface-variant" />
            </button>
          )}
        </div>

        {/* Sort chips */}
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: SORT.HIGH_DUES, label: t(lang, 'sortByHighDues'), icon: SortDesc },
            { id: SORT.NAME, label: t(lang, 'sortByName'), icon: SortAsc },
            { id: SORT.RECENT, label: t(lang, 'sortByRecent'), icon: User },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSort(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                sort === id
                  ? 'bg-primary-container text-on-primary'
                  : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* List */}
      <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-4">
              <User size={28} className="text-on-surface-variant" />
            </div>
            <p className="text-on-surface-variant text-sm">
              {search ? 'No results found.' : t(lang, 'noCustomers')}
            </p>
            {!search && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-6 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary text-sm font-bold rounded-xl shadow-ambient"
              >
                {t(lang, 'addCustomer')}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden">
            {filtered.map((customer, idx) => {
              const balance = Number(customer.balance_paise) || 0;
              const isPositive = balance > 0;
              const isSettled = balance === 0;
              return (
                <button
                  key={customer.customer_id}
                  onClick={() => {
                    setSelectedCustomerId(customer.customer_id);
                    setActiveTab('ledger');
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-surface-container-high transition-colors ${
                    idx < filtered.length - 1 ? 'border-b border-outline-variant/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Left accent bar */}
                    <div className={`w-1 h-10 rounded-full self-stretch ${
                      isSettled ? 'bg-surface-container' : isPositive ? 'bg-tertiary-container' : 'bg-secondary'
                    }`} />

                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarBg(customer.name)}`}>
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>

                    <div className="text-left">
                      <p className="font-bold text-sm text-on-surface leading-tight">{customer.name}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {customer.mobile_no || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`font-black text-base ${
                        isSettled ? 'text-on-surface-variant' : isPositive ? 'text-tertiary-container' : 'text-secondary'
                      }`}>
                        {isSettled ? t(lang, 'settled') : `₹${paiseToRupees(Math.abs(balance))}`}
                      </p>
                      {!isSettled && (
                        <p className={`text-[9px] uppercase font-bold ${isPositive ? 'text-tertiary-container' : 'text-secondary'}`}>
                          {isPositive ? t(lang, 'udhaar') : t(lang, 'jama')}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-on-surface-variant" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {showAdd && <AddCustomerModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
