import type { Context } from "telegraf";
import { format } from "date-fns";
import { supabase } from "../lib/supabase.js";
import {
  getProfileByChatId,
  getMonthlyBalance,
} from "../services/transactionService.js";
import type { CategorySpending } from "./report.types.js";

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function handleReport(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply("❌ Tài khoản chưa được liên kết. Gửi /start để bắt đầu.");
    return;
  }

  const currency = profile.currency ?? "VND";
  const now = new Date();
  const monthStr = `${format(now, "yyyy-MM")}-01`;
  const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

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

  let msg = `📊 *Báo cáo — ${monthLabel}*\n\n`;
  msg += `📈 Thu nhập:  ${fmt(balance.total_income, currency)}\n`;
  msg += `📉 Chi tiêu:  ${fmt(balance.total_expense, currency)}\n`;
  msg += `💰 Số dư:     ${fmt(balance.balance, currency)}\n\n`;

  if (spending.data && spending.data.length > 0) {
    msg += `*Danh mục chi tiêu hàng đầu:*\n`;
    const rows = spending.data as CategorySpending[];
    for (const row of rows) {
      const pct =
        balance.total_expense > 0
          ? ((row.total / balance.total_expense) * 100).toFixed(0)
          : "0";
      msg += `• ${row.category_name ?? "Khác"}: ${fmt(row.total, currency)} (${pct}%)\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: "Markdown" });
}
