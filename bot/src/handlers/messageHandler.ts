import type { Context } from 'telegraf';
import { format } from 'date-fns';
import { parseTransaction } from '../lib/parser.js';
import {
  getProfileByChatId,
  matchCategory,
  createTransaction,
} from '../services/transactionService.js';

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function handleMessage(ctx: Context) {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const text   = message.text.trim();
  const chatId = ctx.chat?.id;
  if (!chatId || !text) return;

  // Ignore commands (handled separately)
  if (text.startsWith('/')) return;

  // Get linked profile
  const profile = await getProfileByChatId(chatId);
  if (!profile) {
    await ctx.reply(
      '❌ Your Telegram account is not linked yet.\n\n' +
      'Send /start to learn how to link it with your FinanceOS account.'
    );
    return;
  }

  // Parse transaction
  const parsed = parseTransaction(text);
  if (!parsed) {
    await ctx.reply(
      '🤔 I couldn\'t parse that as a transaction.\n\n' +
      'Try something like:\n' +
      '• `coffee 4.50`\n' +
      '• `+5000 salary`\n' +
      '• `spent 85 on groceries`\n\n' +
      'Send /help for more examples.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Show typing indicator
  await ctx.sendChatAction('typing');

  // Match category
  const category = await matchCategory(profile.id, parsed.type, parsed.description);

  // Save transaction
  let transaction;
  try {
    transaction = await createTransaction(profile, parsed, category?.id ?? null);
  } catch (err) {
    console.error('[messageHandler] Failed to save transaction:', err);
    await ctx.reply('❌ Failed to save transaction. Please try again.');
    return;
  }

  // Confirm
  const currency   = profile.currency ?? 'USD';
  const typeEmoji  = parsed.type === 'income' ? '📈' : '📉';
  const typeLabel  = parsed.type === 'income' ? 'Income' : 'Expense';
  const sign       = parsed.type === 'income' ? '+' : '-';
  const dateLabel  = format(new Date(parsed.date + 'T00:00:00'), 'MMM d, yyyy');

  await ctx.reply(
    `✅ *${typeLabel} recorded!*\n\n` +
    `${typeEmoji} *Amount:* ${sign}${fmt(parsed.amount, currency)}\n` +
    `📝 *Description:* ${parsed.description}\n` +
    `🏷️ *Category:* ${category?.name ?? 'Uncategorised'}\n` +
    `📅 *Date:* ${dateLabel}\n\n` +
    `_ID: ${transaction.id.slice(0, 8)}…_`,
    { parse_mode: 'Markdown' }
  );
}
