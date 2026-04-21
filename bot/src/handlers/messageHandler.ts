import type { Context } from "telegraf";
import { format } from "date-fns";
import { parseTransaction } from "../lib/parser.js";
import {
  getProfileByChatId,
  matchCategory,
  createTransaction,
} from "../services/transactionService.js";

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function handleMessage(ctx: Context) {
  const message = ctx.message;
  if (!message || !("text" in message)) return;

  const text = message.text.trim();
  const chatId = ctx.chat?.id;
  if (!chatId || !text) return;

  // Bỏ qua lệnh (xử lý riêng)
  if (text.startsWith("/")) return;

  // Lấy profile đã liên kết
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply(
      "❌ Tài khoản Telegram chưa được liên kết.\n\n" +
        "Gửi /start để tìm hiểu cách liên kết với tài khoản FinanceOS.",
    );
    return;
  }

  // Phân tích giao dịch
  const parsed = await parseTransaction(text);
  if (!parsed) {
    await ctx.reply(
      "🤔 Tôi không thể phân tích tin nhắn này thành giao dịch.\n\n" +
        "Thử gửi như:\n" +
        "• `cà phê 35k`\n" +
        "• `+15tr lương`\n" +
        "• `chi 85k tiền chợ`\n\n" +
        "Gửi /help để xem thêm ví dụ.",
      { parse_mode: "Markdown" },
    );
    return;
  }

  // Hiện trạng thái đang nhập
  await ctx.sendChatAction("typing");

  // Tìm danh mục phù hợp
  const category = await matchCategory(
    profile.id,
    parsed.type,
    parsed.description,
  );

  // Lưu giao dịch
  let transaction;
  try {
    transaction = await createTransaction(
      profile,
      parsed,
      category?.id ?? null,
    );
  } catch (err) {
    console.error("[messageHandler] Lưu giao dịch thất bại:", err);
    await ctx.reply("❌ Lưu giao dịch thất bại. Vui lòng thử lại.");
    return;
  }

  // Xác nhận
  const currency = profile.currency ?? "VND";
  const typeEmoji = parsed.type === "income" ? "📈" : "📉";
  const typeLabel = parsed.type === "income" ? "Thu nhập" : "Chi tiêu";
  const sign = parsed.type === "income" ? "+" : "-";
  const dateLabel = format(new Date(parsed.date + "T00:00:00"), "dd/MM/yyyy");

  await ctx.reply(
    `✅ *${typeLabel} đã ghi nhận!*\n\n` +
      `${typeEmoji} *Số tiền:* ${sign}${fmt(parsed.amount, currency)}\n` +
      `📝 *Mô tả:* ${parsed.description}\n` +
      `🏷️ *Danh mục:* ${category?.name ?? "Chưa phân loại"}\n` +
      `📅 *Ngày:* ${dateLabel}\n\n` +
      `_ID: ${transaction.id.slice(0, 8)}…_`,
    { parse_mode: "Markdown" },
  );
}
