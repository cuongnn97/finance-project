-- ============================================================
-- Personal Finance Manager - Database Schema
-- PostgreSQL / Supabase
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id          UUID         REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT         NOT NULL,
  full_name   TEXT,
  telegram_chat_id BIGINT  UNIQUE,
  currency    TEXT         NOT NULL DEFAULT 'USD',
  timezone    TEXT         NOT NULL DEFAULT 'UTC',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE public.categories (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name        TEXT         NOT NULL,
  type        TEXT         NOT NULL CHECK (type IN ('income', 'expense')),
  color       TEXT         NOT NULL DEFAULT '#6366f1',
  icon        TEXT         NOT NULL DEFAULT 'circle',
  is_default  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, type)
);

-- Transactions
CREATE TABLE public.transactions (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID         REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID         REFERENCES public.categories(id) ON DELETE SET NULL,
  type        TEXT         NOT NULL CHECK (type IN ('income', 'expense')),
  amount      DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  date        DATE         NOT NULL DEFAULT CURRENT_DATE,
  source      TEXT         NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_transactions_user_id      ON public.transactions(user_id);
CREATE INDEX idx_transactions_date         ON public.transactions(date DESC);
CREATE INDEX idx_transactions_type         ON public.transactions(type);
CREATE INDEX idx_transactions_category_id  ON public.transactions(category_id);
CREATE INDEX idx_transactions_user_date    ON public.transactions(user_id, date DESC);
CREATE INDEX idx_categories_user_id        ON public.categories(user_id);
CREATE INDEX idx_profiles_telegram         ON public.profiles(telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories
CREATE POLICY "categories_select_own" ON public.categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON public.categories
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  PERFORM public.create_default_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create default categories for a new user
CREATE OR REPLACE FUNCTION public.create_default_categories(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon, is_default) VALUES
    (p_user_id, 'Salary',          'income',  '#10b981', 'briefcase',    true),
    (p_user_id, 'Freelance',       'income',  '#3b82f6', 'laptop',       true),
    (p_user_id, 'Investment',      'income',  '#8b5cf6', 'trending-up',  true),
    (p_user_id, 'Other Income',    'income',  '#f59e0b', 'plus-circle',  true),
    (p_user_id, 'Food & Dining',   'expense', '#ef4444', 'utensils',     true),
    (p_user_id, 'Transportation',  'expense', '#f97316', 'car',          true),
    (p_user_id, 'Housing',         'expense', '#06b6d4', 'home',         true),
    (p_user_id, 'Entertainment',   'expense', '#ec4899', 'film',         true),
    (p_user_id, 'Shopping',        'expense', '#84cc16', 'shopping-bag', true),
    (p_user_id, 'Healthcare',      'expense', '#14b8a6', 'heart',        true),
    (p_user_id, 'Education',       'expense', '#6366f1', 'book-open',    true),
    (p_user_id, 'Utilities',       'expense', '#78716c', 'zap',          true),
    (p_user_id, 'Other Expense',   'expense', '#6b7280', 'minus-circle', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get monthly balance summary
CREATE OR REPLACE FUNCTION public.get_monthly_balance(
  p_user_id UUID,
  p_year    INT,
  p_month   INT
)
RETURNS TABLE(
  total_income  DECIMAL,
  total_expense DECIMAL,
  balance       DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS balance
  FROM public.transactions
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR  FROM date) = p_year
    AND EXTRACT(MONTH FROM date) = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.monthly_summary AS
SELECT
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE AS month,
  t.type,
  SUM(t.amount)  AS total,
  COUNT(*)::INT  AS transaction_count
FROM public.transactions t
GROUP BY t.user_id, DATE_TRUNC('month', t.date), t.type;

CREATE OR REPLACE VIEW public.category_spending AS
SELECT
  t.user_id,
  t.category_id,
  c.name  AS category_name,
  c.color AS category_color,
  c.icon  AS category_icon,
  t.type,
  DATE_TRUNC('month', t.date)::DATE AS month,
  SUM(t.amount)  AS total,
  COUNT(*)::INT  AS transaction_count
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
GROUP BY t.user_id, t.category_id, c.name, c.color, c.icon, t.type, DATE_TRUNC('month', t.date);

-- ============================================================
-- SERVICE ROLE GRANTS (for Telegram bot)
-- ============================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL   ON public.profiles     TO service_role;
GRANT ALL   ON public.categories   TO service_role;
GRANT ALL   ON public.transactions TO service_role;
GRANT SELECT ON public.monthly_summary   TO service_role;
GRANT SELECT ON public.category_spending TO service_role;
