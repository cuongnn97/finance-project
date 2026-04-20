import type { Context } from 'telegraf';
import { format } from 'date-fns';
import { getProfileByChatId, getMonthlyBalance } from '../services/transactionService.js';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function handleBalance(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply('❌ Account not linked. Send /start to get started.');
    return;
  }

  const currency = profile.currency ?? 'USD';
  const now = new Date();
  const summary = await getMonthlyBalance(profile.id, now);

  const balanceEmoji = summary.balance >= 0 ? '✅' : '⚠️';
  const monthLabel   = format(now, 'MMMM yyyy');

  await ctx.reply(
    `💰 *Balance — ${monthLabel}*\n\n` +
    `📈 Income:   ${fmt(summary.total_income, currency)}\n` +
    `📉 Expenses: ${fmt(summary.total_expense, currency)}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `${balanceEmoji} Net:      ${fmt(summary.balance, currency)}`,
    { parse_mode: 'Markdown' }
  );
}
