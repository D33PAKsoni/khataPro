import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import AuthPage from './components/auth/AuthPage';
import BottomNav from './components/common/BottomNav';
import HomePage from './components/home/HomePage';
import CustomersPage from './components/customers/CustomersPage';
import LedgerPage from './components/ledger/LedgerPage';
import SettingsPage from './components/settings/SettingsPage';

// ── PWA Install Prompt ──────────────────────────────────
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show banner after a delay so it doesn't feel pushy
      setTimeout(() => setShow(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!show || !deferredPrompt) return null;

  async function install() {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setShow(false);
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-safe-area-top">
      <div className="mt-3 bg-primary-container text-on-primary rounded-2xl px-4 py-3 flex items-center gap-3 shadow-float animate-slide-down">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0 text-lg font-black">
          📒
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">Install Khata Sangrah</p>
          <p className="text-xs text-on-primary/70 mt-0.5">Access offline, faster on your home screen</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShow(false)}
            className="px-2 py-1.5 text-xs font-bold text-on-primary/60"
          >
            Later
          </button>
          <button
            onClick={install}
            className="px-3 py-1.5 bg-white/20 text-on-primary text-xs font-black rounded-lg"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Shell ──────────────────────────────────────────
function AppShell() {
  const { session, loading, lang } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  function handleSetActiveTab(tab) {
    if (tab !== 'ledger') setSelectedCustomerId(null);
    setActiveTab(tab);
  }

  // Intercept Android hardware back button — navigate within app instead of exiting
  useEffect(() => {
    function handlePopState() {
      if (activeTab === 'ledger') {
        setActiveTab('customers');
        setSelectedCustomerId(null);
      } else if (activeTab !== 'home') {
        setActiveTab('home');
      } else {
        // On home tab, let the browser/OS handle it (minimize, not exit)
        window.history.pushState(null, '', window.location.href);
      }
    }

    // Push a state so there's always something to pop back to
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-container rounded-2xl flex items-center justify-center shadow-float">
          <span className="text-2xl">📒</span>
        </div>
        <div className="w-8 h-8 border-2 border-primary-container/20 border-t-primary-container rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <AuthPage />;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <InstallBanner />

      <div className="flex-1 overflow-hidden relative">
        {/* Home */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'home' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <HomePage
            setActiveTab={handleSetActiveTab}
            setSelectedCustomerId={setSelectedCustomerId}
          />
        </div>

        {/* Customers */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'customers' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <CustomersPage
            setActiveTab={handleSetActiveTab}
            setSelectedCustomerId={setSelectedCustomerId}
          />
        </div>

        {/* Ledger — sits above nav, its own action buttons sit above the nav bar */}
        {selectedCustomerId && (
          <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'ledger' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
            <LedgerPage
              customerId={selectedCustomerId}
              onBack={() => {
                setActiveTab('customers');
                setSelectedCustomerId(null);
              }}
            />
          </div>
        )}

        {/* Settings */}
        <div className={`absolute inset-0 transition-opacity duration-200 ${activeTab === 'settings' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <SettingsPage />
        </div>
      </div>

      {/* BottomNav always visible on all tabs */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        lang={lang}
      />
    </div>
  );
}

export default function App() {
  // Register Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((reg) => console.log('[SW] Registered:', reg.scope))
          .catch((err) => console.warn('[SW] Registration failed:', err));
      });
    }
  }, []);

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
