import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * GET /api/set-webhook?secret=YOUR_SECRET
 *
 * Call this once after deploying to register the Telegram webhook.
 * Example: https://your-app.vercel.app/api/set-webhook?secret=your-webhook-secret
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.query.secret as string;
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    res.status(403).json({ error: "Invalid secret" });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN not set" });
    return;
  }

  const domain = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VITE_APP_URL;

  if (!domain) {
    res.status(500).json({ error: "Could not determine domain" });
    return;
  }

  const webhookUrl = `${domain}/api/telegram`;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    },
  );

  const result = await response.json();

  res.status(200).json({
    webhook_url: webhookUrl,
    telegram_response: result,
  });
}
