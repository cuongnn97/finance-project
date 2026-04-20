import { format, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "../lib/supabase.js";
import type {
  Profile,
  Category,
  Transaction,
  ParsedTransaction,
  BalanceSummary,
} from "../types/index.js";

// ============================================================
// Profile
// ============================================================

export async function getProfileByChatId(
  chatId: number,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function linkTelegramAccount(
  userId: string,
  chatId: number,
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId })
    .eq("id", userId);

  return !error;
}

// ============================================================
// Categories
// ============================================================

export async function getCategoriesByType(
  userId: string,
  type: "income" | "expense",
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("name", { ascending: true });

  if (error) return [];
  return (data ?? []) as Category[];
}

export async function matchCategory(
  userId: string,
  type: "income" | "expense",
  description: string,
): Promise<Category | null> {
  const categories = await getCategoriesByType(userId, type);
  if (!categories.length) return null;

  const lower = description.toLowerCase();

  // 1. Exact category name match
  const exact = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (exact) return exact;

  // 2. Keyword-based matching
  const matched = matchByKeywords(lower, categories);
  if (matched) return matched;

  // 3. Fallback: "Chi phí khác" / "Thu nhập khác" or first category
  const fallbackNames =
    type === "expense"
      ? ["chi phí khác", "khác", "other"]
      : ["thu nhập khác", "khác", "other"];
  const defaultCat = categories.find((c) =>
    fallbackNames.some((name) => c.name.toLowerCase().includes(name)),
  );
  return defaultCat ?? categories[0];
}

// ── Keyword mapping for smart category detection ────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Expense categories
  "ăn uống": [
    "cà phê",
    "cafe",
    "coffee",
    "trà sữa",
    "boba",
    "ăn",
    "cơm",
    "phở",
    "bún",
    "bánh mì",
    "bánh",
    "chè",
    "kem",
    "pizza",
    "burger",
    "gà",
    "lẩu",
    "nướng",
    "sushi",
    "đồ ăn",
    "đồ uống",
    "bia",
    "rượu",
    "nước",
    "chợ",
    "siêu thị",
    "thực phẩm",
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "groceries",
    "restaurant",
    "quán",
    "nhà hàng",
    "buffet",
    "snack",
    "trái cây",
    "rau",
    "thịt",
    "cá",
    "sữa",
    "mì",
    "bắp",
    "xôi",
    "hủ tiếu",
    "cháo",
  ],
  "di chuyển": [
    "grab",
    "taxi",
    "uber",
    "gojek",
    "be",
    "xăng",
    "đổ xăng",
    "gửi xe",
    "bãi xe",
    "vé xe",
    "xe buýt",
    "bus",
    "tàu",
    "metro",
    "máy bay",
    "vé máy bay",
    "toll",
    "phí cầu đường",
    "sửa xe",
    "rửa xe",
    "bảo dưỡng",
    "parking",
    "xe ôm",
    "ship",
    "giao hàng",
    "vận chuyển",
  ],
  "nhà ở": [
    "tiền nhà",
    "thuê nhà",
    "rent",
    "điện",
    "nước",
    "internet",
    "wifi",
    "gas",
    "chung cư",
    "phí quản lý",
    "sửa nhà",
    "đồ gia dụng",
    "nội thất",
    "dọn nhà",
    "giặt",
    "giặt ủi",
  ],
  "giải trí": [
    "phim",
    "cinema",
    "movie",
    "netflix",
    "spotify",
    "youtube",
    "game",
    "karaoke",
    "bar",
    "club",
    "concert",
    "show",
    "du lịch",
    "travel",
    "khách sạn",
    "hotel",
    "resort",
    "vé",
    "ticket",
    "nhạc",
    "music",
    "sách",
    "truyện",
    "manga",
  ],
  "mua sắm": [
    "quần áo",
    "áo",
    "quần",
    "giày",
    "dép",
    "túi",
    "balo",
    "đồng hồ",
    "trang sức",
    "mỹ phẩm",
    "son",
    "kem chống nắng",
    "nước hoa",
    "shopping",
    "shopee",
    "lazada",
    "tiki",
    "amazon",
    "online",
    "phụ kiện",
    "điện thoại",
    "laptop",
    "tai nghe",
    "sạc",
    "ốp lưng",
    "đồ điện tử",
    "máy tính",
  ],
  "sức khỏe": [
    "thuốc",
    "bệnh viện",
    "khám",
    "bác sĩ",
    "nha khoa",
    "răng",
    "mắt",
    "kính",
    "gym",
    "tập",
    "yoga",
    "vitamin",
    "thực phẩm chức năng",
    "bảo hiểm y tế",
    "xét nghiệm",
    "phẫu thuật",
  ],
  "giáo dục": [
    "học phí",
    "học",
    "khóa học",
    "course",
    "sách",
    "book",
    "udemy",
    "coursera",
    "gia sư",
    "lớp",
    "trường",
    "đào tạo",
    "chứng chỉ",
    "thi",
    "exam",
  ],
  "hóa đơn": [
    "hóa đơn",
    "bill",
    "thuế",
    "phí",
    "bảo hiểm",
    "trả góp",
    "subscription",
    "đăng ký",
    "gia hạn",
    "phạt",
    "nợ",
    "điện thoại",
    "sim",
    "4g",
    "5g",
  ],

  // Income categories
  lương: ["lương", "salary", "wage", "pay"],
  freelance: [
    "freelance",
    "dự án",
    "project",
    "client",
    "khách hàng",
    "hợp đồng",
    "contract",
    "thiết kế",
    "design",
    "code",
    "dev",
    "website",
    "app",
    "consulting",
  ],
  "đầu tư": [
    "cổ tức",
    "dividend",
    "lãi",
    "interest",
    "đầu tư",
    "invest",
    "chứng khoán",
    "stock",
    "crypto",
    "bitcoin",
    "tiết kiệm",
  ],
  "thu nhập khác": [
    "thưởng",
    "bonus",
    "hoàn tiền",
    "refund",
    "bán",
    "sold",
    "sale",
    "cho thuê",
    "hoa hồng",
    "commission",
    "tip",
    "quà",
  ],
};

function matchByKeywords(
  description: string,
  categories: Category[],
): Category | null {
  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    const keywords = CATEGORY_KEYWORDS[catNameLower];
    if (!keywords) continue;

    const found = keywords.some((kw) => description.includes(kw));
    if (found) return cat;
  }
  return null;
}

// ============================================================
// Transactions
// ============================================================

export async function createTransaction(
  profile: Profile,
  parsed: ParsedTransaction,
  categoryId: string | null,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: profile.id,
      category_id: categoryId,
      type: parsed.type,
      amount: parsed.amount,
      description: parsed.description,
      date: parsed.date,
      source: "telegram",
    })
    .select()
    .single();

  if (error) throw error;
  return data as Transaction;
}

// ============================================================
// Balance / Reports
// ============================================================

export async function getMonthlyBalance(
  userId: string,
  date = new Date(),
): Promise<BalanceSummary> {
  const from = format(startOfMonth(date), "yyyy-MM-dd");
  const to = format(endOfMonth(date), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to);

  if (error) throw error;

  const rows = (data ?? []) as Array<{ type: string; amount: number }>;
  const total_income = rows
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount, 0);
  const total_expense = rows
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount, 0);

  return { total_income, total_expense, balance: total_income - total_expense };
}

export async function getRecentTransactions(
  userId: string,
  limit = 5,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Transaction[];
}
