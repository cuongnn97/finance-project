import type { Context } from 'telegraf';
import { format } from 'date-fns';
import { parseTransaction } from './parser';
import {
  getProfileByChatId,
  getProfileById,
  linkTelegramAccount,
  matchCategory,
  createTransaction,
  getMonthlyBalance,
  getRecentTransactions,
} from './service';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function fmtCompact(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + ' tỷ';
  if (amount >= 1_000_000)     return (amount / 1_000_000).toFixed(1).replace(/\.0$/, '') + ' tr';
  if (amount >= 1_000)         return (amount / 1_000).toFixed(0) + 'k';
  return String(amount);
}

// ── /start ───────────────────────────────────────────────────

export async function handleStart(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = (ctx.message as { text?: string } | undefined)?.text ?? '';
  const userId = text.trim().split(/\s+/)[1];

  if (userId && userId.length > 10) {
    const profile = await getProfileById(userId);
    if (!profile) {
      await ctx.reply('❌ Không tìm thấy tài khoản. Vui lòng đăng ký trên FinanceOS trước, rồi dùng link từ trang Hồ sơ.');
      return;
    }
    const ok = await linkTelegramAccount(profile.id, chatId);
    if (!ok) { await ctx.reply('❌ Liên kết thất bại. Vui lòng thử lại.'); return; }

    await ctx.reply(
      `✅ *Liên kết thành công!*\n\n` +
      `Xin chào, ${profile.full_name ?? profile.email}!\n\n` +
      `Thêm giao dịch bằng cách nhắn tin như:\n` +
      `• \`cà phê 35k\`\n• \`lương 15tr\`\n• \`-85k tiền chợ\`\n\n` +
      `Gửi /help để xem tất cả lệnh.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const existing = await getProfileByChatId(chatId);
  if (existing) {
    await ctx.reply(
      `👋 Chào mừng trở lại, *${existing.full_name ?? existing.email}*!\n\nGửi giao dịch hoặc /help để xem lệnh.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.reply(
    `👋 Chào mừng đến *FinanceOS Bot*!\n\n` +
    `Để bắt đầu, mở ứng dụng web → trang *Hồ sơ* → nhấn *Mở Telegram Bot*.\n\n` +
    `Hoặc gửi: \`/start MÃ_USER_CỦA_BẠN\``,
    { parse_mode: 'Markdown' }
  );
}

// ── /balance ─────────────────────────────────────────────────

export async function handleBalance(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply('❌ Chưa liên kết tài khoản. Gửi /start để biết thêm.');
    return;
  }

  const balance = await getMonthlyBalance(profile.id);
  const currency = profile.currency ?? 'VND';
  const now = new Date();

  await ctx.reply(
    `💰 *Số dư tháng ${now.getMonth() + 1}/${now.getFullYear()}*\n\n` +
    `📈 Thu nhập: ${fmt(balance.total_income, currency)}\n` +
    `📉 Chi tiêu:  ${fmt(balance.total_expense, currency)}\n` +
    `💵 Còn lại:  *${fmt(balance.balance, currency)}*`,
    { parse_mode: 'Markdown' }
  );
}

// ── /recent ──────────────────────────────────────────────────

export async function handleRecent(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) { await ctx.reply('❌ Chưa liên kết. Gửi /start.'); return; }

  const txns = await getRecentTransactions(profile.id, 5);
  if (!txns.length) { await ctx.reply('📭 Chưa có giao dịch nào.'); return; }

  const currency = profile.currency ?? 'VND';
  const lines = txns.map((t) => {
    const emoji = t.type === 'income' ? '📈' : '📉';
    const sign  = t.type === 'income' ? '+' : '-';
    const cat   = t.category?.name ?? 'Khác';
    const date  = format(new Date(t.date + 'T00:00:00'), 'dd/MM');
    return `${emoji} ${sign}${fmtCompact(t.amount)} — ${t.description ?? cat} _(${date})_`;
  });

  await ctx.reply(`📋 *5 giao dịch gần nhất:*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown' });
}

// ── /report ──────────────────────────────────────────────────

export async function handleReport(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) { await ctx.reply('❌ Chưa liên kết. Gửi /start.'); return; }

  const now  = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const [cur, pre] = await Promise.all([
    getMonthlyBalance(profile.id, now),
    getMonthlyBalance(profile.id, prev),
  ]);
  const currency = profile.currency ?? 'VND';

  const changeExpense = pre.total_expense > 0
    ? ((cur.total_expense - pre.total_expense) / pre.total_expense * 100).toFixed(1)
    : null;
  const expenseNote = changeExpense
    ? ` _(${Number(changeExpense) >= 0 ? '+' : ''}${changeExpense}% so tháng trước)_`
    : '';

  await ctx.reply(
    `📊 *Báo cáo tháng ${now.getMonth() + 1}/${now.getFullYear()}*\n\n` +
    `📈 Thu nhập: ${fmt(cur.total_income, currency)}\n` +
    `📉 Chi tiêu:  ${fmt(cur.total_expense, currency)}${expenseNote}\n` +
    `💵 Số dư:    *${fmt(cur.balance, currency)}*\n\n` +
    `_Xem báo cáo chi tiết trên ứng dụng web._`,
    { parse_mode: 'Markdown' }
  );
}

// ── /help ────────────────────────────────────────────────────

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    `🤖 *FinanceOS Bot — Hướng dẫn*\n\n` +
    `*Lệnh:*\n` +
    `/balance — Số dư tháng này\n` +
    `/report  — Báo cáo thu chi\n` +
    `/recent  — 5 giao dịch gần nhất\n` +
    `/help    — Hiện hướng dẫn này\n\n` +
    `*Thêm giao dịch — chỉ cần nhắn:*\n` +
    `• \`cà phê 35k\` → chi 35.000\n` +
    `• \`ăn trưa 80k hôm qua\`\n` +
    `• \`+15tr lương\` → thu nhập\n` +
    `• \`-200k mua sắm\` → chi tiêu\n` +
    `• \`tiền nhà 4tr 2026-04-01\`\n\n` +
    `*Đơn vị:* k = nghìn, tr/m = triệu`,
    { parse_mode: 'Markdown' }
  );
}

