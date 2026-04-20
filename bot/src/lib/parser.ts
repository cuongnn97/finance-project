import { format } from "date-fns";
import type { ParsedTransaction, TransactionType } from "../types/index.js";

// ============================================================
// Bộ phân tích giao dịch ngôn ngữ tự nhiên (Tiếng Việt + English)
//
// Định dạng hỗ trợ:
//   chi tiêu:
//     "cà phê 35k"
//     "ăn trưa 50000"
//     "mua sắm 200k"
//     "-120k taxi"
//     "chi 85k tiền chợ"
//
//   thu nhập:
//     "lương 15tr"
//     "+5000k freelance"
//     "nhận 3tr tiền dự án"
//     "thu nhập 500k"
//
//   Với ngày:
//     "cà phê 35k hôm qua"
//     "100k lương 2026-04-01"
// ============================================================

const INCOME_KEYWORDS = [
  // Tiếng Việt
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
  // English
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

const EXPENSE_KEYWORDS = [
  // Tiếng Việt
  "chi",
  "mua",
  "trả",
  "tiêu",
  "thanh toán",
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
  // English
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

// Relative date patterns (Vietnamese + English)
function resolveRelativeDate(token: string): string | null {
  const now = new Date();
  const lower = token.toLowerCase();

  if (lower === "today" || lower === "hôm nay" || lower === "homnay")
    return format(now, "yyyy-MM-dd");

  if (lower === "yesterday" || lower === "hôm qua" || lower === "homqua") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  }

  if (lower === "hôm kia" || lower === "homkia") {
    const d = new Date(now);
    d.setDate(d.getDate() - 2);
    return format(d, "yyyy-MM-dd");
  }

  // "last monday" pattern (English)
  const lastDayMatch = lower.match(
    /^last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (lastDayMatch) {
    const days: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const target = days[lastDayMatch[1]];
    const d = new Date(now);
    const diff = (d.getDay() - target + 7) % 7 || 7;
    d.setDate(d.getDate() - diff);
    return format(d, "yyyy-MM-dd");
  }

  // "thứ 2 tuần trước", "thứ hai tuần trước" pattern (Vietnamese)
  const vnDayMatch = lower.match(
    /^thứ\s*(hai|ba|tư|năm|sáu|bảy|2|3|4|5|6|7)\s*tuần\s*trước$/,
  );
  if (vnDayMatch) {
    const vnDays: Record<string, number> = {
      hai: 1,
      "2": 1,
      ba: 2,
      "3": 2,
      tư: 3,
      "4": 3,
      năm: 4,
      "5": 4,
      sáu: 5,
      "6": 5,
      bảy: 6,
      "7": 6,
    };
    const target = vnDays[vnDayMatch[1]] ?? 0;
    const d = new Date(now);
    // Go to the same day last week
    const currentDay = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1..Sun=7
    const targetDay = target === 0 ? 7 : target;
    const diff = ((currentDay - targetDay + 7) % 7) + 7; // always go back at least 7 days
    d.setDate(d.getDate() - diff);
    return format(d, "yyyy-MM-dd");
  }

  return null;
}

function extractDate(tokens: string[]): { date: string; remaining: string[] } {
  const today = format(new Date(), "yyyy-MM-dd");

  for (let i = 0; i < tokens.length; i++) {
    // ISO date: 2026-04-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(tokens[i])) {
      return { date: tokens[i], remaining: tokens.filter((_, j) => j !== i) };
    }
    // Short date: 15/04 or 04/15
    if (/^\d{1,2}\/\d{1,2}$/.test(tokens[i])) {
      const [a, b] = tokens[i].split("/").map(Number);
      const y = new Date().getFullYear();
      const date =
        a > 12
          ? `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`
          : `${y}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
      return { date, remaining: tokens.filter((_, j) => j !== i) };
    }
    // Relative: yesterday, today, hôm qua, hôm nay…
    const relative = resolveRelativeDate(tokens[i]);
    if (relative) {
      return { date: relative, remaining: tokens.filter((_, j) => j !== i) };
    }
    // Two-token patterns: "last monday", "hôm qua", "hôm nay", "hôm kia", "tuần trước"
    if (i + 1 < tokens.length) {
      const combined = `${tokens[i]} ${tokens[i + 1]}`;
      const rel = resolveRelativeDate(combined);
      if (rel) {
        return {
          date: rel,
          remaining: tokens.filter((_, j) => j !== i && j !== i + 1),
        };
      }
    }
    // Three-token: "thứ hai tuần trước"
    if (i + 2 < tokens.length) {
      const combined3 = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      const rel3 = resolveRelativeDate(combined3);
      if (rel3) {
        return {
          date: rel3,
          remaining: tokens.filter(
            (_, j) => j !== i && j !== i + 1 && j !== i + 2,
          ),
        };
      }
    }
  }
  return { date: today, remaining: tokens };
}

function lower(s: string): string {
  return s.toLowerCase();
}

/**
 * Parse Vietnamese amount formats:
 *   "35k" or "35K"   → 35000
 *   "1.5tr" or "1tr" → 1500000
 *   "1.5m"           → 1500000
 *   "50000"          → 50000
 *   "1,500"          → 1500
 *   "$50"            → 50
 */
function parseAmount(token: string): number | null {
  const cleaned = token.replace(/[,$€£₹đ]/gi, "").trim();
  if (!cleaned) return null;

  // Match number + suffix (k, K, tr, TR, m, M, trieu, triệu)
  const suffixMatch = cleaned.match(
    /^([0-9]+(?:[.,][0-9]+)?)\s*(k|tr|triệu|trieu|m)?$/i,
  );
  if (!suffixMatch) return null;

  const numStr = suffixMatch[1].replace(",", ".");
  const num = parseFloat(numStr);
  if (isNaN(num) || num <= 0) return null;

  const suffix = (suffixMatch[2] ?? "").toLowerCase();
  switch (suffix) {
    case "k":
      return num * 1000;
    case "tr":
    case "triệu":
    case "trieu":
    case "m":
      return num * 1000000;
    default:
      return num;
  }
}

/**
 * Phân tích tin nhắn dạng tự do thành giao dịch.
 * Trả về null nếu không tìm thấy số tiền hợp lệ.
 */
export function parseTransaction(text: string): ParsedTransaction | null {
  const raw = text.trim();
  if (!raw) return null;

  // Normalise: remove multiple spaces
  const normalised = raw.replace(/\s+/g, " ");
  const tokens = normalised.split(" ");

  // --- Detect explicit +/- prefix ---
  let forceType: TransactionType | null = null;
  let workTokens = [...tokens];

  const firstToken = workTokens[0];
  if (firstToken.startsWith("+")) {
    forceType = "income";
    workTokens[0] = firstToken.slice(1);
    if (!workTokens[0]) workTokens.shift();
  } else if (firstToken.startsWith("-")) {
    forceType = "expense";
    workTokens[0] = firstToken.slice(1);
    if (!workTokens[0]) workTokens.shift();
  }

  // --- Extract date ---
  const { date, remaining } = extractDate(workTokens);
  workTokens = remaining;

  // --- Extract amount (first numeric token, supports k/tr/m suffix) ---
  let amount: number | null = null;
  let amountIdx = -1;
  for (let i = 0; i < workTokens.length; i++) {
    const parsed = parseAmount(workTokens[i]);
    if (parsed !== null) {
      amount = parsed;
      amountIdx = i;
      break;
    }
  }

  if (amount === null) return null;

  // --- Remaining words = description keywords ---
  const descTokens = workTokens.filter((_, i) => i !== amountIdx);
  const descLower = descTokens.map(lower);
  const fullDescLower = descLower.join(" ");

  // --- Determine type ---
  let type: TransactionType = "expense";

  if (forceType) {
    type = forceType;
  } else {
    const hasIncome = INCOME_KEYWORDS.some((kw) =>
      kw.includes(" ")
        ? fullDescLower.includes(kw)
        : descLower.some((t) => t.includes(kw)),
    );
    const hasExpense = EXPENSE_KEYWORDS.some((kw) =>
      kw.includes(" ")
        ? fullDescLower.includes(kw)
        : descLower.some((t) => t.includes(kw)),
    );

    if (hasIncome && !hasExpense) {
      type = "income";
    } else if (hasExpense) {
      type = "expense";
    }
    // Default: expense
  }

  // --- Build description (remove type-hint words) ---
  const typeHintWords = new Set([
    ...INCOME_KEYWORDS.filter((kw) => !kw.includes(" ")),
    ...EXPENSE_KEYWORDS.filter((kw) => !kw.includes(" ")),
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
    .filter((t) => !typeHintWords.has(lower(t)))
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
