import type { Context } from "telegraf";
import { format, parseISO } from "date-fns";
import {
  getProfileByChatId,
  getRecentTransactions,
} from "../services/transactionService.js";

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function handleRecent(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa được liên kết. Gửi /start để bắt đầu.");
    return;
  }

  const currency = profile.currency ?? "VND";
  const transactions = await getRecentTransactions(profile.id, 5);

  if (!transactions.length) {
    await ctx.reply("📭 Chưa có giao dịch nào. Hãy bắt đầu thêm giao dịch!");
    return;
  }

  let msg = `🕐 *Giao dịch gần đây*\n\n`;
  for (const tx of transactions) {
    const sign = tx.type === "income" ? "+" : "-";
    const emoji = tx.type === "income" ? "📈" : "📉";
    const dateStr = format(parseISO(tx.date), "dd/MM");
    const desc = tx.description ?? "Không có mô tả";
    msg += `${emoji} ${sign}${fmt(tx.amount, currency)} — ${desc} _(${dateStr})_\n`;
  }

  await ctx.reply(msg, { parse_mode: "Markdown" });
}
