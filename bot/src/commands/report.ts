import type { Context } from 'telegraf';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase.js';
import { getProfileByChatId, getMonthlyBalance } from '../services/transactionService.js';
import type { CategorySpending } from './report.types.js';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function handleReport(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply('❌ Account not linked. Send /start to get started.');
    return;
  }

  const currency  = profile.currency ?? 'USD';
  const now       = new Date();
  const monthStr  = `${format(now, 'yyyy-MM')}-01`;
  const monthLabel = format(now, 'MMMM yyyy');

  const [balance, spending] = await Promise.all([
    getMonthlyBalance(profile.id, now),
    supabase
      .from('category_spending')
      .select('*')
      .eq('user_id', profile.id)
      .eq('month', monthStr)
      .eq('type', 'expense')
      .order('total', { ascending: false })
      .limit(6),
  ]);

  let msg = `📊 *Report — ${monthLabel}*\n\n`;
  msg += `📈 Income:   ${fmt(balance.total_income,  currency)}\n`;
  msg += `📉 Expenses: ${fmt(balance.total_expense, currency)}\n`;
  msg += `💰 Balance:  ${fmt(balance.balance,       currency)}\n\n`;

  if (spending.data && spending.data.length > 0) {
    msg += `*Top Expense Categories:*\n`;
    const rows = spending.data as CategorySpending[];
    for (const row of rows) {
      const pct = balance.total_expense > 0
        ? ((row.total / balance.total_expense) * 100).toFixed(0)
        : '0';
      msg += `• ${row.category_name ?? 'Other'}: ${fmt(row.total, currency)} (${pct}%)\n`;
    }
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
