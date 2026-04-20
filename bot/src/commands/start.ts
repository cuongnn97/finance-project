import type { Context } from 'telegraf';
import { getProfileById, getProfileByChatId, linkTelegramAccount } from '../services/transactionService.js';

/**
 * /start [userId]
 * - If userId provided: link Telegram chat to that finance account
 * - If already linked: show welcome back
 * - If not linked: show how to link
 */
export async function handleStart(ctx: Context) {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const text = (ctx.message as { text?: string } | undefined)?.text ?? '';
  const parts = text.trim().split(/\s+/);
  const userId = parts[1]; // optional userId passed via deep link

  // If a userId was provided, try linking
  if (userId && userId.length > 10) {
    const profile = await getProfileById(userId);
    if (!profile) {
      await ctx.reply(
        '❌ Account not found. Please sign up at the FinanceOS web app first, then use the link from your profile page.'
      );
      return;
    }

    const ok = await linkTelegramAccount(profile.id, chatId);
    if (!ok) {
      await ctx.reply('❌ Failed to link account. Please try again.');
      return;
    }

    await ctx.reply(
      `✅ *Account linked successfully!*\n\n` +
      `Hello, ${profile.full_name ?? profile.email}!\n\n` +
      `You can now add transactions by sending me a message like:\n` +
      `• \`spent 50 on coffee\`\n` +
      `• \`received 5000 salary\`\n` +
      `• \`-85 groceries yesterday\`\n` +
      `• \`+1200 freelance payment\`\n\n` +
      `Use /help to see all commands.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if already linked
  const existingProfile = await getProfileByChatId(chatId);
  if (existingProfile) {
    await ctx.reply(
      `👋 Welcome back, *${existingProfile.full_name ?? existingProfile.email}*!\n\n` +
      `Send me a transaction like:\n` +
      `• \`coffee 4.50\`\n` +
      `• \`+3000 salary\`\n\n` +
      `Or use /help for all commands.`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Not linked
  await ctx.reply(
    `👋 Welcome to *FinanceOS Bot*!\n\n` +
    `To get started, link your account:\n\n` +
    `1. Go to the FinanceOS web app\n` +
    `2. Open *Profile* page\n` +
    `3. Click *Open Telegram Bot* — it will send your unique link code\n\n` +
    `Or manually send: \`/start YOUR_USER_ID\``,
    { parse_mode: 'Markdown' }
  );
}
