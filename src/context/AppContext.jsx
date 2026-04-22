import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  // ── Auth ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setCustomers([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      setLang(data.language_preference || 'en');
      localStorage.setItem('lang', data.language_preference || 'en');
    }
    setLoading(false);
  }

  // ── Customers ─────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('customer_balances')
      .select('*')
      .eq('shop_id', session.user.id)
      .order('name');
    setCustomers(data || []);
  }, [session]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // ── Profile update ────────────────────────────────────
  async function updateProfile(updates) {
    if (!session) return;
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (!error && data) {
      setProfile(data);
      if (updates.language_preference) {
        setLang(updates.language_preference);
        localStorage.setItem('lang', updates.language_preference);
      }
    }
    return { data, error };
  }

  // ── Customer CRUD ─────────────────────────────────────
  async function addCustomer(name, mobile_no) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ shop_id: session.user.id, name, mobile_no: mobile_no || null })
      .select()
      .single();
    if (!error) await fetchCustomers();
    return { data, error };
  }

  async function updateCustomer(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (!error) await fetchCustomers();
    return { data, error };
  }

  async function deleteCustomer(id) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (!error) await fetchCustomers();
    return { error };
  }

  // ── Transactions ──────────────────────────────────────
  async function addTransaction(customerId, type, amount_paise, description, image_urls = []) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ customer_id: customerId, type, amount_paise, description: description || null, image_urls })
      .select()
      .single();
    if (!error) await fetchCustomers();
    return { data, error };
  }

  async function deleteTransaction(id, customerId) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) await fetchCustomers();
    return { error };
  }

  async function getTransactions(customerId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });
    return { data: data || [], error };
  }

  // ── Computed totals ───────────────────────────────────
  const totalPaise = customers.reduce((sum, c) => {
    return sum + Math.max(0, Number(c.balance_paise) || 0);
  }, 0);

  const value = {
    session, profile, customers, loading, lang,
    totalPaise,
    fetchCustomers, loadProfile,
    updateProfile, addCustomer, updateCustomer, deleteCustomer,
    addTransaction, deleteTransaction, getTransactions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
