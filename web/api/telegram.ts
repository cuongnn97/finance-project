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
  forcedType: TransactionType | null; // set only by +/- prefix
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

async function getAllCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("type")
    .order("name");
  if (error) return [];
  return (data ?? []) as Category[];
}

// ── Tầng 1: Lấy lịch sử giao dịch tương tự làm context cho OpenAI ──

interface HistoryEntry {
  description: string;
  type: TransactionType;
  categoryName: string;
}

async function getHistoryContext(
  userId: string,
  rawText: string,
): Promise<HistoryEntry[]> {
  if (!rawText || rawText.length < 2) return [];
  const words = rawText.split(/\s+/).filter((w) => w.length >= 2);
  if (!words.length) return [];

  const searchWord = [...words].sort((a, b) => b.length - a.length)[0];

  const { data, error } = await supabase
    .from("transactions")
    .select("description, type, categories(name)")
    .eq("user_id", userId)
    .not("category_id", "is", null)
    .ilike("description", `%${searchWord}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data?.length) return [];

  return (data as Array<{ description: string; type: string; categories: { name: string } | null }>)
    .map((row) => ({
      description: row.description ?? "",
      type: row.type as TransactionType,
      categoryName: row.categories?.name ?? "",
    }))
    .filter((r) => r.categoryName);
}

// ── OpenAI: Phân loại type + category trong một lần gọi ────

async function classifyTransaction(
  rawText: string,
  allCategories: Category[],
  history: HistoryEntry[],
  forcedType?: TransactionType,
): Promise<{ type: TransactionType; category: Category | null }> {
  const defaultType: TransactionType = forcedType ?? "expense";

  const getFallback = (type: TransactionType): Category | null => {
    const cats = allCategories.filter((c) => c.type === type);
    const fallbackNames =
      type === "expense"
        ? ["chi phí khác", "khác", "other"]
        : ["thu nhập khác", "khác", "other"];
    return (
      cats.find((c) =>
        fallbackNames.some((n) => c.name.toLowerCase().includes(n)),
      ) ??
      cats[0] ??
      null
    );
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { type: defaultType, category: getFallback(defaultType) };
  }

  const incomeList = allCategories
    .filter((c) => c.type === "income")
    .map((c) => c.name)
    .join(", ");
  const expenseList = allCategories
    .filter((c) => c.type === "expense")
    .map((c) => c.name)
    .join(", ");

  const historyLines =
    history.length > 0
      ? `\nLịch sử giao dịch tương tự của người dùng (dùng để tham khảo):\n${history
          .slice(0, 5)
          .map(
            (h) =>
              `- "${h.description}" → ${h.type === "income" ? "thu nhập" : "chi tiêu"}, danh mục: ${h.categoryName}`,
          )
          .join("\n")}`
      : "";

  const forcedNote = forcedType
    ? `\nLưu ý bắt buộc: Người dùng đã chỉ định đây là giao dịch ${forcedType === "income" ? "THU NHẬP" : "CHI TIÊU"} — chỉ chọn danh mục trong nhóm đó.`
    : "";

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
        max_tokens: 60,
        messages: [
          {
            role: "system",
            content: [
              `Bạn là hệ thống phân loại giao dịch tài chính cá nhân tại Việt Nam.`,
              ``,
              `Danh mục THU NHẬP: [${incomeList}]`,
              `Danh mục CHI TIÊU: [${expenseList}]`,
              historyLines,
              forcedNote,
              ``,
              `Quy tắc:`,
              `- Xác định loại giao dịch (thu nhập / chi tiêu) dựa trên ngữ cảnh tiếng Việt.`,
              `- Chú ý thứ tự từ: "mẹ cho" = được nhận tiền (thu nhập), "cho mẹ" = đưa tiền đi (chi tiêu).`,
              `- "nhận", "được cho", "lì xì", "lương", "bán được" → thu nhập.`,
              `- "mua", "trả", "chi", "tiêu", "đổ xăng", "ăn" → chi tiêu.`,
              `- Chọn đúng danh mục từ nhóm tương ứng với loại giao dịch đã xác định.`,
              `- Ưu tiên tham khảo lịch sử người dùng nếu có.`,
              ``,
              `Trả về JSON: {"type": "income" | "expense", "category": "<tên danh mục>"}`,
              `Chỉ trả về JSON, không giải thích thêm.`,
            ].join("\n"),
          },
          {
            role: "user",
            content: rawText,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { type: defaultType, category: getFallback(defaultType) };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { type: defaultType, category: getFallback(defaultType) };

    const parsed = JSON.parse(content) as {
      type?: string;
      category?: string;
    };

    const type: TransactionType =
      forcedType ?? (parsed.type === "income" ? "income" : "expense");
    const categoryName = parsed.category?.trim() ?? "";

    const cats = allCategories.filter((c) => c.type === type);
    const nameLower = categoryName.toLowerCase();
    const matched =
      cats.find((c) => c.name.toLowerCase() === nameLower) ??
      cats.find((c) => nameLower.includes(c.name.toLowerCase())) ??
      null;

    return { type, category: matched ?? getFallback(type) };
  } catch {
    return { type: defaultType, category: getFallback(defaultType) };
  }
}

// ============================================================
// Transaction helpers (DB)
// ============================================================

async function createTransaction(
  profile: Profile,
  parsed: ParsedTransaction,
  type: TransactionType,
  categoryId: string | null,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: profile.id,
      category_id: categoryId,
      type,
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
// Parser (Vietnamese + English) — chỉ parse số tiền + ngày
// ============================================================

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

  // Chỉ detect type từ prefix +/-; loại giao dịch thực sự do OpenAI quyết định
  let forcedType: TransactionType | null = null;
  const workTokens = [...tokens];
  if (workTokens[0]?.startsWith("+")) {
    forcedType = "income";
    workTokens[0] = workTokens[0].slice(1);
    if (!workTokens[0]) workTokens.shift();
  } else if (workTokens[0]?.startsWith("-")) {
    forcedType = "expense";
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

  // Description = toàn bộ text còn lại sau khi bỏ số tiền và ngày
  const descTokens = remaining.filter((_, i) => !amountIdxs.includes(i));
  const description = descTokens.join(" ").trim();

  return {
    forcedType,
    amount,
    description: description || raw,
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

async function deleteLastTransaction(
  userId: string,
): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const tx = data as Transaction;
  const { error: delError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", tx.id);

  if (delError) return null;
  return tx;
}

const DELETE_PATTERNS = [
  /xo[áa].*(?:bản ghi|giao dịch).*(?:trước|vừa|cuối|gần|mới)/i,
  /xo[áa].*(?:bản ghi|giao dịch).*(?:rồi|đó|kia)/i,
  /(?:bỏ|huỷ|hủy|xóa|xoá).*(?:cái|bản|giao dịch).*(?:vừa|trước|cuối|gần|mới|rồi|đó)/i,
  /(?:undo|hoàn tác|bỏ đi)/i,
  /xo[áa]\s*(?:đi|nó|luôn)/i,
  /(?:delete|remove).*(?:last|previous|recent)/i,
];

function isDeleteCommand(text: string): boolean {
  return DELETE_PATTERNS.some((p) => p.test(text));
}

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

  // ── Xử lý lệnh xóa ──
  if (isDeleteCommand(text)) {
    const deleted = await deleteLastTransaction(profile.id);
    if (!deleted) {
      await ctx.reply("❌ Không tìm thấy giao dịch nào để xóa.");
      return;
    }
    const currency = profile.currency ?? "VND";
    const typeLabel = deleted.type === "income" ? "Thu nhập" : "Chi tiêu";
    await ctx.reply(
      `🗑️ *Đã xóa giao dịch gần nhất!*\n\n` +
        `${typeLabel}: ${fmt(deleted.amount, currency)}\n` +
        `📝 ${deleted.description ?? "Không có mô tả"}\n` +
        `📅 ${deleted.date}`,
      { parse_mode: "Markdown" },
    );
    return;
  }

  // ── Xử lý giao dịch ──
  const parsed = parseTransaction(text);
  if (!parsed) {
    await ctx.reply(
      "🤔 Không hiểu. Thử: `cà phê 35k` hoặc `+15tr lương`\n/help để xem thêm.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Lấy categories + lịch sử, rồi phân loại bằng OpenAI
  const [allCategories, history] = await Promise.all([
    getAllCategories(profile.id),
    getHistoryContext(profile.id, parsed.raw),
  ]);
  const { type, category } = await classifyTransaction(
    parsed.raw,
    allCategories,
    history,
    parsed.forcedType ?? undefined,
  );

  let transaction: Transaction;
  try {
    transaction = await createTransaction(
      profile,
      parsed,
      type,
      category?.id ?? null,
    );
  } catch {
    await ctx.reply("❌ Lưu giao dịch thất bại. Thử lại.");
    return;
  }

  const currency = profile.currency ?? "VND";
  const typeEmoji = type === "income" ? "📈" : "📉";
  const typeLabel = type === "income" ? "Thu nhập" : "Chi tiêu";
  const sign = type === "income" ? "+" : "-";
  const dateLabel = format(new Date(parsed.date + "T00:00:00"), "dd/MM/yyyy");

  const balance = await getMonthlyBalance(profile.id);
  const balanceEmoji = balance.balance >= 0 ? "🟢" : "🔴";

  await ctx.reply(
    `✅ *${typeLabel} đã ghi nhận!*\n\n` +
    `${typeEmoji} *Số tiền:* ${sign}${fmt(parsed.amount, currency)}\n` +
    `📝 *Mô tả:* ${parsed.description || text}\n` +
    `🏷️ *Danh mục:* ${category?.name ?? "Chưa phân loại"}\n` +
    `📅 *Ngày:* ${dateLabel}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balanceEmoji} *Số dư tháng này:* ${fmt(balance.balance, currency)}\n` +
    `_(Thu: ${fmt(balance.total_income, currency)} · Chi: ${fmt(balance.total_expense, currency)})_\n\n` +
    `_ID: ${transaction.id.slice(0, 8)}…_`,
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
