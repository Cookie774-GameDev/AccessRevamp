import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '../config.js';

let client;

export function getSupabase() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseKey) return null;
  if (!client) {
    client = createClient(siteConfig.supabaseUrl, siteConfig.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
