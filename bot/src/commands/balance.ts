import type { Context } from "telegraf";
import {
  getProfileByChatId,
  getMonthlyBalance,
} from "../services/transactionService.js";

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function handleBalance(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa được liên kết. Gửi /start để bắt đầu.");
    return;
  }

  const currency = profile.currency ?? "VND";
  const now = new Date();
  const summary = await getMonthlyBalance(profile.id, now);

  const balanceEmoji = summary.balance >= 0 ? "✅" : "⚠️";
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  await ctx.reply(
    `💰 *Số dư — ${monthLabel}*\n\n` +
      `📈 Thu nhập:  ${fmt(summary.total_income, currency)}\n` +
      `📉 Chi tiêu:  ${fmt(summary.total_expense, currency)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `${balanceEmoji} Còn lại:   ${fmt(summary.balance, currency)}`,
    { parse_mode: "Markdown" },
  );
}
