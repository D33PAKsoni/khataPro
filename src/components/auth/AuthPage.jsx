import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { ChevronRight, Store, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function AuthPage() {
  const lang = localStorage.getItem('lang') || 'en';
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { shop_name: shopName.trim() || 'My Shop' } },
        });
        if (error) throw error;
        setMessage('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  }

  const inputClass = `w-full pl-10 pr-4 py-3.5 bg-surface-container-low rounded-xl text-on-surface text-base placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/40 focus:bg-surface-container transition-all`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary-container pt-16 pb-14 px-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-6 right-20 w-20 h-20 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-5">
            <Store size={28} className="text-on-primary" />
          </div>
          <h1 className="text-3xl font-black text-on-primary tracking-tight">खाता संग्रह</h1>
          <p className="text-on-primary/70 text-sm mt-1 font-medium">
            Khata Sangrah · Digital Ledger
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 px-5 pt-8 pb-10">
        <h2 className="text-2xl font-black text-on-surface tracking-tight mb-1">
          {isSignUp ? t(lang, 'createAccount') : t(lang, 'welcomeBack')}
        </h2>
        <p className="text-sm text-on-surface-variant mb-7">
          {isSignUp ? 'Create your free shop account' : 'Sign in to your shop account'}
        </p>

        {error && (
          <div className="mb-5 px-4 py-3 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 px-4 py-3 bg-secondary-container rounded-xl text-on-secondary-container text-sm font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder={t(lang, 'yourShopName')}
                className={inputClass}
                autoFocus
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(lang, 'email')}
              className={inputClass}
              required
              autoFocus={!isSignUp}
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t(lang, 'password')}
              className={`${inputClass} pr-12`}
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            >
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-black text-base rounded-xl shadow-ambient active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading
              ? <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              : <>{isSignUp ? t(lang, 'signUp') : t(lang, 'signIn')}<ChevronRight size={18} /></>
            }
          </button>
        </form>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}
          className="w-full text-center text-sm text-primary font-semibold mt-6"
        >
          {isSignUp ? t(lang, 'haveAccount') : t(lang, 'noAccount')}
        </button>
      </div>
    </div>
  );
}
