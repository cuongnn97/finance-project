-- ============================================================
-- Dữ liệu mẫu (cho phát triển / kiểm thử)
-- Thay UUID bằng ID thật từ auth.users sau khi đăng ký
-- ============================================================

-- Ví dụ: sau khi chạy, đăng nhập bằng demo@example.com / Demo1234!

-- LƯU Ý: Trong production, KHÔNG chạy file này. Người dùng đăng ký qua app.
-- Seed này chỉ dùng cho môi trường Supabase local.

-- Bước 1: Tạo user demo trong auth.users (chỉ hoạt động trên Supabase local)
-- Trigger sẽ tự động tạo profile + danh mục mặc định.

-- Chỉ dùng cho local dev:
-- supabase auth admin create-user --email demo@example.com --password Demo1234!

-- Sau khi user tồn tại, lấy ID và chạy các lệnh INSERT bên dưới.
DO $
DECLARE
  demo_user_id UUID;
  cat_luong      UUID;
  cat_freelance  UUID;
  cat_anuong     UUID;
  cat_dichuyen   UUID;
  cat_nhao       UUID;
  cat_giaitri    UUID;
  cat_muasam     UUID;
BEGIN
  -- Giả sử user demo đã được tạo qua Supabase Auth
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@example.com' LIMIT 1;

  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'Không tìm thấy user demo. Hãy tạo user trước qua Supabase Auth.';
    RETURN;
  END IF;

  -- Lấy ID danh mục
  SELECT id INTO cat_luong     FROM public.categories WHERE user_id = demo_user_id AND name = 'Lương'           LIMIT 1;
  SELECT id INTO cat_freelance FROM public.categories WHERE user_id = demo_user_id AND name = 'Freelance'       LIMIT 1;
  SELECT id INTO cat_anuong    FROM public.categories WHERE user_id = demo_user_id AND name = 'Ăn uống'         LIMIT 1;
  SELECT id INTO cat_dichuyen  FROM public.categories WHERE user_id = demo_user_id AND name = 'Di chuyển'       LIMIT 1;
  SELECT id INTO cat_nhao      FROM public.categories WHERE user_id = demo_user_id AND name = 'Nhà ở'           LIMIT 1;
  SELECT id INTO cat_giaitri   FROM public.categories WHERE user_id = demo_user_id AND name = 'Giải trí'        LIMIT 1;
  SELECT id INTO cat_muasam    FROM public.categories WHERE user_id = demo_user_id AND name = 'Mua sắm'         LIMIT 1;

  -- Seed giao dịch 3 tháng gần nhất
  INSERT INTO public.transactions (user_id, category_id, type, amount, description, date, source) VALUES
    -- Tháng 4/2026 (tháng hiện tại)
    (demo_user_id, cat_luong,     'income',   15000000, 'Lương tháng 4',           '2026-04-01', 'web'),
    (demo_user_id, cat_freelance, 'income',    3000000, 'Dự án thiết kế web',      '2026-04-05', 'web'),
    (demo_user_id, cat_anuong,    'expense',    250000, 'Đi chợ cuối tuần',        '2026-04-03', 'web'),
    (demo_user_id, cat_anuong,    'expense',    120000, 'Ăn tối nhà hàng',         '2026-04-07', 'telegram'),
    (demo_user_id, cat_dichuyen,  'expense',    200000, 'Xăng xe tháng 4',         '2026-04-01', 'web'),
    (demo_user_id, cat_nhao,      'expense',   5000000, 'Tiền nhà tháng 4',        '2026-04-01', 'web'),
    (demo_user_id, cat_giaitri,   'expense',     79000, 'Netflix tháng 4',         '2026-04-05', 'web'),
    (demo_user_id, cat_muasam,    'expense',    450000, 'Mua quần áo',             '2026-04-10', 'web'),
    (demo_user_id, cat_anuong,    'expense',     55000, 'Cà phê và bánh ngọt',     '2026-04-12', 'telegram'),
    (demo_user_id, cat_dichuyen,  'expense',    150000, 'Grab trong tuần',         '2026-04-14', 'web'),

    -- Tháng 3/2026
    (demo_user_id, cat_luong,     'income',   15000000, 'Lương tháng 3',           '2026-03-01', 'web'),
    (demo_user_id, cat_freelance, 'income',    5000000, 'Phát triển website',      '2026-03-15', 'web'),
    (demo_user_id, cat_anuong,    'expense',    280000, 'Đi chợ cuối tuần',        '2026-03-04', 'web'),
    (demo_user_id, cat_anuong,    'expense',    200000, 'Ăn trưa công việc',       '2026-03-10', 'web'),
    (demo_user_id, cat_dichuyen,  'expense',    200000, 'Xăng xe tháng 3',         '2026-03-01', 'web'),
    (demo_user_id, cat_nhao,      'expense',   5000000, 'Tiền nhà tháng 3',        '2026-03-01', 'web'),
    (demo_user_id, cat_giaitri,   'expense',     59000, 'Spotify tháng 3',         '2026-03-05', 'web'),
    (demo_user_id, cat_giaitri,   'expense',    160000, 'Vé xem phim x2',         '2026-03-18', 'telegram'),
    (demo_user_id, cat_muasam,    'expense',    800000, 'Phụ kiện điện tử',        '2026-03-22', 'web'),
    (demo_user_id, cat_anuong,    'expense',    120000, 'Brunch cuối tuần',        '2026-03-28', 'telegram'),

    -- Tháng 2/2026
    (demo_user_id, cat_luong,     'income',   15000000, 'Lương tháng 2',           '2026-02-01', 'web'),
    (demo_user_id, cat_anuong,    'expense',    230000, 'Đi chợ cuối tuần',        '2026-02-03', 'web'),
    (demo_user_id, cat_anuong,    'expense',    350000, 'Ăn tối Valentine',        '2026-02-14', 'web'),
    (demo_user_id, cat_dichuyen,  'expense',    200000, 'Xăng xe tháng 2',         '2026-02-01', 'web'),
    (demo_user_id, cat_nhao,      'expense',   5000000, 'Tiền nhà tháng 2',        '2026-02-01', 'web'),
    (demo_user_id, cat_giaitri,   'expense',     79000, 'Netflix tháng 2',         '2026-02-05', 'web'),
    (demo_user_id, cat_muasam,    'expense',    600000, 'Áo khoác mùa đông',      '2026-02-10', 'web'),
    (demo_user_id, cat_dichuyen,  'expense',    180000, 'Taxi trong tuần',         '2026-02-20', 'telegram');

  RAISE NOTICE 'Đã thêm dữ liệu mẫu cho user: %', demo_user_id;
END;
$;
