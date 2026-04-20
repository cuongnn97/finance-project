import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Telegraf } from "telegraf";
import { createClient } from "@supabase/supabase-js";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import type { Context } from "telegraf";

// ============================================================
// Environment
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ============================================================
// Supabase (service role — bypasses RLS)
// ============================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Types
// ============================================================

type TransactionType = "income" | "expense";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: number | null;
  currency: string;
  timezone: string;
}

interface Category {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  is_default: boolean;
}

interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  date: string;
  source: string;
}

interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  raw: string;
}

interface CategorySpending {
  category_id: string | null;
  category_name: string | null;
  total: number;
}

// ============================================================
// Currency formatter
// ============================================================

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================
// Profile helpers
// ============================================================

async function getProfileByChatId(chatId: number): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("telegram_chat_id", chatId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

async function linkTelegramAccount(
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
// Category helpers
// ============================================================

async function getCategoriesByType(
  userId: string,
  type: TransactionType,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("name");
  if (error) return [];
  return (data ?? []) as Category[];
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
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
    "job",
    "làm job",
    "làm thêm",
    "làm ngoài",
    "job ngoài",
    "chạy thêm",
    "công việc",
    "kiếm",
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

async function matchCategory(
  userId: string,
  type: TransactionType,
  description: string,
): Promise<Category | null> {
  const categories = await getCategoriesByType(userId, type);
  if (!categories.length) return null;
  const lower = description.toLowerCase();

  // Tầng 0: Exact name match
  const exact = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (exact) return exact;

  // Tầng 1: History-based (học từ giao dịch cũ)
  const historyMatch = await matchByHistory(userId, type, lower, categories);
  if (historyMatch) return historyMatch;

  // Tầng 2: Keyword match
  for (const cat of categories) {
    const keywords = CATEGORY_KEYWORDS[cat.name.toLowerCase()];
    if (keywords?.some((kw) => lower.includes(kw))) return cat;
  }

  // Tầng 2.5: LLM classification (OpenAI)
  const llmMatch = await matchByLLM(lower, categories);
  if (llmMatch) return llmMatch;

  // Tầng 3: Fuzzy match
  const fuzzyMatch = matchByFuzzy(lower, categories);
  if (fuzzyMatch) return fuzzyMatch;

  // Tầng 4: Fallback
  const fallbackNames =
    type === "expense"
      ? ["chi phí khác", "khác", "other"]
      : ["thu nhập khác", "khác", "other"];
  return (
    categories.find((c) =>
      fallbackNames.some((n) => c.name.toLowerCase().includes(n)),
    ) ?? categories[0]
  );
}

// ── Tầng 1: History-based matching ─────────────────────────

// ── Tầng 2.5: LLM classification (OpenAI) ──────────────────

async function matchByLLM(
  description: string,
  categories: Category[],
): Promise<Category | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const categoryList = categories.map((c) => c.name).join(", ");

  const type = categories[0]?.type ?? "expense";
  const typeLabel = type === "income" ? "thu nhập" : "chi tiêu";

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
        max_tokens: 30,
        messages: [
          {
            role: "system",
            content: [
              `Bạn là hệ thống phân loại giao dịch tài chính cá nhân tại Việt Nam.`,
              `Đây là giao dịch loại: ${typeLabel}.`,
              `Danh sách danh mục: [${categoryList}]`,
              ``,
              `Quy tắc:`,
              `- Chỉ trả về ĐÚNG MỘT tên danh mục từ danh sách trên.`,
              `- Không giải thích, không thêm ký tự nào khác.`,
              `- Hiểu ngữ cảnh tiếng Việt tự nhiên, bao gồm tiếng lóng và viết tắt.`,
              `- Nếu không chắc chắn, trả về "UNKNOWN".`,
              ``,
              `Ví dụ (chi tiêu):`,
              `"đi ăn với bồ" → Ăn uống`,
              `"đổ xăng xe" → Di chuyển`,
              `"mua bim bim" → Ăn uống`,
              `"cắt tóc" → Mua sắm`,
              `"tiền trọ tháng 4" → Nhà ở`,
              `"xem phim rạp" → Giải trí`,
              `"mua thuốc cảm" → Sức khỏe`,
              `"đóng học phí" → Giáo dục`,
              `"trả tiền điện" → Hóa đơn`,
              ``,
              `Ví dụ (thu nhập):`,
              `"làm job ngoài" → Freelance`,
              `"lương tháng 4" → Lương`,
              `"người yêu cho" → Thu nhập khác`,
              `"lãi tiết kiệm" → Đầu tư`,
            ].join("\n"),
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

    // Tìm category match với kết quả LLM (exact → partial)
    const resultLower = result.toLowerCase();
    return (
      categories.find((c) => c.name.toLowerCase() === resultLower) ??
      categories.find((c) => resultLower.includes(c.name.toLowerCase())) ??
      null
    );
  } catch {
    return null;
  }
}

// ── Tầng 1 (history): History-based matching ───────────────

async function matchByHistory(
  userId: string,
  type: TransactionType,
  description: string,
  categories: Category[],
): Promise<Category | null> {
  if (!description || description.length < 2) return null;
  const words = description.split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return null;

  const searchWord = [...words].sort((a, b) => b.length - a.length)[0];

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

  const counts = new Map<string, number>();
  for (const row of data) {
    const cid = row.category_id as string;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;

  return categories.find((c) => c.id === sorted[0][0]) ?? null;
}

// ── Tầng 3: Fuzzy matching ─────────────────────────────────

function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

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
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
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
  const MAX_RATIO = 0.3;

  for (const cat of categories) {
    const keywords = CATEGORY_KEYWORDS[cat.name.toLowerCase()];
    if (!keywords) continue;
    for (const kw of keywords) {
      const kwNorm = removeDiacritics(kw.toLowerCase());
      const maxDist = Math.max(1, Math.floor(kwNorm.length * MAX_RATIO));
      for (const word of descWords) {
        if (Math.abs(word.length - kwNorm.length) > maxDist) continue;
        const dist = levenshtein(word, kwNorm);
        if (dist <= maxDist && dist < bestScore) {
          bestScore = dist;
          bestCat = cat;
        }
      }
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
// Transaction helpers
// ============================================================

async function createTransaction(
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

async function getMonthlyBalance(userId: string, date = new Date()) {
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

async function getRecentTransactions(
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

// ============================================================
// Parser (Vietnamese + English)
// ============================================================

const INCOME_KW = [
  "lương",
  "thu nhập",
  "nhận",
  "thưởng",
  "cổ tức",
  "hoàn tiền",
  "chuyển khoản",
  "bán",
  "hoa hồng",
  "tiền lãi",
  "trợ cấp",
  "tiền thưởng",
  "thu",
  "được trả",
  "cho",
  "tặng",
  "biếu",
  "gửi cho",
  "đưa cho",
  "người yêu cho",
  "bạn cho",
  "mẹ cho",
  "bố cho",
  "ba cho",
  "má cho",
  "làm job",
  "làm thêm",
  "làm ngoài",
  "job ngoài",
  "chạy thêm",
  "kiếm",
  "kiếm được",
  "thu được",
  "công việc",
  "dự án",
  "project",
  "salary",
  "wage",
  "freelance",
  "payment",
  "paid",
  "received",
  "income",
  "earn",
  "earned",
  "bonus",
  "dividend",
  "refund",
  "transfer",
  "invoice",
  "client",
  "sold",
  "sale",
  "deposit",
];

const EXPENSE_KW = [
  "chi",
  "mua",
  "trả",
  "tiêu",
  "thanh toán",
  "hết",
  "tốn",
  "cà phê",
  "cafe",
  "ăn",
  "ăn trưa",
  "ăn tối",
  "ăn sáng",
  "cơm",
  "phở",
  "bún",
  "trà sữa",
  "đồ uống",
  "chợ",
  "siêu thị",
  "bim bim",
  "snack",
  "kẹo",
  "bánh",
  "đồ ăn vặt",
  "taxi",
  "grab",
  "xăng",
  "gửi xe",
  "nhà",
  "tiền nhà",
  "điện",
  "nước",
  "internet",
  "điện thoại",
  "thuê",
  "hóa đơn",
  "quần áo",
  "giày",
  "phim",
  "game",
  "spotify",
  "netflix",
  "thuốc",
  "bệnh viện",
  "khám",
  "học phí",
  "sách",
  "spent",
  "bought",
  "buy",
  "purchase",
  "expense",
  "food",
  "coffee",
  "lunch",
  "dinner",
  "breakfast",
  "groceries",
  "taxi",
  "uber",
  "gas",
  "rent",
  "bill",
  "utility",
  "subscription",
  "shopping",
  "clothes",
  "movie",
  "cinema",
  "ticket",
];

function parseAmount(token: string): number | null {
  const cleaned = token.replace(/[,$€£₹đ]/gi, "").trim();
  if (!cleaned) return null;
  const m = cleaned.match(
    /^([0-9]+(?:[.,][0-9]+)?)\s*(k|tr|triệu|trieu|triêu|m|nghìn|nghin|nghìn|ngàn|ngan)?$/i,
  );
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num) || num <= 0) return null;
  const suffix = (m[2] ?? "").toLowerCase();
  if (["k", "nghìn", "nghin", "ngàn", "ngan"].includes(suffix))
    return num * 1000;
  if (["tr", "triệu", "trieu", "triêu", "m"].includes(suffix))
    return num * 1000000;
  return num;
}

function resolveRelativeDate(token: string): string | null {
  const now = new Date();
  const l = token.toLowerCase();
  if (["today", "hôm nay", "homnay"].includes(l))
    return format(now, "yyyy-MM-dd");
  if (["yesterday", "hôm qua", "homqua"].includes(l)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  }
  if (["hôm kia", "homkia"].includes(l)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return format(d, "yyyy-MM-dd");
  }
  return null;
}

function parseTransaction(text: string): ParsedTransaction | null {
  const raw = text.trim();
  if (!raw) return null;
  const tokens = raw.replace(/\s+/g, " ").split(" ");

  let forceType: TransactionType | null = null;
  const workTokens = [...tokens];
  if (workTokens[0]?.startsWith("+")) {
    forceType = "income";
    workTokens[0] = workTokens[0].slice(1);
    if (!workTokens[0]) workTokens.shift();
  } else if (workTokens[0]?.startsWith("-")) {
    forceType = "expense";
    workTokens[0] = workTokens[0].slice(1);
    if (!workTokens[0]) workTokens.shift();
  }

  // Extract date
  let date = format(new Date(), "yyyy-MM-dd");
  const dateIdxs: number[] = [];
  for (let i = 0; i < workTokens.length; i++) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(workTokens[i])) {
      date = workTokens[i];
      dateIdxs.push(i);
      break;
    }
    if (/^\d{1,2}\/\d{1,2}$/.test(workTokens[i])) {
      const [a, b] = workTokens[i].split("/").map(Number);
      const y = new Date().getFullYear();
      date =
        a > 12
          ? `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`
          : `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
      dateIdxs.push(i);
      break;
    }
    const rel = resolveRelativeDate(workTokens[i]);
    if (rel) {
      date = rel;
      dateIdxs.push(i);
      break;
    }
    if (i + 1 < workTokens.length) {
      const rel2 = resolveRelativeDate(`${workTokens[i]} ${workTokens[i + 1]}`);
      if (rel2) {
        date = rel2;
        dateIdxs.push(i, i + 1);
        break;
      }
    }
  }
  const remaining = workTokens.filter((_, i) => !dateIdxs.includes(i));

  // Extract amount (supports "2 triệu", "500 nghìn", "35k", etc.)
  let amount: number | null = null;
  let amountIdxs: number[] = [];
  for (let i = 0; i < remaining.length; i++) {
    // Try two tokens FIRST: "2 triệu", "500 nghìn", "1.5 tr"
    if (i + 1 < remaining.length) {
      const combined = remaining[i] + remaining[i + 1];
      const p2 = parseAmount(combined);
      if (p2 !== null) {
        amount = p2;
        amountIdxs = [i, i + 1];
        break;
      }
    }
    // Then try single token: "35k", "2tr", "50000"
    const p = parseAmount(remaining[i]);
    if (p !== null) {
      amount = p;
      amountIdxs = [i];
      break;
    }
  }
  if (amount === null) return null;

  const descTokens = remaining.filter((_, i) => !amountIdxs.includes(i));
  const descLower = descTokens.map((s) => s.toLowerCase());
  const fullDesc = descLower.join(" ");

  let type: TransactionType = "expense";
  if (forceType) {
    type = forceType;
  } else {
    const hasIncome = INCOME_KW.some((kw) =>
      kw.includes(" ")
        ? fullDesc.includes(kw)
        : descLower.some((t) => t.includes(kw)),
    );
    const hasExpense = EXPENSE_KW.some((kw) =>
      kw.includes(" ")
        ? fullDesc.includes(kw)
        : descLower.some((t) => t.includes(kw)),
    );
    if (hasIncome && !hasExpense) type = "income";
  }

  const hintWords = new Set([
    ...INCOME_KW.filter((kw) => !kw.includes(" ")),
    ...EXPENSE_KW.filter((kw) => !kw.includes(" ")),
    "on",
    "for",
    "at",
    "the",
    "a",
    "an",
    "cho",
    "của",
    "và",
    "với",
    "tiền",
  ]);
  const cleanDesc = descTokens
    .filter((t) => !hintWords.has(t.toLowerCase()))
    .join(" ")
    .trim();

  return {
    type,
    amount,
    description: cleanDesc || descTokens.join(" ").trim() || raw,
    date,
    raw,
  };
}

// ============================================================
// Bot setup (singleton — reused across invocations)
// ============================================================

const bot = new Telegraf(BOT_TOKEN);

// /start
bot.command("start", async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const text = (ctx.message as { text?: string } | undefined)?.text ?? "";
  const userId = text.trim().split(/\s+/)[1];

  if (userId && userId.length > 10) {
    const profile = await getProfileById(userId);
    if (!profile) {
      await ctx.reply(
        "❌ Không tìm thấy tài khoản. Vui lòng đăng ký trên web FinanceOS trước.",
      );
      return;
    }
    const ok = await linkTelegramAccount(profile.id, chatId);
    if (!ok) {
      await ctx.reply("❌ Liên kết thất bại. Vui lòng thử lại.");
      return;
    }
    await ctx.reply(
      `✅ *Liên kết tài khoản thành công!*\n\nXin chào, ${profile.full_name ?? profile.email}!\n\nGửi giao dịch như:\n• \`cà phê 35k\`\n• \`lương 15tr\`\n\nGửi /help để xem lệnh.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  const existing = await getProfileByChatId(chatId);
  if (existing) {
    await ctx.reply(
      `👋 Chào mừng trở lại, *${existing.full_name ?? existing.email}*!\n\nGửi giao dịch như:\n• \`cà phê 35k\`\n• \`+15tr lương\`\n\n/help để xem lệnh.`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  await ctx.reply(
    `👋 Chào mừng đến với *FinanceOS Bot*!\n\nĐể liên kết tài khoản:\n1. Truy cập web FinanceOS\n2. Mở trang *Hồ sơ*\n3. Nhấn *Mở Telegram Bot*\n\nHoặc gửi: \`/start MÃ_USER_CỦA_BẠN\``,
    { parse_mode: "Markdown" },
  );
});

// /balance
bot.command("balance", async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa liên kết. Gửi /start để bắt đầu.");
    return;
  }
  const currency = profile.currency ?? "VND";
  const now = new Date();
  const summary = await getMonthlyBalance(profile.id, now);
  const emoji = summary.balance >= 0 ? "✅" : "⚠️";
  await ctx.reply(
    `💰 *Số dư — Tháng ${now.getMonth() + 1}/${now.getFullYear()}*\n\n📈 Thu nhập: ${fmt(summary.total_income, currency)}\n📉 Chi tiêu: ${fmt(summary.total_expense, currency)}\n━━━━━━━━━━━━━━━━━━\n${emoji} Còn lại: ${fmt(summary.balance, currency)}`,
    { parse_mode: "Markdown" },
  );
});

// /report
bot.command("report", async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa liên kết. Gửi /start để bắt đầu.");
    return;
  }
  const currency = profile.currency ?? "VND";
  const now = new Date();
  const monthStr = `${format(now, "yyyy-MM")}-01`;
  const [balance, spending] = await Promise.all([
    getMonthlyBalance(profile.id, now),
    supabase
      .from("category_spending")
      .select("*")
      .eq("user_id", profile.id)
      .eq("month", monthStr)
      .eq("type", "expense")
      .order("total", { ascending: false })
      .limit(6),
  ]);
  let msg = `📊 *Báo cáo — Tháng ${now.getMonth() + 1}/${now.getFullYear()}*\n\n`;
  msg += `📈 Thu nhập: ${fmt(balance.total_income, currency)}\n`;
  msg += `📉 Chi tiêu: ${fmt(balance.total_expense, currency)}\n`;
  msg += `💰 Số dư: ${fmt(balance.balance, currency)}\n\n`;
  if (spending.data?.length) {
    msg += `*Danh mục chi tiêu:*\n`;
    for (const row of spending.data as CategorySpending[]) {
      const pct =
        balance.total_expense > 0
          ? ((row.total / balance.total_expense) * 100).toFixed(0)
          : "0";
      msg += `• ${row.category_name ?? "Khác"}: ${fmt(row.total, currency)} (${pct}%)\n`;
    }
  }
  await ctx.reply(msg, { parse_mode: "Markdown" });
});

// /recent
bot.command("recent", async (ctx: Context) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa liên kết. Gửi /start để bắt đầu.");
    return;
  }
  const currency = profile.currency ?? "VND";
  const txs = await getRecentTransactions(profile.id, 5);
  if (!txs.length) {
    await ctx.reply("📭 Chưa có giao dịch nào.");
    return;
  }
  let msg = `🕐 *Giao dịch gần đây*\n\n`;
  for (const tx of txs) {
    const sign = tx.type === "income" ? "+" : "-";
    const emoji = tx.type === "income" ? "📈" : "📉";
    const dateStr = format(parseISO(tx.date), "dd/MM");
    msg += `${emoji} ${sign}${fmt(tx.amount, currency)} — ${tx.description ?? "N/A"} _(${dateStr})_\n`;
  }
  await ctx.reply(msg, { parse_mode: "Markdown" });
});

