import { createClient } from '@supabase/supabase-js';
import { siteConfig } from '../config.js';

const tableAliases = Object.freeze({
  customer_projects: 'ar_customer_projects_view',
  orders: 'ar_customer_orders_view',
});

let client;
let browserClient;

export function getSupabase() {
  if (!siteConfig.supabaseUrl || !siteConfig.supabaseKey) return null;
  if (!client) {
    client = createClient(siteConfig.supabaseUrl, siteConfig.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { headers: { 'x-application-name': 'accessrevamp-browser' } },
    });

    browserClient = new Proxy(client, {
      get(target, property, receiver) {
        if (property === 'from') {
          return (tableName) => target.from(tableAliases[tableName] || tableName);
        }
        const value = Reflect.get(target, property, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }
  return browserClient;
}
