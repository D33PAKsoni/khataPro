import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// =========================================================
// CURRENCY UTILITIES
// All amounts stored as paise (integers) to avoid float errors
// =========================================================

/** Convert rupees (float string or number) to paise (integer) */
export function rupeesToPaise(rupees) {
  const parsed = parseFloat(String(rupees).replace(/,/g, ''));
  if (isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/** Convert paise (integer) to rupees display string */
export function paiseToRupees(paise) {
  if (paise === null || paise === undefined) return '0.00';
  const rupees = Math.abs(paise) / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Format paise with ₹ prefix */
export function formatCurrency(paise) {
  return `₹${paiseToRupees(paise)}`;
}

// =========================================================
// DATE UTILITIES
// =========================================================
export function formatDate(dateStr, lang = 'en') {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (txDate.getTime() === today.getTime()) {
    return lang === 'hi' ? `आज, ${timeStr}` : `Today, ${timeStr}`;
  } else if (txDate.getTime() === yesterday.getTime()) {
    return lang === 'hi' ? `कल, ${timeStr}` : `Yesterday, ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) + `, ${timeStr}`;
  }
}

export function formatDateSeparator(dateStr, lang = 'en') {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (txDate.getTime() === today.getTime()) {
    return lang === 'hi' ? 'आज' : 'Today';
  } else if (txDate.getTime() === yesterday.getTime()) {
    return lang === 'hi' ? 'कल' : 'Yesterday';
  } else {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}

// =========================================================
// EXPORT / IMPORT JSON BACKUP
// =========================================================
export async function exportToJSON(userId) {
  const [profileRes, customersRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('customers').select('*, transactions(*)').eq('shop_id', userId),
  ]);

  const backup = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    shop: profileRes.data,
    customers: customersRes.data || [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `khata-sangrah-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Update last_backup_at
  await supabase.from('profiles').update({ last_backup_at: new Date().toISOString() }).eq('id', userId);

  // Persist locally
  localStorage.setItem('lastBackupAt', new Date().toISOString());
  return backup;
}

export async function importFromJSON(file, userId) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.version || !data.customers) {
          throw new Error('Invalid backup format');
        }

        const results = { imported: 0, skipped: 0, errors: [] };

        for (const customer of data.customers) {
          const { transactions, ...customerData } = customer;
          // Upsert customer
          const { data: cust, error: cErr } = await supabase
            .from('customers')
            .upsert({ ...customerData, shop_id: userId }, { onConflict: 'id' })
            .select()
            .single();

          if (cErr) { results.errors.push(cErr.message); continue; }

          // Upsert transactions
          if (transactions?.length) {
            const { error: tErr } = await supabase
              .from('transactions')
              .upsert(transactions.map((t) => ({ ...t, customer_id: cust.id })), { onConflict: 'id' });
            if (tErr) results.errors.push(tErr.message);
            else results.imported += transactions.length;
          }
        }

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// =========================================================
// WHATSAPP INTEGRATION
// =========================================================
export function buildWhatsAppURL(mobile, template, shopName, amountPaise) {
  const amount = paiseToRupees(amountPaise);
  const message = template
    .replace('{ShopName}', shopName)
    .replace('{Amount}', amount);
  const phone = mobile.replace(/[^0-9]/g, '');
  const intlPhone = phone.startsWith('91') ? phone : `91${phone}`;
  return `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
}

// =========================================================
// SUPABASE STORAGE - Bill Images
// =========================================================

/**
 * Upload a bill image and return the STORAGE PATH (not a URL).
 * We store paths, not URLs, because:
 *  - Public URLs 404 on private buckets
 *  - Signed URLs expire, so we generate them fresh at view time
 */
export async function uploadBillImage(file, userId, customerId) {
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${userId}/${customerId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('bill-images')
    .upload(fileName, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  // Return the storage path, e.g. "userId/customerId/1234567890.jpg"
  return data.path;
}

/**
 * Generate a signed URL for a stored path. Valid for 1 hour.
 * Call this at view time — never store the signed URL itself.
 */
export async function getSignedUrl(path) {
  // Handle legacy entries that stored full URLs instead of paths
  if (path.startsWith('http')) {
    // Try to extract the path portion after /bill-images/
    const match = path.match(/\/bill-images\/(.+)/);
    if (match) path = decodeURIComponent(match[1]);
    else return path; // Can't parse — return as-is and hope for the best
  }

  const { data, error } = await supabase.storage
    .from('bill-images')
    .createSignedUrl(path, 60 * 60); // 1 hour expiry

  if (error) {
    console.error('[Storage] Failed to sign URL:', error.message);
    return null;
  }
  return data.signedUrl;
}

export async function deleteBillImage(path) {
  if (!path) return;
  // Handle legacy full URLs
  if (path.startsWith('http')) {
    const match = path.match(/\/bill-images\/(.+)/);
    if (match) path = decodeURIComponent(match[1]);
    else return;
  }
  await supabase.storage.from('bill-images').remove([path]);
}