// /help
bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    `📊 *Trợ giúp FinanceOS Bot*\n\n*Thêm giao dịch:*\n• \`cà phê 35k\`\n• \`ăn trưa 50k\`\n• \`lương 15tr\`\n• \`+3tr freelance\`\n• \`-120k taxi\`\n\n*Số tiền:* 35k = 35.000 · 1.5tr = 1.500.000\n*Ngày:* hôm nay · hôm qua · 2026-04-15 · 15/04\n\n*Lệnh:*\n/start — Liên kết tài khoản\n/balance — Số dư tháng\n/report — Báo cáo tháng\n/recent — 5 giao dịch gần nhất\n/help — Trợ giúp`,
    { parse_mode: "Markdown" },
  );
});

// Free-text messages
bot.on("text", async (ctx: Context) => {
  const message = ctx.message;
  if (!message || !("text" in message)) return;
  const text = message.text.trim();
  const chatId = ctx.chat?.id;
  if (!chatId || !text || text.startsWith("/")) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa liên kết.\nGửi /start để bắt đầu.");
    return;
  }

  const parsed = parseTransaction(text);
  if (!parsed) {
    await ctx.reply(
      "🤔 Không hiểu. Thử: `cà phê 35k` hoặc `+15tr lương`\n/help để xem thêm.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  const category = await matchCategory(
    profile.id,
    parsed.type,
    parsed.description,
  );
  let transaction: Transaction;
  try {
    transaction = await createTransaction(
      profile,
      parsed,
      category?.id ?? null,
    );
  } catch {
    await ctx.reply("❌ Lưu giao dịch thất bại. Thử lại.");
    return;
  }

  const currency = profile.currency ?? "VND";
  const typeEmoji = parsed.type === "income" ? "📈" : "📉";
  const typeLabel = parsed.type === "income" ? "Thu nhập" : "Chi tiêu";
  const sign = parsed.type === "income" ? "+" : "-";
  const dateLabel = format(new Date(parsed.date + "T00:00:00"), "dd/MM/yyyy");

  await ctx.reply(
    `✅ *${typeLabel} đã ghi nhận!*\n\n${typeEmoji} *Số tiền:* ${sign}${fmt(parsed.amount, currency)}\n📝 *Mô tả:* ${parsed.description}\n🏷️ *Danh mục:* ${category?.name ?? "Chưa phân loại"}\n📅 *Ngày:* ${dateLabel}\n\n_ID: ${transaction.id.slice(0, 8)}…_`,
    { parse_mode: "Markdown" },
  );
});

bot.catch((err: unknown, ctx: Context) => {
  console.error("[bot] Error:", err);
  ctx.reply("⚠️ Có lỗi xảy ra. Vui lòng thử lại.").catch(() => null);
});

// ============================================================
// Vercel Serverless Handler
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body);
      res.status(200).json({ ok: true });
    } else {
      // GET — health check + set webhook
      res.status(200).json({ status: "Bot webhook endpoint active" });
    }
  } catch (err) {
    console.error("[webhook] Error:", err);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
}
