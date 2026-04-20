import type { Context } from 'telegraf';
import { format, parseISO } from 'date-fns';
import { getProfileByChatId, getRecentTransactions } from '../services/transactionService.js';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function handleRecent(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply('❌ Account not linked. Send /start to get started.');
    return;
  }

  const currency     = profile.currency ?? 'USD';
  const transactions = await getRecentTransactions(profile.id, 5);

  if (!transactions.length) {
    await ctx.reply('📭 No transactions found yet. Start adding some!');
    return;
  }

  let msg = `🕐 *Recent Transactions*\n\n`;
  for (const tx of transactions) {
    const sign  = tx.type === 'income' ? '+' : '-';
    const emoji = tx.type === 'income' ? '📈' : '📉';
    const dateStr = format(parseISO(tx.date), 'MMM d');
    const desc  = tx.description ?? 'No description';
    msg += `${emoji} ${sign}${fmt(tx.amount, currency)} — ${desc} _(${dateStr})_\n`;
  }

  await ctx.reply(msg, { parse_mode: 'Markdown' });
}
