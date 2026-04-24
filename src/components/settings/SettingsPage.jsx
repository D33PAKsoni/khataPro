import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { t } from '../../lib/i18n';
import { exportToJSON, importFromJSON } from '../../lib/supabase';
import {
  Store, Phone, Globe, MessageCircle, Download, Upload,
  LogOut, ChevronRight, CheckCircle, AlertTriangle, Info,
} from 'lucide-react';

const DEFAULT_TEMPLATE =
  'Namaste! {ShopName} se yaad dilaya ja raha hai ki aapka ₹{Amount} ka udhaar pending hai. Please jaldi clear karein.';

export default function SettingsPage() {
  const { session, profile, updateProfile, lang } = useApp();
  const [shopName, setShopName] = useState('');
  const [mobile, setMobile] = useState('');
  const [template, setTemplate] = useState('');
  const [selectedLang, setSelectedLang] = useState('en');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef(null);

  // Weekly backup reminder
  const lastBackup = localStorage.getItem('lastBackupAt');
  const showBackupReminder = !lastBackup
    || (Date.now() - new Date(lastBackup).getTime()) > 7 * 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (profile) {
      setShopName(profile.shop_name || '');
      setMobile(profile.owner_mobile || '');
      setTemplate(profile.whatsapp_template || DEFAULT_TEMPLATE);
      setSelectedLang(profile.language_preference || 'en');
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    const { error } = await updateProfile({
      shop_name: shopName.trim(),
      owner_mobile: mobile.trim() || null,
      whatsapp_template: template || DEFAULT_TEMPLATE,
      language_preference: selectedLang,
    });
    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : 'Saved!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function handleExport() {
    try {
      await exportToJSON(session.user.id);
      setSaveMsg('Backup downloaded!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(`Export failed: ${err.message}`);
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportMsg('');
    try {
      const result = await importFromJSON(file, session.user.id);
      setImportMsg(`Imported ${result.imported} records.${result.errors.length ? ` ${result.errors.length} errors.` : ''}`);
    } catch (err) {
      setImportMsg(`Import failed: ${err.message}`);
    }
    setImporting(false);
    e.target.value = '';
  }

  async function handleSignOut() {
    await import('../../lib/supabase').then(({ supabase }) => supabase.auth.signOut());
  }

  const inputClass = `w-full px-4 py-3 bg-surface-container-low rounded-xl text-on-surface text-sm placeholder-on-surface-variant outline-none focus:ring-2 focus:ring-primary-container/30 transition-all`;
  const sectionClass = `bg-surface-container-lowest rounded-xl shadow-ambient overflow-hidden`;
  const rowClass = `flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/10 last:border-b-0`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-ambient px-5 py-4">
        <h1 className="text-xl font-black text-on-surface tracking-tight">{t(lang, 'settings')}</h1>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 pt-5 px-4 space-y-5">
        {/* ── Backup Reminder Banner ── */}
        {showBackupReminder && (
          <div className="bg-tertiary-fixed/60 rounded-xl px-4 py-3.5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-tertiary shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-on-tertiary-fixed font-semibold">
                {t(lang, 'backupReminder')}
              </p>
              <button
                onClick={handleExport}
                className="mt-2 text-xs font-bold text-tertiary underline underline-offset-2"
              >
                {t(lang, 'backupNow')}
              </button>
            </div>
          </div>
        )}

        {saveMsg && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold ${
            saveMsg.startsWith('Error') || saveMsg.startsWith('Export failed')
              ? 'bg-error-container text-on-error-container'
              : 'bg-secondary-container text-on-secondary-container'
          }`}>
            <CheckCircle size={16} />
            {saveMsg}
          </div>
        )}

        {/* ── Shop Info ── */}
        <section>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1 mb-2">
            {t(lang, 'shopSettings')}
          </p>
          <form onSubmit={handleSave} className={sectionClass}>
            <div className="px-4 py-4 space-y-3 border-b border-outline-variant/10">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  {t(lang, 'shopName')}
                </label>
                <div className="relative">
                  <Store size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="e.g. Gupta General Store"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                  {t(lang, 'ownerMobile')}
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className={`${inputClass} pl-9`}
                    placeholder="Mobile number (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="px-4 py-4 border-b border-outline-variant/10">
              <label className="block text-xs font-semibold text-on-surface-variant mb-2">
                {t(lang, 'language')}
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'en', label: t(lang, 'english'), flag: '🇬🇧' },
                  { id: 'hi', label: t(lang, 'hindi'), flag: '🇮🇳' },
                ].map(({ id, label, flag }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedLang(id)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                      selectedLang === id
                        ? 'bg-primary-container text-on-primary shadow-ambient'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span>{flag}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp Template */}
            <div className="px-4 py-4 border-b border-outline-variant/10">
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                {t(lang, 'whatsappTemplate')}
              </label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className={`${inputClass} resize-none h-24 text-sm`}
                placeholder={DEFAULT_TEMPLATE}
              />
              <div className="flex items-start gap-1.5 mt-1.5">
                <Info size={11} className="text-on-surface-variant mt-0.5 shrink-0" />
                <p className="text-[11px] text-on-surface-variant">{t(lang, 'templateHint')}</p>
              </div>
              {/* Preview */}
              {template && (
                <div className="mt-2 px-3 py-2.5 bg-[#25D366]/10 rounded-lg">
                  <p className="text-[11px] font-bold text-[#25D366] mb-1 flex items-center gap-1">
                    <MessageCircle size={11} /> Preview
                  </p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {template
                      .replace('{ShopName}', shopName || 'My Shop')
                      .replace('{Amount}', '1,500')}
                  </p>
                </div>
              )}
            </div>

            {/* Save button */}
            <div className="px-4 py-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold rounded-xl shadow-ambient active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {saving ? t(lang, 'loading') : t(lang, 'save')}
              </button>
            </div>
          </form>
        </section>

        {/* ── Data Management ── */}
        <section>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1 mb-2">
            {t(lang, 'dataManagement')}
          </p>
          <div className={sectionClass}>
            {/* Export */}
            <button
              onClick={handleExport}
              className={`${rowClass} w-full active:bg-surface-container-high transition-colors`}
            >
              <div className="w-9 h-9 rounded-xl bg-secondary-container flex items-center justify-center shrink-0">
                <Download size={16} className="text-on-secondary-container" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-on-surface">{t(lang, 'exportData')}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {t(lang, 'lastBackup')}{' '}
                  {lastBackup
                    ? new Date(lastBackup).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : t(lang, 'never')}
                </p>
              </div>
              <ChevronRight size={16} className="text-on-surface-variant" />
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className={`${rowClass} w-full active:bg-surface-container-high transition-colors`}
            >
              <div className="w-9 h-9 rounded-xl bg-primary-fixed flex items-center justify-center shrink-0">
                <Upload size={16} className="text-on-primary-fixed" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-on-surface">{t(lang, 'importData')}</p>
                {importMsg && (
                  <p className="text-xs text-on-surface-variant mt-0.5">{importMsg}</p>
                )}
              </div>
              <ChevronRight size={16} className="text-on-surface-variant" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </section>

        {/* ── Account ── */}
        <section>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest px-1 mb-2">
            {t(lang, 'account')}
          </p>
          <div className={sectionClass}>
            <div className={rowClass}>
              <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center shrink-0 font-black text-primary-container">
                {(session?.user?.email || session?.user?.phone || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-on-surface">
                  {session?.user?.email || session?.user?.phone}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">Logged in</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className={`${rowClass} w-full active:bg-surface-container-high transition-colors`}
            >
              <div className="w-9 h-9 rounded-xl bg-error-container flex items-center justify-center shrink-0">
                <LogOut size={16} className="text-error" />
              </div>
              <p className="flex-1 text-left text-sm font-semibold text-error">
                {t(lang, 'signOut')}
              </p>
            </button>
          </div>
        </section>

        {/* App version */}
        <p className="text-center text-xs text-on-surface-variant pb-4">
          Khata Sangrah v1.0 · Made with ❤️ for Indian shopkeepers
        </p>
      </main>
    </div>
  );
}
