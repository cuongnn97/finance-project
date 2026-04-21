# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

```
finance-project/
├── web/        # React 18 + Vite SPA + Vercel API routes (Telegram bot)
└── database/   # PostgreSQL schema + seed (schema.sql, seed.sql)
```

## Commands

### Web (`cd web`)
```bash
npm run dev       # Vite dev server on :5173
npm run build     # tsc + vite build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Tech Stack

- **Web:** React 18, TypeScript, Vite, TailwindCSS, React Query (TanStack), Zustand, React Hook Form + Zod, Recharts, lucide-react
- **Bot:** Telegraf — runs as Vercel serverless functions in `web/api/`
- **Backend:** Supabase (PostgreSQL + RLS + Auth)
- **AI:** OpenAI GPT-4o-mini (optional — bot falls back to regex if key absent)

## Architecture

### Web Data Flow
- Components use custom hooks for all data access (no direct Supabase calls in components)
- Custom hooks use **React Query** for server state; query keys follow `['resource', 'subtype', userId]`
- Mutations invalidate related query keys; cache is the source of truth for UI
- **Zustand** stores handle client-only state: `authStore` (user, session, profile) and `uiStore` (sidebar, toasts)
- Supabase client uses the **anon key** — RLS policies enforce per-user row access automatically

### Auth
- **Web:** Supabase Auth (email/password), session persisted in Zustand + localStorage
- **Bot:** Telegram `chat_id` stored in `profiles.telegram_chat_id`; linked when user clicks /start with a pre-filled deep link containing their user ID

### Telegram Bot (Vercel Serverless)
Bot logic lives entirely in `web/api/telegram.ts` — a single self-contained Vercel function:
1. Incoming webhook → Telegraf handles commands and free-text messages
2. NLP parser (Vietnamese + English) — handles `k`/`tr`/`triệu`/`m` suffixes, relative dates (`hôm qua`, `yesterday`)
3. Category matching runs through 5 layers: exact name → transaction history → keyword map → OpenAI LLM → fuzzy (Levenshtein + diacritics removal) → default
4. Uses **Supabase service role key** (bypasses RLS)

`web/api/set-webhook.ts` — helper endpoint to register the webhook URL with Telegram.

### Key Files
| File | Purpose |
|------|---------|
| `web/src/lib/supabase.ts` | Supabase client (anon key) |
| `web/src/store/authStore.ts` | Auth state + session management |
| `web/src/hooks/useTransactions.ts` | Transaction CRUD via React Query |
| `web/src/hooks/useDashboard.ts` | Dashboard aggregation queries |
| `web/src/App.tsx` | Router, QueryClient config, auth listener |
| `web/api/telegram.ts` | Telegram bot — all commands, parser, category matching |
| `web/api/set-webhook.ts` | Register Telegram webhook URL |
| `database/schema.sql` | Tables, RLS policies, triggers, views, functions |

## Environment Variables

All env vars live in `web/.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=http://localhost:5173
VITE_TELEGRAM_BOT_USERNAME=
# Server-side (Vercel Functions):
TELEGRAM_BOT_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WEBHOOK_SECRET=
OPENAI_API_KEY=       # Optional — enables LLM category matching
```

## UI / Localization
- UI is in **Vietnamese** — keep all user-facing strings in Vietnamese
- Amount suffixes in parser: `k` = thousand, `tr`/`triệu`/`m` = million
