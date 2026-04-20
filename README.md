# FinanceOS

A production-ready personal finance management system built with React, TypeScript, Supabase, and a Telegram bot for on-the-go transaction logging.

---

## Architecture

```
finance-project/
├── web/          # React + Vite web application
├── bot/          # Node.js Telegram bot
└── database/     # PostgreSQL schema + seed data
```

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, TailwindCSS         |
| State        | Zustand, React Query                            |
| Forms        | React Hook Form + Zod                           |
| Backend/Auth | Supabase (PostgreSQL + RLS + Auth)              |
| Charts       | Recharts                                        |
| Telegram Bot | Node.js, Telegraf                               |
| Deployment   | Vercel (web), Railway / Render (bot)            |

---

## Features

- **Dashboard** — monthly balance, income/expense KPIs, spending pie chart, recent transactions
- **Transactions** — paginated list, full-text search, filter by type/category/date, create/edit/delete
- **Categories** — custom income and expense categories with colors and icons
- **Reports** — month-by-month breakdown with bar chart, income sources, top expenses
- **Profile** — currency, timezone, Telegram account linking
- **Telegram Bot** — natural language transaction logging, `/balance`, `/report`, `/recent`

---

## Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run **`database/schema.sql`** — creates tables, RLS policies, triggers, views, and functions.
3. *(Optional, dev only)* Run **`database/seed.sql`** after creating a demo user.

---

## Web App Setup

```bash
cd web
cp .env.example .env        # fill in your Supabase URL + anon key
npm install
npm run dev                 # http://localhost:5173
```

### Environment variables (`web/.env`)

| Variable                    | Description                              |
|-----------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`         | Your Supabase project URL                |
| `VITE_SUPABASE_ANON_KEY`    | Supabase anon/public key                 |
| `VITE_TELEGRAM_BOT_USERNAME`| Your Telegram bot username (no `@`)      |

### Deploy to Vercel

```bash
# From repo root or /web directory
vercel --prod
```

Set the same environment variables in your Vercel project settings.

---

## Telegram Bot Setup

```bash
cd bot
cp .env.example .env        # fill in your credentials
npm install
npm run dev                 # long-polling mode
```

### Environment variables (`bot/.env`)

| Variable                    | Description                                       |
|-----------------------------|---------------------------------------------------|
| `TELEGRAM_BOT_TOKEN`        | Token from [@BotFather](https://t.me/BotFather)  |
| `TELEGRAM_WEBHOOK_DOMAIN`   | Your deployed URL (e.g. `https://xxx.railway.app`)|
| `SUPABASE_URL`              | Your Supabase project URL                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS)          |
| `NODE_ENV`                  | `production` (enables webhook) or `development`   |
| `PORT`                      | HTTP port for webhook server (default `3000`)     |

### Bot Commands

| Command    | Description                    |
|------------|--------------------------------|
| `/start`   | Link your FinanceOS account    |
| `/balance` | Current month's balance        |
| `/report`  | Monthly spending breakdown     |
| `/recent`  | Last 5 transactions            |
| `/help`    | Usage guide and examples       |

### Natural Language Examples

```
coffee 4.50
spent 85 groceries
-120 taxi yesterday
bought clothes 200 last friday
+5000 salary
received 1200 freelance payment
income 500 2026-04-01
```

### Deploy to Railway

1. Push the `bot/` directory (or root) to a GitHub repository.
2. Create a new Railway project → **Deploy from GitHub repo**.
3. Set `ROOT_DIRECTORY` to `bot` (if using mono-repo).
4. Add all env variables in Railway's **Variables** tab.
5. Set `NODE_ENV=production` and `TELEGRAM_WEBHOOK_DOMAIN` to your Railway public URL.

### Deploy to Render

1. New **Web Service** → connect repo, set root directory to `bot`.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start`
4. Add environment variables in Render's dashboard.

---

## Linking Telegram to Your Account

1. Sign in to the web app → go to **Profile**.
2. Click **Open Telegram Bot** — the link pre-fills your user ID.
3. The bot confirms the link and you can start logging transactions immediately.

---

## Development

```bash
# Web
cd web && npm run dev

# Bot
cd bot && npm run dev

# Type-check both
cd web && npx tsc --noEmit
cd bot && npm run lint
```

---

## Security Notes

- **Web** uses the Supabase **anon key** + Row Level Security — users can only see their own data.
- **Bot** uses the Supabase **service role key** server-side only — never expose it to clients.
- All Supabase tables have RLS enabled with per-user policies.
- The webhook URL includes the bot token as a secret path segment to prevent unauthorized calls.
