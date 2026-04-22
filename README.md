# 📒 Khata Sangrah — खाता संग्रह
### Production-Ready PWA Digital Ledger for Indian Shopkeepers

---

## 🏗️ Architecture Overview

```
khata-sangrah/
├── public/
│   ├── index.html              # PWA meta tags, viewport
│   ├── manifest.json           # PWA install manifest
│   ├── service-worker.js       # Offline caching (Cache-First + Network-First)
│   └── icons/
│       ├── icon-192.png        # PWA icon (maskable)
│       └── icon-512.png        # PWA icon large
├── src/
│   ├── index.js                # React entry point
│   ├── index.css               # Tailwind + global styles
│   ├── App.jsx                 # Router shell + PWA install banner
│   ├── context/
│   │   └── AppContext.jsx      # Global state: auth, customers, transactions
│   ├── lib/
│   │   ├── supabase.js         # Supabase client, currency utils, export/import
│   │   └── i18n.js             # English / Hindi translations
│   └── components/
│       ├── auth/
│       │   └── AuthPage.jsx    # OTP + Email + Google OAuth
│       ├── common/
│       │   └── BottomNav.jsx   # Tab bar with active pill indicator
│       ├── home/
│       │   └── HomePage.jsx    # Dashboard: hero card + recent records
│       ├── customers/
│       │   ├── CustomersPage.jsx   # Search, sort, customer list
│       │   └── AddCustomerModal.jsx
│       ├── ledger/
│       │   ├── LedgerPage.jsx       # Transaction history + running balance
│       │   └── AddTransactionModal.jsx  # Udhaar/Jama entry with image upload
│       └── settings/
│           └── SettingsPage.jsx  # Profile, language, WhatsApp, backup
├── supabase_schema.sql         # Full DB schema with RLS policies
├── tailwind.config.js          # Design token colors from DESIGN.md
├── postcss.config.js
└── .env.example                # Environment variable template
```

---

## 🚀 Setup Guide

### Step 1 — Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon/public key** from Settings → API

### Step 2 — Initialize Database
1. In Supabase, go to **SQL Editor**
2. Paste and run the contents of `supabase_schema.sql`
3. This creates: `profiles`, `customers`, `transactions` tables + `customer_balances` view + RLS policies

### Step 3 — Enable Auth Providers
In Supabase → Authentication → Providers:
- ✅ **Email** — enable "Confirm email" (optional for dev)
- ✅ **Phone** — requires a Twilio or other SMS provider for OTP
- ✅ **Google** — add your OAuth Client ID and Secret

### Step 4 — Create Storage Bucket
In Supabase → Storage:
1. Create a bucket named `bill-images`
2. Set it to **Private** (not public)
3. Uncomment and run the storage RLS policies from `supabase_schema.sql`

### Step 5 — Configure Environment
```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key
```

### Step 6 — Install & Run
```bash
npm install
npm start
```

### Step 7 — Build for Production
```bash
npm run build
# Deploy the build/ folder to Vercel, Netlify, Firebase Hosting, etc.
```

---

## 💡 Key Technical Decisions

### Currency Precision — Paise Storage
All monetary amounts are stored as **integers in paise** (1 ₹ = 100 paise) to completely eliminate IEEE-754 floating-point rounding errors.

```js
// WRONG — floating point bug:
0.1 + 0.2 === 0.30000000000000004

// CORRECT — integer paise:
10 + 20 === 30  ✓
```
The `rupeesToPaise()` and `paiseToRupees()` helpers in `src/lib/supabase.js` handle all conversions.

### Running Balance Calculation
The `LedgerPage` computes a running balance **client-side** by iterating transactions in chronological order:
```js
let running = 0;
transactions.map(tx => {
  if (tx.type === 'udhaar') running += tx.amount_paise;
  else running -= tx.amount_paise;
  return { ...tx, runningBalance: running };
});
```
Deleting any transaction automatically triggers `fetchCustomers()` which re-queries the `customer_balances` Postgres view, ensuring the total is always accurate.

### Real-time Balance via Postgres View
The `customer_balances` view in Supabase computes live balances:
```sql
SUM(CASE WHEN type='udhaar' THEN amount_paise ELSE -amount_paise END)
```
This is the single source of truth for the balance shown on the customer list and ledger header.

### PWA Service Worker Strategy
| Request Type | Strategy | Rationale |
|---|---|---|
| Navigation (HTML) | Network-first → fallback to `/index.html` | Always fresh shell |
| Static JS/CSS/fonts | Cache-first | Immutable build artifacts |
| Supabase API | Network-first (30s timeout) | Data freshness |
| Images | Cache-first | Perf for bill thumbnails |

---

## 🎨 Design System (from DESIGN.md)

| Token | Value | Usage |
|---|---|---|
| `primary-container` | `#075e54` | CTAs, active nav, primary brand |
| `tertiary-container` | `#a90c12` | Udhaar (credit/debt) — crimson |
| `secondary` | `#006d3b` | Jama (payment) — deep green |
| `surface` | `#f9f9f9` | Page background |
| `surface-container-lowest` | `#ffffff` | Cards |

**Rules:**
- No 1px borders — use background color shifts for separation
- Shadows: `0 24px 24px -4px rgba(26,28,28,0.06)` (ambient, diffuse)
- All typography: `Inter` — bold display (`font-black`) for currency amounts
- Glassmorphism on floating elements (bottom nav, modals)

---

## 📲 WhatsApp Integration

Settings allows customizing the reminder template with `{ShopName}` and `{Amount}` variables.

**Default (Hinglish):**
> Namaste! {ShopName} se yaad dilaya ja raha hai ki aapka ₹{Amount} ka udhaar pending hai. Please jaldi clear karein.

The WhatsApp button uses the `wa.me` URL scheme:
```
https://wa.me/91XXXXXXXXXX?text=<encoded message>
```

---

## 💾 Data Backup System

### Export to JSON
Downloads a full backup file: `khata-sangrah-backup-YYYY-MM-DD.json`
- Includes all customers and their complete transaction history
- Updates `last_backup_at` in the `profiles` table and `localStorage`

### Weekly Reminder Banner
Shown in Settings when `Date.now() - lastBackupAt > 7 days`

### Import from JSON
Upserts customers and transactions by `id`, so re-importing is safe (no duplicates).

---

## 🔐 Security

- **Row Level Security (RLS)** on all tables — users can only access their own shop's data
- **Profile auto-creation** on signup via Postgres trigger
- **Storage policies** restrict bill image access to the owning user
- **Anon key only** in frontend — never expose the service role key

---

## 📱 PWA Installation

### Android (Chrome)
Browser shows "Add to Home Screen" banner automatically via `beforeinstallprompt`.

### iOS (Safari)
1. Open in Safari
2. Tap Share → "Add to Home Screen"

The `manifest.json` includes `"display": "standalone"` so the app runs without browser chrome once installed.
