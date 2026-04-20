-- ============================================================
-- Seed Data (for development / testing)
-- Replace the UUIDs with real auth.users IDs after signup
-- ============================================================

-- Example: after running this, log in as demo@example.com / Demo1234!

-- NOTE: In production, do NOT run this. Users sign up via the app.
-- This seed is only for local Supabase dev environment.

-- Step 1: Insert a demo user into auth.users (only works in local Supabase)
-- The trigger will automatically create profile + default categories.

-- For local dev only:
-- supabase auth admin create-user --email demo@example.com --password Demo1234!

-- After the user exists, get their ID and run the inserts below.
-- Set the demo user ID:
DO $$
DECLARE
  demo_user_id UUID;
  cat_salary     UUID;
  cat_freelance  UUID;
  cat_food       UUID;
  cat_transport  UUID;
  cat_housing    UUID;
  cat_entertain  UUID;
  cat_shopping   UUID;
BEGIN
  -- This assumes the demo user was already created via Supabase Auth
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'Demo user not found. Create the user first via Supabase Auth.';
    RETURN;
  END IF;

  -- Get category IDs
  SELECT id INTO cat_salary    FROM public.categories WHERE user_id = demo_user_id AND name = 'Salary'         LIMIT 1;
  SELECT id INTO cat_freelance FROM public.categories WHERE user_id = demo_user_id AND name = 'Freelance'      LIMIT 1;
  SELECT id INTO cat_food      FROM public.categories WHERE user_id = demo_user_id AND name = 'Food & Dining'  LIMIT 1;
  SELECT id INTO cat_transport FROM public.categories WHERE user_id = demo_user_id AND name = 'Transportation' LIMIT 1;
  SELECT id INTO cat_housing   FROM public.categories WHERE user_id = demo_user_id AND name = 'Housing'        LIMIT 1;
  SELECT id INTO cat_entertain FROM public.categories WHERE user_id = demo_user_id AND name = 'Entertainment'  LIMIT 1;
  SELECT id INTO cat_shopping  FROM public.categories WHERE user_id = demo_user_id AND name = 'Shopping'       LIMIT 1;

  -- Seed transactions for the last 3 months
  INSERT INTO public.transactions (user_id, category_id, type, amount, description, date, source) VALUES
    -- April 2026 (current month)
    (demo_user_id, cat_salary,    'income',   5000.00, 'Monthly salary',          '2026-04-01', 'web'),
    (demo_user_id, cat_freelance, 'income',    800.00, 'Client project payment',  '2026-04-05', 'web'),
    (demo_user_id, cat_food,      'expense',    85.50, 'Grocery shopping',        '2026-04-03', 'web'),
    (demo_user_id, cat_food,      'expense',    42.00, 'Restaurant dinner',       '2026-04-07', 'telegram'),
    (demo_user_id, cat_transport, 'expense',    55.00, 'Monthly transit pass',    '2026-04-01', 'web'),
    (demo_user_id, cat_housing,   'expense',  1200.00, 'Rent April',              '2026-04-01', 'web'),
    (demo_user_id, cat_entertain, 'expense',    25.00, 'Netflix subscription',    '2026-04-05', 'web'),
    (demo_user_id, cat_shopping,  'expense',   135.00, 'Clothing purchase',       '2026-04-10', 'web'),
    (demo_user_id, cat_food,      'expense',    18.50, 'Coffee & pastries',       '2026-04-12', 'telegram'),
    (demo_user_id, cat_transport, 'expense',    32.00, 'Uber rides',              '2026-04-14', 'web'),

    -- March 2026
    (demo_user_id, cat_salary,    'income',   5000.00, 'Monthly salary',          '2026-03-01', 'web'),
    (demo_user_id, cat_freelance, 'income',   1200.00, 'Website development',     '2026-03-15', 'web'),
    (demo_user_id, cat_food,      'expense',    92.30, 'Grocery shopping',        '2026-03-04', 'web'),
    (demo_user_id, cat_food,      'expense',    65.00, 'Business lunch',          '2026-03-10', 'web'),
    (demo_user_id, cat_transport, 'expense',    55.00, 'Monthly transit pass',    '2026-03-01', 'web'),
    (demo_user_id, cat_housing,   'expense',  1200.00, 'Rent March',              '2026-03-01', 'web'),
    (demo_user_id, cat_entertain, 'expense',    15.00, 'Spotify subscription',    '2026-03-05', 'web'),
    (demo_user_id, cat_entertain, 'expense',    45.00, 'Cinema tickets x2',       '2026-03-18', 'telegram'),
    (demo_user_id, cat_shopping,  'expense',   280.00, 'Electronics accessories', '2026-03-22', 'web'),
    (demo_user_id, cat_food,      'expense',    38.00, 'Weekend brunch',          '2026-03-28', 'telegram'),

    -- February 2026
    (demo_user_id, cat_salary,    'income',   5000.00, 'Monthly salary',          '2026-02-01', 'web'),
    (demo_user_id, cat_food,      'expense',    78.90, 'Grocery shopping',        '2026-02-03', 'web'),
    (demo_user_id, cat_food,      'expense',    55.00, 'Valentine dinner',        '2026-02-14', 'web'),
    (demo_user_id, cat_transport, 'expense',    55.00, 'Monthly transit pass',    '2026-02-01', 'web'),
    (demo_user_id, cat_housing,   'expense',  1200.00, 'Rent February',           '2026-02-01', 'web'),
    (demo_user_id, cat_entertain, 'expense',    25.00, 'Netflix subscription',    '2026-02-05', 'web'),
    (demo_user_id, cat_shopping,  'expense',   190.00, 'Winter jacket',           '2026-02-10', 'web'),
    (demo_user_id, cat_transport, 'expense',    48.00, 'Taxi rides',              '2026-02-20', 'telegram');

  RAISE NOTICE 'Seed data inserted for user: %', demo_user_id;
END;
$$;
