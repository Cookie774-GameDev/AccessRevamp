import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WD8hNud9SZMDg6uK0N2cAA_4hnxz2ta';

function publicConfig(env = process.env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

function clientOptions(headers = {}) {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-application-name': 'accessrevamp-auth-ceremony',
        ...headers,
      },
    },
  };
}

export function createSupabasePublicClient(env = process.env) {
  const { url, key } = publicConfig(env);
  return createClient(url, key, clientOptions());
}

export function createSupabaseAccessTokenClient(accessToken, env = process.env) {
  const token = String(accessToken || '').trim();
  if (!token) throw new Error('An access token is required.');
  const { url, key } = publicConfig(env);
  return createClient(url, key, clientOptions({ authorization: `Bearer ${token}` }));
}
