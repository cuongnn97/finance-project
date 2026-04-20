import { createClient } from '@supabase/supabase-js';

// Lazily create client so missing env vars only fail when actually called
function createBotSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the Telegram bot.');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cache the client after first creation
let _client: ReturnType<typeof createClient> | null = null;

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_client) _client = createBotSupabase();
    return (_client as Record<string | symbol, unknown>)[prop];
  },
});
