-- =========================================================
-- KHATA SANGRAH - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- TABLE: profiles
-- One profile per authenticated user (one shop per account)
-- =========================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  shop_name TEXT NOT NULL DEFAULT 'My Shop',
  owner_mobile TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'hi')),
  whatsapp_template TEXT NOT NULL DEFAULT 'Namaste! {ShopName} se yaad dilaya ja raha hai ki aapka ₹{Amount} ka udhaar pending hai. Please jaldi clear karein.',
  last_backup_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =========================================================
-- TABLE: customers
-- Customers belonging to a shop (profile)
-- =========================================================
CREATE TABLE customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  mobile_no TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_customers_shop_id ON customers(shop_id);
CREATE INDEX idx_customers_name ON customers(name);

-- =========================================================
-- TABLE: transactions
-- Udhaar (credit) or Jama (payment) per customer
-- amount stored in PAISE (integer) to avoid floating-point errors
-- =========================================================
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('udhaar', 'jama')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0), -- stored in paise (1 rupee = 100 paise)
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- =========================================================
-- VIEW: customer_balances
-- Real-time balance calculation per customer
-- Returns balance in paise
-- =========================================================
CREATE OR REPLACE VIEW customer_balances AS
SELECT
  c.id AS customer_id,
  c.shop_id,
  c.name,
  c.mobile_no,
  c.created_at,
  COALESCE(
    SUM(
      CASE
        WHEN t.type = 'udhaar' THEN t.amount_paise
        WHEN t.type = 'jama' THEN -t.amount_paise
        ELSE 0
      END
    ), 0
  ) AS balance_paise
FROM customers c
LEFT JOIN transactions t ON t.customer_id = c.id
GROUP BY c.id, c.shop_id, c.name, c.mobile_no, c.created_at;

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Profiles: users can only see/edit their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Customers: users can only see customers belonging to their shop
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select_own" ON customers FOR SELECT
  USING (shop_id = auth.uid());
CREATE POLICY "customers_insert_own" ON customers FOR INSERT
  WITH CHECK (shop_id = auth.uid());
CREATE POLICY "customers_update_own" ON customers FOR UPDATE
  USING (shop_id = auth.uid());
CREATE POLICY "customers_delete_own" ON customers FOR DELETE
  USING (shop_id = auth.uid());

-- Transactions: users can only see transactions for their customers
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id AND c.shop_id = auth.uid()
    )
  );
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id AND c.shop_id = auth.uid()
    )
  );
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id AND c.shop_id = auth.uid()
    )
  );
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = transactions.customer_id AND c.shop_id = auth.uid()
    )
  );

-- =========================================================
-- FUNCTION: auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, owner_mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'shop_name', 'My Shop'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =========================================================
-- STORAGE: bill-images bucket
-- Run separately in Storage section or here
-- =========================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('bill-images', 'bill-images', false);
-- 
-- CREATE POLICY "bill_images_select" ON storage.objects FOR SELECT
--   USING (bucket_id = 'bill-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "bill_images_insert" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'bill-images' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "bill_images_delete" ON storage.objects FOR DELETE
--   USING (bucket_id = 'bill-images' AND auth.uid()::text = (storage.foldername(name))[1]);
