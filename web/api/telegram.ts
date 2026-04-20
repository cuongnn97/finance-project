import { Telegraf } from 'telegraf';
import {
  handleStart, handleBalance, handleReport,
  handleRecent, handleHelp, handleMessage,
} from './_bot/handlers';

type Req = { method: string; body: unknown };
type Res = { status: (n: number) => { json: (b: unknown) => void; send: (b: string) => void } };

// ── Guard: return 503 if bot is not configured ────────────────
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  // Export a no-op handler so the function loads without crashing
  module.exports = (_req: Req, res: Res) => {
    res.status(503).send('Telegram bot is not configured.');
  };
} else {
  // ── Build bot (once per cold start) ────────────────────────
  const bot = new Telegraf(token);
  bot.command('start',   handleStart);
  bot.command('balance', handleBalance);
  bot.command('report',  handleReport);
  bot.command('recent',  handleRecent);
  bot.command('help',    handleHelp);
  bot.on('text',         handleMessage);
  bot.catch((err, ctx) => {
    console.error('[bot] Error:', err);
    ctx.reply('⚠️ Đã xảy ra lỗi. Vui lòng thử lại.').catch(() => null);
  });

  // ── Vercel serverless handler ──────────────────────────────
  module.exports = async (req: Req, res: Res) => {
    if (req.method !== 'POST') {
      res.status(200).send('FinanceOS Telegram Webhook');
      return;
    }
    try {
      await bot.handleUpdate(req.body as Parameters<typeof bot.handleUpdate>[0]);
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[webhook] handleUpdate error:', err);
      res.status(200).json({ ok: false }); // Always 200 to Telegram
    }
  };
}
