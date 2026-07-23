import { createClient } from '@supabase/supabase-js';
import {
  createSupabaseAccessTokenClient,
  createSupabasePublicClient,
} from './supabase-public.mjs';

const DEFAULT_SUPABASE_URL = 'https://vbkkimvedmklebghtkzs.supabase.co';

let serviceClient;

function createCallerScopedFallback() {
  const publicClient = createSupabasePublicClient();
  let accessToken = '';
  let callerClient = null;

  const scoped = () => callerClient || publicClient;
  const setAccessToken = (token) => {
    const next = String(token || '').trim();
    if (!next || next === accessToken) return;
    accessToken = next;
    callerClient = createSupabaseAccessTokenClient(next);
  };

  const auth = new Proxy({}, {
    get(_target, property) {
      if (property === 'getUser') {
        return async (token) => {
          setAccessToken(token);
          return scoped().auth.getUser(token);
        };
      }
      const value = scoped().auth[property];
      return typeof value === 'function' ? value.bind(scoped().auth) : value;
    },
  });

  const storage = new Proxy({}, {
    get(_target, property) {
      const value = scoped().storage[property];
      return typeof value === 'function' ? value.bind(scoped().storage) : value;
    },
  });

  return {
    auth,
    storage,
    from: (...args) => scoped().from(...args),
    rpc: (...args) => scoped().rpc(...args),
    schema: (...args) => scoped().schema(...args),
    functions: scoped().functions,
  };
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) return createCallerScopedFallback();

  if (!serviceClient) {
    serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'accessrevamp-netlify' } },
    });
  }
  return serviceClient;
}
