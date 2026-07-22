import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';

export function createSupabasePublicClient(env = process.env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_PUBLISHABLE_KEY
    || env.VITE_SUPABASE_ANON_KEY
    || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-application-name': 'accessrevamp-auth-ceremony' } },
  });
}