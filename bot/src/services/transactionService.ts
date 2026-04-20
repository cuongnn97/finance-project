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

  // ── Tầng 0: Exact category name match ──
  const exact = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (exact) return exact;

  // ── Tầng 1: History-based (học từ giao dịch cũ của user) ──
  const historyMatch = await matchByHistory(userId, type, lower, categories);
  if (historyMatch) return historyMatch;

  // ── Tầng 2: Keyword-based ──
  const keywordMatch = matchByKeywords(lower, categories);
  if (keywordMatch) return keywordMatch;

  // ── Tầng 2.5: LLM classification (OpenAI) ──
  const llmMatch = await matchByLLM(lower, categories);
  if (llmMatch) return llmMatch;

  // ── Tầng 3: Fuzzy matching (typo / thiếu dấu) ──
  const fuzzyMatch = matchByFuzzy(lower, categories);
  if (fuzzyMatch) return fuzzyMatch;

  // ── Tầng 4: Fallback ──
  const fallbackNames =
    type === "expense"
      ? ["chi phí khác", "khác", "other"]
      : ["thu nhập khác", "khác", "other"];
  const defaultCat = categories.find((c) =>
    fallbackNames.some((name) => c.name.toLowerCase().includes(name)),
  );
  return defaultCat ?? categories[0];
}

// ── Tầng 1: History-based matching ─────────────────────────
// Query giao dịch cũ của user có description tương tự,
// lấy category được dùng nhiều nhất cho description đó.

async function matchByHistory(
  userId: string,
  type: "income" | "expense",
  description: string,
  categories: Category[],
): Promise<Category | null> {
  if (!description || description.length < 2) return null;

  // Tìm giao dịch cũ có description giống hoặc chứa từ khóa tương tự
  // Dùng ilike để tìm giao dịch có description chứa từ khóa chính
  const words = description.split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return null;

  // Tìm theo từ dài nhất (cụ thể nhất) trước
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  const searchWord = sortedWords[0];

  const { data, error } = await supabase
    .from("transactions")
    .select("category_id")
    .eq("user_id", userId)
    .eq("type", type)
    .not("category_id", "is", null)
    .ilike("description", `%${searchWord}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return null;

  // Đếm category_id xuất hiện nhiều nhất
  const counts = new Map<string, number>();
  for (const row of data) {
    const cid = row.category_id as string;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  // Sắp xếp theo số lần xuất hiện giảm dần
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;

  // Chỉ tin tưởng nếu category đó được dùng ít nhất 1 lần
  const topCategoryId = sorted[0][0];
  return categories.find((c) => c.id === topCategoryId) ?? null;
}

// ── Tầng 2: Keyword mapping ────────────────────────────────

// ── Tầng 2.5: LLM classification (OpenAI) ──────────────────

async function matchByLLM(
  description: string,
  categories: Category[],
): Promise<Category | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const categoryNames = categories.map((c) => c.name);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 50,
        messages: [
          {
            role: "system",
            content:
              `Bạn là hệ thống phân loại giao dịch tài chính. ` +
              `Cho mô tả giao dịch, hãy trả về TÊN DANH MỤC phù hợp nhất từ danh sách sau: ${categoryNames.join(", ")}. ` +
              `Chỉ trả về đúng tên danh mục, không giải thích. ` +
              `Nếu không chắc chắn, trả về "UNKNOWN".`,
          },
          {
            role: "user",
            content: description,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const result = data.choices?.[0]?.message?.content?.trim();
    if (!result || result === "UNKNOWN") return null;

    // Tìm category match với kết quả LLM (case-insensitive)
    const resultLower = result.toLowerCase();
    return (
      categories.find((c) => c.name.toLowerCase() === resultLower) ??
      categories.find((c) => resultLower.includes(c.name.toLowerCase())) ??
      null
    );
  } catch (err) {
    console.error("[matchByLLM] OpenAI error:", err);
    return null;
  }
}

// ── Tầng 2 (keyword): Keyword mapping ──────────────────────

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
    "bim bim",
    "kẹo",
    "đồ ăn vặt",
    "chip",
    "bánh tráng",
    "khô",
    "mứt",
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
    "cho",
    "tặng",
    "biếu",
    "người yêu cho",
    "bạn cho",
    "mẹ cho",
    "bố cho",
    "ba cho",
    "má cho",
    "anh cho",
    "chị cho",
    "được cho",
    "lì xì",
    "mừng",
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

// ── Tầng 3: Fuzzy matching (typo / thiếu dấu / viết tắt) ──

/**
 * Bỏ dấu tiếng Việt để so sánh fuzzy.
 * "cà phê" → "ca phe", "ăn uống" → "an uong"
 */
function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Tính khoảng cách Levenshtein giữa 2 chuỗi.
 * Dùng cho so sánh fuzzy ngắn (< 30 ký tự).
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return dp[m][n];
}

function matchByFuzzy(
  description: string,
  categories: Category[],
): Category | null {
  const descNoDiacritics = removeDiacritics(description);
  const descWords = descNoDiacritics.split(/\s+/).filter((w) => w.length >= 2);

  let bestCat: Category | null = null;
  let bestScore = Infinity;
  // Threshold: cho phép sai lệch tối đa 30% chiều dài từ khóa, tối thiểu 1
  const MAX_RATIO = 0.3;

  for (const cat of categories) {
    const catNameLower = cat.name.toLowerCase();
    const keywords = CATEGORY_KEYWORDS[catNameLower];
    if (!keywords) continue;

    for (const kw of keywords) {
      const kwNorm = removeDiacritics(kw.toLowerCase());
      const maxDist = Math.max(1, Math.floor(kwNorm.length * MAX_RATIO));

      // So sánh từng từ trong description với keyword
      for (const word of descWords) {
        // Chỉ so sánh nếu chiều dài tương đương (±50%)
        if (Math.abs(word.length - kwNorm.length) > maxDist) continue;

        const dist = levenshtein(word, kwNorm);
        if (dist <= maxDist && dist < bestScore) {
          bestScore = dist;
          bestCat = cat;
        }
      }

      // Cũng thử so sánh toàn bộ description (cho multi-word keywords)
      if (kwNorm.includes(" ")) {
        const dist = levenshtein(descNoDiacritics, kwNorm);
        if (dist <= maxDist && dist < bestScore) {
          bestScore = dist;
          bestCat = cat;
        }
      }
    }
  }

  return bestCat;
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
