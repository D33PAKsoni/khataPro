import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { Smartphone, Mail, ChevronRight, ArrowLeft, Store, Eye, EyeOff } from 'lucide-react';

const MODES = { LANDING: 'LANDING', EMAIL: 'EMAIL', PHONE: 'PHONE', OTP: 'OTP' };

export default function AuthPage() {
  const lang = localStorage.getItem('lang') || 'en';
  const [mode, setMode] = useState(MODES.LANDING);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearMessages = () => { setError(''); setMessage(''); };

  // ── Email Auth ────────────────────────────────────────
  async function handleEmailAuth(e) {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { shop_name: shopName || 'My Shop' } },
        });
        if (error) throw error;
        setMessage('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // ── Phone OTP ─────────────────────────────────────────
  async function handleSendOTP(e) {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
      if (error) throw error;
      setMode(MODES.OTP);
      setMessage('OTP sent successfully!');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setLoading(true); clearMessages();
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const { error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  // ── Google OAuth ──────────────────────────────────────
  async function handleGoogleAuth() {
    setLoading(true); clearMessages();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  // ── UI ────────────────────────────────────────────────
  const inputClass = `w-full px-4 py-3 bg-surface-container-low rounded-xl text-on-surface text-base placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/50 focus:bg-surface-container transition-all duration-200`;
  const btnPrimary = `w-full py-3.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-base rounded-xl shadow-ambient active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2 disabled:opacity-60`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header decoration */}
      <div className="bg-gradient-to-br from-primary to-primary-container pt-16 pb-12 px-6 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute top-8 right-16 w-16 h-16 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mb-4">
            <Store size={28} className="text-on-primary" />
          </div>
          <h1 className="text-2xl font-black text-on-primary tracking-tight">खाता संग्रह</h1>
          <p className="text-on-primary/70 text-sm mt-1 font-medium">Khata Sangrah · Digital Ledger</p>
        </div>
      </div>

      <div className="flex-1 px-6 pt-8 pb-10">
        {/* Error / Message */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 px-4 py-3 bg-secondary-container rounded-xl text-on-secondary-container text-sm font-medium">
            {message}
          </div>
        )}

        {/* LANDING */}
        {mode === MODES.LANDING && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-on-surface tracking-tight mb-6">
              {isSignUp ? t(lang, 'createAccount') : t(lang, 'welcomeBack')}
            </h2>

            <button onClick={() => setMode(MODES.PHONE)} className={btnPrimary}>
              <Smartphone size={20} />
              {t(lang, 'phone')} (OTP)
            </button>

            <button
              onClick={() => setMode(MODES.EMAIL)}
              className="w-full py-3.5 bg-surface-container-high text-primary font-bold text-base rounded-xl active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-2"
            >
              <Mail size={20} />
              {t(lang, 'email')} / {t(lang, 'password')}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-outline-variant/30" />
              <span className="text-on-surface-variant text-xs font-medium">{t(lang, 'orContinueWith')}</span>
              <div className="flex-1 h-px bg-outline-variant/30" />
            </div>

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full py-3.5 bg-surface-container-lowest border border-outline-variant/20 text-on-surface font-semibold text-base rounded-xl active:scale-[0.98] transition-transform duration-150 flex items-center justify-center gap-3 shadow-ambient"
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.5-11.3 7.5C17.1 35.5 11 29.4 11 22s6.1-13.5 13-13.5c3.1 0 6 1.1 8.2 2.9l5.9-5.9C34.6 3.5 29.6 1.5 24 1.5 12.7 1.5 3.5 10.7 3.5 22S12.7 42.5 24 42.5 44.5 33.3 44.5 22c0-.7-.1-1.3-.2-2h-.7z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3.1 0 6 1.1 8.2 2.9l5.9-5.9C34.6 3.5 29.6 1.5 24 1.5c-7.8 0-14.5 4.4-17.7 10.9l-.1.3z"/>
                <path fill="#4CAF50" d="M24 42.5c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.5C29.5 33.8 26.9 35 24 35c-5.5 0-10.1-3.7-11.7-8.7L5.5 31c3.2 6.8 10.1 11.5 18.5 11.5z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2-2.1 3.8-3.8 5.1l6.6 5.5c4.1-3.8 6.6-9.3 6.6-16.6 0-.7-.1-1.3-.2-2h.1z"/>
              </svg>
              {t(lang, 'continueWithGoogle')}
            </button>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm text-primary font-semibold mt-4"
            >
              {isSignUp ? t(lang, 'haveAccount') : t(lang, 'noAccount')}
            </button>
          </div>
        )}

        {/* PHONE OTP */}
        {mode === MODES.PHONE && (
          <div>
            <button onClick={() => { setMode(MODES.LANDING); clearMessages(); }} className="flex items-center gap-2 text-on-surface-variant mb-6">
              <ArrowLeft size={18} /> Back
            </button>
            <h2 className="text-2xl font-black text-on-surface mb-6">Enter Mobile Number</h2>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
                required
              />
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? t(lang, 'loading') : t(lang, 'sendOTP')} <ChevronRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* OTP VERIFY */}
        {mode === MODES.OTP && (
          <div>
            <button onClick={() => { setMode(MODES.PHONE); clearMessages(); }} className="flex items-center gap-2 text-on-surface-variant mb-6">
              <ArrowLeft size={18} /> Back
            </button>
            <h2 className="text-2xl font-black text-on-surface mb-2">{t(lang, 'verifyOTP')}</h2>
            <p className="text-on-surface-variant text-sm mb-6">Sent to {phone}</p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className={`${inputClass} text-center text-3xl font-bold tracking-[0.5rem]`}
                maxLength={6}
                required
              />
              <button type="submit" disabled={loading || otp.length < 6} className={btnPrimary}>
                {loading ? t(lang, 'loading') : t(lang, 'verifyOTP')} <ChevronRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* EMAIL */}
        {mode === MODES.EMAIL && (
          <div>
            <button onClick={() => { setMode(MODES.LANDING); clearMessages(); }} className="flex items-center gap-2 text-on-surface-variant mb-6">
              <ArrowLeft size={18} /> Back
            </button>
            <h2 className="text-2xl font-black text-on-surface mb-6">
              {isSignUp ? t(lang, 'createAccount') : t(lang, 'welcomeBack')}
            </h2>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder={t(lang, 'yourShopName')}
                  className={inputClass}
                />
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(lang, 'email')}
                className={inputClass}
                required
              />
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t(lang, 'password')}
                  className={`${inputClass} pr-12`}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" disabled={loading} className={btnPrimary}>
                {loading ? t(lang, 'loading') : isSignUp ? t(lang, 'signUp') : t(lang, 'signIn')}
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-center text-sm text-primary font-semibold"
              >
                {isSignUp ? t(lang, 'haveAccount') : t(lang, 'noAccount')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
