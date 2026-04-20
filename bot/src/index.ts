import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { handleStart }   from './commands/start.js';
import { handleBalance } from './commands/balance.js';
import { handleReport }  from './commands/report.js';
import { handleRecent }  from './commands/recent.js';
import { handleHelp }    from './commands/help.js';
import { handleMessage } from './handlers/messageHandler.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');

const bot = new Telegraf(token);

// Commands
bot.command('start',   handleStart);
bot.command('balance', handleBalance);
bot.command('report',  handleReport);
bot.command('recent',  handleRecent);
bot.command('help',    handleHelp);

// Free-text messages
bot.on('text', handleMessage);

// Error handler
bot.catch((err, ctx) => {
  console.error(`[bot] Error for update ${ctx.updateType}:`, err);
  ctx.reply('⚠️ Something went wrong. Please try again.').catch(() => null);
});

// ── Launch ──────────────────────────────────────────────────────────────────
const webhookDomain = process.env.TELEGRAM_WEBHOOK_DOMAIN;
const port = parseInt(process.env.PORT ?? '3000', 10);

async function main() {
  if (webhookDomain && process.env.NODE_ENV === 'production') {
    // Webhook mode (Railway / Render)
    const webhookPath = `/webhook/${token}`;
    await bot.telegram.setWebhook(`${webhookDomain}${webhookPath}`);

    // Telegraf's built-in HTTP server
    await bot.launch({
      webhook: {
        domain: webhookDomain,
        path:   webhookPath,
        port,
      },
    });

    console.log(`[bot] Webhook active on port ${port} (${webhookDomain}${webhookPath})`);
  } else {
    // Long-polling mode (local dev)
    await bot.telegram.deleteWebhook();
    await bot.launch();
    console.log('[bot] Long-polling mode started');
  }
}

main().catch((err) => {
  console.error('[bot] Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.once('SIGINT',  () => { console.log('[bot] SIGINT — stopping'); bot.stop('SIGINT');  });
process.once('SIGTERM', () => { console.log('[bot] SIGTERM — stopping'); bot.stop('SIGTERM'); });
