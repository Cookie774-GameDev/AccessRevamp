import { createClient } from '@supabase/supabase-js';

export function createSupabasePublicClient(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error('Supabase public authentication configuration is missing.');

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-application-name': 'accessrevamp-auth-ceremony' } },
  });
}
