import { createClient } from '@supabase/supabase-js';

const normalizedEmail = String(process.argv[2] || process.env.OPERATOR_EMAIL || '').trim().toLowerCase();
const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  throw new Error('Provide the confirmed owner email as OPERATOR_EMAIL or the first command argument.');
}
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in this trusted server shell.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

let user = null;
for (let page = 1; page <= 100 && !user; page += 1) {
  const result = await supabase.auth.admin.listUsers({ page, perPage: 100 });
  if (result.error) throw result.error;
  user = result.data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail) || null;
  if (result.data.users.length < 100) break;
}

if (!user) throw new Error('No Supabase Auth user exists for that email. Sign up and confirm the email first.');
if (!user.email_confirmed_at) throw new Error('The owner email must be confirmed before operator access is granted.');

const operator = await supabase.from('accessrevamp_operators').upsert({
  user_id: user.id,
  active: true,
}, { onConflict: 'user_id' });
if (operator.error) throw operator.error;

console.log(`Operator access enabled for ${normalizedEmail}.`);