// ── text message ─────────────────────────────────────────────

export async function handleMessage(ctx: Context) {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const text   = message.text.trim();
  const chatId = ctx.chat?.id;
  if (!chatId || !text || text.startsWith('/')) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply('❌ Chưa liên kết tài khoản.\nGửi /start để biết cách liên kết với FinanceOS.');
    return;
  }

  const parsed = parseTransaction(text);
  if (!parsed) {
    await ctx.reply(
      '🤔 Không thể phân tích tin nhắn này.\n\nThử: `cà phê 35k`, `+15tr lương`, `chi 85k tiền chợ`\n\nGửi /help để xem thêm.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  await ctx.sendChatAction('typing');
  const category = await matchCategory(profile.id, parsed.type, parsed.description);

  let txn;
  try {
    txn = await createTransaction(profile, parsed, category?.id ?? null);
  } catch {
    await ctx.reply('❌ Lưu giao dịch thất bại. Vui lòng thử lại.');
    return;
  }

  const currency  = profile.currency ?? 'VND';
  const sign      = parsed.type === 'income' ? '+' : '-';
  const typeEmoji = parsed.type === 'income' ? '📈' : '📉';
  const typeLabel = parsed.type === 'income' ? 'Thu nhập' : 'Chi tiêu';
  const dateLabel = format(new Date(parsed.date + 'T00:00:00'), 'dd/MM/yyyy');

  await ctx.reply(
    `✅ *${typeLabel} đã ghi nhận!*\n\n` +
    `${typeEmoji} *Số tiền:* ${sign}${fmt(parsed.amount, currency)}\n` +
    `📝 *Mô tả:* ${parsed.description}\n` +
    `🏷️ *Danh mục:* ${category?.name ?? 'Chưa phân loại'}\n` +
    `📅 *Ngày:* ${dateLabel}\n\n` +
    `_ID: ${txn.id.slice(0, 8)}…_`,
    { parse_mode: 'Markdown' }
  );
}
