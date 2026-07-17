import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const write = async (path, content) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content.trimStart(), 'utf8');
};

await write('.gitignore', String.raw`
node_modules/
dist/
.netlify/
.env
.env.*
!.env.example
.DS_Store
*.log
coverage/
`);

await write('.env.example', String.raw`
# Public build variables
VITE_SITE_URL=https://your-site.netlify.app
VITE_CONTACT_EMAIL=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_STRIPE_HOMEPAGE_REVEAL_PRICE_ID=price_1TuGoNLzyGRcyGQJRjtGsiMV
VITE_STRIPE_QUICK_FIX_PRICE_ID=price_1TuGoTLzyGRcyGQJfdkqoE3f
VITE_STRIPE_HOMEPAGE_REVEAL_URL=https://book.stripe.com/test_dRmdRabhid0QfBfedagQE00
VITE_STRIPE_QUICK_FIX_URL=https://book.stripe.com/test_cNi00k99a1i81Kp6KIgQE01

# Server-only variables — never prefix these with VITE_
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
CONTACT_RATE_LIMIT_SECRET=
ALLOWED_ORIGINS=https://your-site.netlify.app
`);

await write('netlify.toml', String.raw`
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--no-audit --no-fund"

[functions]
  node_bundler = "esbuild"
  included_files = ["netlify/functions/**"]

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://book.stripe.com; upgrade-insecure-requests"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=()"
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Resource-Policy = "same-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
`);

await write('netlify/functions/_shared/http.mjs', String.raw`
const MAX_BODY_BYTES = 16_000;

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function html(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

export function requestIp(request) {
  return request.headers.get('x-nf-client-connection-ip')
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
}

export function assertJsonSize(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, 'Request is too large.');
}

export function assertMethod(request, method) {
  if (request.method !== method) throw new HttpError(405, 'Method not allowed.');
}

export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) throw new HttpError(403, 'A valid browser origin is required.');
  const allowed = new Set([
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.VITE_SITE_URL,
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()),
  ].filter(Boolean).map((value) => value.replace(/\/$/, '')));
  if (!allowed.has(origin.replace(/\/$/, ''))) throw new HttpError(403, 'Origin is not allowed.');
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function handleError(error) {
  const status = Number(error?.status) || 500;
  const message = status >= 500 ? 'The request could not be completed.' : error.message;
  if (status >= 500) console.error(error);
  return json({ error: message }, status);
}
`);

await write('netlify/functions/_shared/supabase-admin.mjs', String.raw`
import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing.');
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'x-application-name': 'accessrevamp-netlify' } },
    });
  }
  return client;
}
`);

await write('netlify/functions/_shared/validation.mjs', String.raw`
import { z } from 'zod';

const publicHttpUrl = z.string().trim().max(2048).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}, 'Enter a valid public website URL.');

export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(80),
  lastName: z.string().trim().max(80).default(''),
  email: z.string().trim().email('Enter a valid email.').max(254).transform((value) => value.toLowerCase()),
  websiteUrl: publicHttpUrl.optional().default(''),
  message: z.string().trim().min(20, 'Please include a little more detail.').max(4000),
  companyFax: z.string().max(0).optional().default(''),
  consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required so we can reply.' }) }),
}).strict();

export const checkoutSchema = z.object({
  planKey: z.enum(['homepage_reveal', 'quick_fix']),
  email: z.string().trim().email().max(254).optional(),
}).strict();

export const outreachDraftSchema = z.object({
  businessName: z.string().trim().min(1).max(160),
  websiteUrl: publicHttpUrl,
  recipientEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactSourceUrl: publicHttpUrl,
  subject: z.string().trim().min(8).max(120),
  bodyText: z.string().trim().min(80).max(8000),
}).strict();
`);

await write('netlify/functions/contact.mjs', String.raw`
import { createHmac } from 'node:crypto';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json, requestIp } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';
import { contactSchema } from './_shared/validation.mjs';

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    const payload = contactSchema.parse(await request.json());
    const secret = process.env.CONTACT_RATE_LIMIT_SECRET;
    if (!secret || secret.length < 24) throw new Error('Contact rate-limit secret is not configured.');
    const rateKey = createHmac('sha256', secret).update(requestIp(request)).digest('hex');
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('submit_accessrevamp_contact', {
      p_first_name: payload.firstName,
      p_last_name: payload.lastName,
      p_email: payload.email,
      p_website_url: payload.websiteUrl || null,
      p_message: payload.message,
      p_rate_key: rateKey,
      p_user_agent: (request.headers.get('user-agent') || '').slice(0, 500),
    });
    if (error) {
      if (/rate limit/i.test(error.message)) return json({ error: 'Too many requests. Please try again later.' }, 429);
      throw error;
    }
    return json({ ok: true, reference: data }, 201);
  } catch (error) {
    return handleError(error);
  }
};
`);

await write('netlify/functions/create-checkout.mjs', String.raw`
import Stripe from 'stripe';
import { assertJsonSize, assertMethod, assertSameOrigin, handleError, json } from './_shared/http.mjs';
import { checkoutSchema } from './_shared/validation.mjs';

const PLAN_PRICES = Object.freeze({
  homepage_reveal: process.env.STRIPE_HOMEPAGE_REVEAL_PRICE_ID || 'price_1TuGoNLzyGRcyGQJRjtGsiMV',
  quick_fix: process.env.STRIPE_QUICK_FIX_PRICE_ID || 'price_1TuGoTLzyGRcyGQJfdkqoE3f',
});

export default async (request) => {
  try {
    assertMethod(request, 'POST');
    assertSameOrigin(request);
    assertJsonSize(request);
    const payload = checkoutSchema.parse(await request.json());
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe server configuration is missing.');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: PLAN_PRICES[payload.planKey], quantity: 1 }],
      customer_email: payload.email,
      customer_creation: 'always',
      billing_address_collection: 'required',
      allow_promotion_codes: false,
      success_url: origin + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: origin + '/cancel',
      metadata: { plan_key: payload.planKey, source: 'accessrevamp_website' },
      payment_intent_data: { metadata: { plan_key: payload.planKey, source: 'accessrevamp_website' } },
    });
    return json({ url: session.url }, 201);
  } catch (error) {
    return handleError(error);
  }
};
`);

await write('netlify/functions/stripe-webhook.mjs', String.raw`
import Stripe from 'stripe';
import { handleError, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const expectedAmounts = Object.freeze({ homepage_reveal: 5000, quick_fix: 19900 });

export default async (request) => {
  try {
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    const signature = request.headers.get('stripe-signature');
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
      return json({ error: 'Webhook configuration is incomplete.' }, 503);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await request.text();
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const supabase = getSupabaseAdmin();

    const { error: eventInsertError } = await supabase.from('stripe_events').insert({
      id: event.id,
      event_type: event.type,
      livemode: event.livemode,
      payload: event,
    });
    if (eventInsertError?.code === '23505') return json({ received: true, duplicate: true });
    if (eventInsertError) throw eventInsertError;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const planKey = session.metadata?.plan_key;
      const amount = Number(session.amount_total || 0);
      if (!expectedAmounts[planKey] || expectedAmounts[planKey] !== amount) {
        throw new Error('Checkout amount or plan metadata did not match the configured catalog.');
      }
      const email = String(session.customer_details?.email || session.customer_email || '').toLowerCase();
      let userId = null;
      if (email) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
        userId = profile?.id || null;
      }
      const { data: order, error: orderError } = await supabase.from('orders').upsert({
        user_id: userId,
        stripe_event_id: event.id,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        customer_email: email || null,
        plan_key: planKey,
        amount_total: amount,
        currency: String(session.currency || 'usd').toLowerCase(),
        status: session.payment_status === 'paid' ? 'paid' : session.payment_status,
      }, { onConflict: 'stripe_checkout_session_id' }).select('id').single();
      if (orderError) throw orderError;
      if (userId) {
        const projectName = planKey === 'homepage_reveal' ? 'Homepage Reveal project' : 'Quick Fix project';
        const { error: projectError } = await supabase.from('customer_projects').upsert({
          user_id: userId,
          order_id: order.id,
          name: projectName,
          plan_key: planKey,
          status: 'intake_pending',
        }, { onConflict: 'order_id' });
        if (projectError) throw projectError;
      }
    }

    await supabase.from('stripe_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id);
    return json({ received: true });
  } catch (error) {
    return handleError(error);
  }
};
`);

await write('netlify/functions/unsubscribe.mjs', String.raw`
import { handleError, html, json } from './_shared/http.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const page = (title, message) => '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + title + '</title><style>body{margin:0;background:#07111f;color:#eef5fb;font:16px/1.6 system-ui;min-height:100vh;display:grid;place-items:center;padding:20px}.card{max-width:580px;border:1px solid #294056;border-radius:22px;padding:36px;background:#0d1b2a}h1{letter-spacing:-.04em}p{color:#b8c7d5}a{color:#63e6d4}</style><main class="card"><h1>' + title + '</h1><p>' + message + '</p><a href="/">Return to AccessRevamp</a></main></html>';

export default async (request) => {
  try {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    const token = request.method === 'GET'
      ? new URL(request.url).searchParams.get('token')
      : (await request.json()).token;
    if (!token || !/^[a-f0-9]{48}$/.test(token)) {
      return request.method === 'GET' ? html(page('Invalid opt-out link', 'This opt-out link is incomplete or invalid.'), 400) : json({ error: 'Invalid token.' }, 400);
    }
    const supabase = getSupabaseAdmin();
    const { data: item, error: lookupError } = await supabase.from('outreach_queue').select('recipient_email').eq('opt_out_token', token).maybeSingle();
    if (lookupError) throw lookupError;
    if (!item) return request.method === 'GET' ? html(page('Opt-out link not found', 'This link may already have expired. Reply to the original message with “unsubscribe” and the address will be suppressed manually.'), 404) : json({ error: 'Token not found.' }, 404);
    const { error } = await supabase.from('suppression_list').upsert({
      email: item.recipient_email.toLowerCase(),
      reason: 'recipient_opt_out',
      source: 'one_click_link',
    }, { onConflict: 'email' });
    if (error) throw error;
    await supabase.from('outreach_queue').update({ status: 'canceled' }).eq('recipient_email', item.recipient_email).in('status', ['draft', 'approved', 'queued', 'scheduled']);
    return request.method === 'GET'
      ? html(page('You are opted out', 'This address has been added to the permanent AccessRevamp suppression list. No further outreach should be sent to it.'))
      : json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
};
`);

await write('netlify/functions/health.mjs', String.raw`
import { json } from './_shared/http.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
  return json({
    ok: true,
    service: 'accessrevamp',
    configured: {
      supabase: Boolean((process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY),
      stripe: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      contactRateLimit: Boolean(process.env.CONTACT_RATE_LIMIT_SECRET),
    },
  });
};
`);

await write('supabase/migrations/202607170001_accessrevamp.sql', String.raw`
-- AccessRevamp isolated application schema.
-- Apply only to the Supabase project intended for AccessRevamp.

create extension if not exists pgcrypto;

create or replace function public.set_accessrevamp_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_length check (char_length(email) between 3 and 254)
);
create unique index if not exists profiles_email_lower_uidx on public.profiles (lower(email));

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null default '',
  email text not null,
  website_url text,
  message text not null,
  user_agent text,
  status text not null default 'new' check (status in ('new','reviewing','replied','closed','spam')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contact_name_length check (char_length(first_name) between 1 and 80 and char_length(last_name) <= 80),
  constraint contact_email_length check (char_length(email) between 3 and 254),
  constraint contact_message_length check (char_length(message) between 20 and 4000)
);
create index if not exists contact_submissions_status_created_idx on public.contact_submissions (status, created_at desc);

create table if not exists public.contact_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count between 1 and 100),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_event_id text not null unique,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  customer_email text,
  plan_key text not null check (plan_key in ('homepage_reveal','quick_fix')),
  amount_total integer not null check ((plan_key = 'homepage_reveal' and amount_total = 5000) or (plan_key = 'quick_fix' and amount_total = 19900)),
  currency text not null default 'usd' check (currency = lower(currency) and char_length(currency) = 3),
  status text not null check (status in ('paid','unpaid','no_payment_required','refunded','partially_refunded','disputed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_customer_email_idx on public.orders (lower(customer_email));

create table if not exists public.customer_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid unique references public.orders(id) on delete set null,
  name text not null,
  website_url text,
  plan_key text not null check (plan_key in ('homepage_reveal','quick_fix')),
  status text not null default 'intake_pending' check (status in ('intake_pending','reviewing','concept','implementation','client_review','completed','paused','canceled')),
  scope_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists customer_projects_user_created_idx on public.customer_projects (user_id, created_at desc);

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  livemode boolean not null default false,
  payload jsonb not null,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  website_url text not null,
  contact_email text not null,
  contact_source_url text not null,
  public_contact_verified_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending','reviewing','approved','rejected')),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint prospect_email_length check (char_length(contact_email) between 3 and 254),
  constraint prospect_public_urls check (website_url ~* '^https?://' and contact_source_url ~* '^https?://')
);
create unique index if not exists prospects_website_uidx on public.prospects (lower(website_url));

create table if not exists public.findings (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  category text not null check (category in ('accessibility','usability','performance','content','seo','security_hygiene','conversion')),
  title text not null,
  summary text not null,
  evidence text not null,
  reference_url text,
  status text not null default 'candidate' check (status in ('candidate','verified','rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint verified_finding_has_review check (status <> 'verified' or (reviewed_by is not null and reviewed_at is not null))
);
create index if not exists findings_prospect_status_idx on public.findings (prospect_id, status);

create table if not exists public.outreach_settings (
  singleton boolean primary key default true check (singleton),
  sender_name text,
  sender_email text,
  postal_address text,
  site_url text,
  daily_limit integer not null default 20 check (daily_limit between 1 and 20),
  sending_enabled boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);
insert into public.outreach_settings (singleton, daily_limit, sending_enabled)
values (true, 20, false)
on conflict (singleton) do nothing;

create table if not exists public.suppression_list (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text not null default 'opt_out',
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  constraint suppression_email_length check (char_length(email) between 3 and 254)
);
create unique index if not exists suppression_email_lower_uidx on public.suppression_list (lower(email));

create table if not exists public.outreach_queue (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'draft' check (status in ('draft','approved','queued','scheduled','sent','failed','canceled')),
  human_approved_by text,
  human_approved_at timestamptz,
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  opt_out_token text not null default encode(gen_random_bytes(24), 'hex') unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint outreach_subject_length check (char_length(subject) between 8 and 120),
  constraint outreach_body_length check (char_length(body_text) between 80 and 8000),
  constraint outreach_approval_fields check (status = 'draft' or (human_approved_by is not null and human_approved_at is not null))
);
create index if not exists outreach_queue_status_schedule_idx on public.outreach_queue (status, scheduled_for);
create index if not exists outreach_queue_recipient_idx on public.outreach_queue (lower(recipient_email), created_at desc);

create table if not exists public.accessrevamp_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_accessrevamp_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(coalesce(new.email, '')), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name), updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_changed_accessrevamp on auth.users;
create trigger on_auth_user_changed_accessrevamp
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_accessrevamp_user();

create or replace function public.submit_accessrevamp_contact(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_website_url text,
  p_message text,
  p_rate_key text,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window timestamptz;
  v_count integer;
  v_id uuid;
begin
  if p_rate_key is null or char_length(p_rate_key) < 32 then raise exception 'Invalid rate key'; end if;
  if char_length(trim(p_first_name)) not between 1 and 80 then raise exception 'Invalid first name'; end if;
  if char_length(trim(p_email)) not between 3 and 254 then raise exception 'Invalid email'; end if;
  if char_length(trim(p_message)) not between 20 and 4000 then raise exception 'Invalid message'; end if;
  if p_website_url is not null and p_website_url !~* '^https?://' then raise exception 'Invalid website URL'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_rate_key, 0));
  select window_started_at, request_count into v_window, v_count from public.contact_rate_limits where rate_key = p_rate_key for update;
  if not found or v_window < v_now - interval '1 hour' then
    insert into public.contact_rate_limits (rate_key, window_started_at, request_count, updated_at)
    values (p_rate_key, v_now, 1, v_now)
    on conflict (rate_key) do update set window_started_at = excluded.window_started_at, request_count = 1, updated_at = excluded.updated_at;
  else
    if v_count >= 5 then raise exception 'Rate limit exceeded'; end if;
    update public.contact_rate_limits set request_count = request_count + 1, updated_at = v_now where rate_key = p_rate_key;
  end if;

  insert into public.contact_submissions (first_name, last_name, email, website_url, message, user_agent)
  values (trim(p_first_name), trim(coalesce(p_last_name, '')), lower(trim(p_email)), nullif(trim(coalesce(p_website_url, '')), ''), trim(p_message), left(coalesce(p_user_agent, ''), 500))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.enforce_accessrevamp_outreach()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prospect public.prospects%rowtype;
  v_settings public.outreach_settings%rowtype;
  v_today_count integer;
  v_recent_count integer;
begin
  new.recipient_email := lower(trim(new.recipient_email));
  if new.status = 'draft' then return new; end if;

  select * into v_prospect from public.prospects where id = new.prospect_id;
  if not found then raise exception 'Prospect not found'; end if;
  if v_prospect.review_status <> 'approved' or v_prospect.public_contact_verified_at is null then
    raise exception 'Prospect must be approved and public contact must be verified';
  end if;
  if lower(v_prospect.contact_email) <> new.recipient_email then raise exception 'Recipient must match verified public contact'; end if;
  if exists (select 1 from public.suppression_list where lower(email) = new.recipient_email) then raise exception 'Recipient is suppressed'; end if;
  if not exists (select 1 from public.findings where prospect_id = new.prospect_id and status = 'verified') then
    raise exception 'At least one human-verified finding is required';
  end if;
  if new.human_approved_by is null or new.human_approved_at is null then raise exception 'Human approval is required'; end if;
  if position('unsubscribe' in lower(new.body_text)) = 0 and position('opt out' in lower(new.body_text)) = 0 then
    raise exception 'Message must include an opt-out instruction';
  end if;

  select * into v_settings from public.outreach_settings where singleton = true;
  if v_settings.sender_name is null or v_settings.sender_email is null or v_settings.postal_address is null or v_settings.site_url is null then
    raise exception 'Sender identity, reply email, postal address, and site URL must be configured';
  end if;
  if new.status in ('queued','scheduled','sent') and not v_settings.sending_enabled then raise exception 'Sending is disabled'; end if;

  if new.status in ('queued','scheduled','sent') then
    select count(*) into v_today_count
    from public.outreach_queue
    where id <> new.id
      and status in ('queued','scheduled','sent')
      and coalesce(scheduled_for, sent_at, created_at)::date = timezone('utc', now())::date;
    if v_today_count >= least(v_settings.daily_limit, 20) then raise exception 'Daily outreach limit of 20 reached'; end if;

    select count(*) into v_recent_count
    from public.outreach_queue
    where id <> new.id
      and lower(recipient_email) = new.recipient_email
      and status in ('scheduled','sent')
      and created_at >= timezone('utc', now()) - interval '30 days';
    if v_recent_count > 0 then raise exception 'Recipient was already contacted in the last 30 days'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_accessrevamp_outreach_trigger on public.outreach_queue;
create trigger enforce_accessrevamp_outreach_trigger
before insert or update on public.outreach_queue
for each row execute function public.enforce_accessrevamp_outreach();

create trigger profiles_accessrevamp_updated_at before update on public.profiles for each row execute function public.set_accessrevamp_updated_at();
create trigger contacts_accessrevamp_updated_at before update on public.contact_submissions for each row execute function public.set_accessrevamp_updated_at();
create trigger orders_accessrevamp_updated_at before update on public.orders for each row execute function public.set_accessrevamp_updated_at();
create trigger projects_accessrevamp_updated_at before update on public.customer_projects for each row execute function public.set_accessrevamp_updated_at();
create trigger prospects_accessrevamp_updated_at before update on public.prospects for each row execute function public.set_accessrevamp_updated_at();
create trigger findings_accessrevamp_updated_at before update on public.findings for each row execute function public.set_accessrevamp_updated_at();
create trigger outreach_accessrevamp_updated_at before update on public.outreach_queue for each row execute function public.set_accessrevamp_updated_at();

alter table public.profiles enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.contact_rate_limits enable row level security;
alter table public.orders enable row level security;
alter table public.customer_projects enable row level security;
alter table public.stripe_events enable row level security;
alter table public.prospects enable row level security;
alter table public.findings enable row level security;
alter table public.outreach_settings enable row level security;
alter table public.suppression_list enable row level security;
alter table public.outreach_queue enable row level security;
alter table public.accessrevamp_audit_log enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on function public.submit_accessrevamp_contact(text,text,text,text,text,text,text) from public;

grant usage on schema public to anon, authenticated;
grant execute on function public.submit_accessrevamp_contact(text,text,text,text,text,text,text) to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.customer_projects to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy orders_select_own on public.orders for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_select_own on public.customer_projects for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.outreach_queue is 'Draft and approved business outreach. No provider send is implemented in the database.';
comment on function public.enforce_accessrevamp_outreach() is 'Enforces verified public contact, human approval, opt-out text, sender identity, suppression, 30-day spacing, and a hard maximum of 20 queued/scheduled/sent items per UTC day.';
`);

await write('supabase/config.toml', String.raw`
project_id = "accessrevamp"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
max_rows = 1000

[db]
port = 54322
major_version = 17

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:5173"
additional_redirect_urls = ["https://**--accessrevamp.netlify.app/**"]
enable_signup = true
minimum_password_length = 10
`);

await write('scripts/check.mjs', String.raw`
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['src', 'netlify', 'supabase', 'docs', 'README.md', '.env.example', 'netlify.toml'];
const files = [];
async function collect(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path));
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) await collect(join(path, entry));
  } else files.push(path);
}
for (const root of roots) await collect(root);

const forbidden = [
  /\$\s*79\b/i,
  /\$\s*80\b/i,
  /\$\s*400\b/i,
  /\$\s*999\b/i,
  /\$\s*2,?500\b/i,
  /\$\s*99\s*(?:-|to)\s*\$?\s*300\s*\/\s*month/i,
  /guaranteed\s+(?:compliance|security|revenue|sales)/i,
];
const failures = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const pattern of forbidden) if (pattern.test(text)) failures.push(file + ' matched ' + pattern);
}
const config = await readFile('src/config.js', 'utf8');
if (!/amount:\s*5000\b/.test(config)) failures.push('Homepage Reveal must be exactly 5000 cents.');
if (!/amount:\s*19900\b/.test(config)) failures.push('Quick Fix must be exactly 19900 cents.');
if ((config.match(/cadence:\s*'one-time'/g) || []).length !== 2) failures.push('Both catalog entries must be one-time.');
const migration = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');
if (!/daily_limit[^\n]+20/.test(migration) || !/Daily outreach limit of 20 reached/.test(migration)) failures.push('Database outreach ceiling is missing.');
if (!/suppression_list/.test(migration)) failures.push('Permanent suppression list is missing.');
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Static policy and catalog checks passed across ' + files.length + ' files.');
`);

await write('scripts/export-approved-outreach.mjs', String.raw`
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('outreach_queue')
  .select('id,recipient_email,subject,body_text,opt_out_token,prospects(business_name,website_url,contact_source_url)')
  .eq('status', 'approved')
  .order('created_at', { ascending: true })
  .limit(20);
if (error) throw error;
const quote = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const rows = [['queue_id','business_name','website_url','contact_source_url','recipient_email','subject','body_text','opt_out_token']];
for (const item of data || []) rows.push([item.id,item.prospects?.business_name,item.prospects?.website_url,item.prospects?.contact_source_url,item.recipient_email,item.subject,item.body_text,item.opt_out_token]);
const csv = rows.map((row) => row.map(quote).join(',')).join('\n') + '\n';
const output = process.argv[2] || 'approved-outreach.csv';
await writeFile(output, csv, 'utf8');
console.log('Exported ' + Math.max(rows.length - 1, 0) + ' approved rows to ' + output + '. No email was sent.');
`);

await write('scripts/google-drive-review.gs', String.raw`
/**
 * Optional Google Sheets review bridge.
 * Import the CSV produced by scripts/export-approved-outreach.mjs.
 * This script deliberately does not send email.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('AccessRevamp')
    .addItem('Prepare review columns', 'prepareAccessRevampReview')
    .addToUi();
}

function prepareAccessRevampReview() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn) throw new Error('Import approved-outreach.csv first.');
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  if (!headers.includes('queue_id')) throw new Error('This does not look like an AccessRevamp export.');
  const reviewHeaders = ['human_decision', 'reviewer', 'reviewed_at', 'review_notes'];
  sheet.getRange(1, lastColumn + 1, 1, reviewHeaders.length).setValues([reviewHeaders]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, lastColumn + reviewHeaders.length);
  SpreadsheetApp.getUi().alert('Review columns added. This sheet cannot send email; approved decisions must be imported by the secured backend.');
}
`);

await write('tests/catalog.test.mjs', String.raw`
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('catalog exposes only the two approved one-time amounts', async () => {
  const source = await readFile('src/config.js', 'utf8');
  assert.match(source, /homepage_reveal[\s\S]*amount:\s*5000\b/);
  assert.match(source, /quick_fix[\s\S]*amount:\s*19900\b/);
  assert.equal((source.match(/cadence:\s*'one-time'/g) || []).length, 2);
  assert.doesNotMatch(source, /recurring|subscription_price/i);
});

test('Stripe identifiers match the configured sandbox catalog', async () => {
  const source = await readFile('src/config.js', 'utf8');
  assert.match(source, /price_1TuGoNLzyGRcyGQJRjtGsiMV/);
  assert.match(source, /price_1TuGoTLzyGRcyGQJfdkqoE3f/);
});
`);

await write('tests/validation.test.mjs', String.raw`
import test from 'node:test';
import assert from 'node:assert/strict';
import { contactSchema, outreachDraftSchema } from '../netlify/functions/_shared/validation.mjs';

test('contact validation accepts a bounded legitimate request', () => {
  const result = contactSchema.parse({
    firstName: 'Avery',
    lastName: 'Stone',
    email: 'OWNER@EXAMPLE.COM',
    websiteUrl: 'https://example.com',
    message: 'I would like a clearer homepage hierarchy for my public storefront.',
    companyFax: '',
    consent: true,
  });
  assert.equal(result.email, 'owner@example.com');
});

test('contact validation rejects localhost and honeypot submissions', () => {
  assert.throws(() => contactSchema.parse({ firstName: 'A', lastName: '', email: 'a@example.com', websiteUrl: 'http://localhost:3000', message: 'This message is long enough for validation.', companyFax: 'bot', consent: true }));
});

test('outreach draft requires public contact provenance and substantive copy', () => {
  assert.throws(() => outreachDraftSchema.parse({ businessName: 'Shop', websiteUrl: 'https://shop.example', recipientEmail: 'owner@example.com', contactSourceUrl: 'not-a-url', subject: 'Hello there', bodyText: 'Too short' }));
});
`);

await write('tests/database-guardrails.test.mjs', String.raw`
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile('supabase/migrations/202607170001_accessrevamp.sql', 'utf8');

test('outreach is capped at twenty and disabled by default', () => {
  assert.match(sql, /daily_limit integer not null default 20 check \(daily_limit between 1 and 20\)/);
  assert.match(sql, /sending_enabled boolean not null default false/);
  assert.match(sql, /Daily outreach limit of 20 reached/);
});

test('human review, verified evidence, provenance, and suppression are enforced', () => {
  assert.match(sql, /public_contact_verified_at/);
  assert.match(sql, /At least one human-verified finding is required/);
  assert.match(sql, /Human approval is required/);
  assert.match(sql, /Recipient is suppressed/);
  assert.match(sql, /Recipient was already contacted in the last 30 days/);
});

test('customer tables have row-level security', () => {
  assert.match(sql, /alter table public\.profiles enable row level security/);
  assert.match(sql, /profiles_select_own/);
  assert.match(sql, /orders_select_own/);
  assert.match(sql, /projects_select_own/);
});
`);

await write('.github/workflows/ci.yml', String.raw`
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 12
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm audit --audit-level=high
`);

await write('.github/dependabot.yml', String.raw`
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: monthly
`);

await write('README.md', String.raw`
# AccessRevamp

A production-oriented storefront review and one-time website revamp platform built from the AccessRevamp blueprint.

## Commercial catalog

| Service | Price | Billing | Scope |
|---|---:|---|---|
| Homepage Reveal | **$50** | One time | Human-reviewed homepage findings, evidence, accessibility/usability and passive technical observations, prioritized guidance, and the complete first-screen concept reveal. |
| Quick Fix Plan | **$199** | One time | The agreed full website revamp, the reviewed findings, responsive/accessibility/usability checks, retest notes, and practical customer-reach, advertising, and monetization recommendations. |

There are no monthly plans, hidden implementation tiers, or recurring AccessRevamp platform charges. Scope must still be confirmed in writing, and legally required taxes cannot be misrepresented.

## What is included

- Polished responsive landing experience and client-side routing
- Pricing, sample report, methodology, outreach standards, contact, auth, dashboard, privacy, terms, accessibility, and checkout-result views
- Supabase Auth client and row-level-security-aware dashboard
- Rate-limited contact function
- Stripe one-time Checkout Session function and signature-verified webhook
- Idempotent order recording
- Supabase migration for customers, orders, projects, reviewed findings, prospects, outreach queue, permanent suppression, and audit records
- Database-enforced maximum of 20 queued/scheduled/sent outreach items per UTC day
- Human approval, public contact provenance, verified-finding, sender identity, opt-out, 30-day spacing, and suppression gates
- Optional Google Sheets review bridge that **does not send mail**
- Netlify free-tier deployment configuration and GitHub Actions CI

## Current Stripe state

The repository points to the AccessRevamp Stripe **sandbox** catalog created for this project:

- Homepage Reveal price: `price_1TuGoNLzyGRcyGQJRjtGsiMV`
- Quick Fix price: `price_1TuGoTLzyGRcyGQJfdkqoE3f`

The default payment URLs are test links. Replace them with live-mode links only after the Stripe account is activated, business details are complete, and live checkout is tested. Never put a Stripe secret key in a `VITE_` variable.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Run the full quality gate:

```bash
npm run check
npm audit --audit-level=high
```

## Supabase setup

1. Confirm you are in the dedicated AccessRevamp Supabase project. Do not apply this migration to a different application's database.
2. Apply `supabase/migrations/202607170001_accessrevamp.sql` with the Supabase CLI or dashboard.
3. Copy the project URL and publishable key into the two public `VITE_SUPABASE_*` variables.
4. Add the service-role key only as the server-only `SUPABASE_SERVICE_ROLE_KEY` variable in Netlify.
5. Configure Auth site and redirect URLs for the final Netlify URL.
6. Run Supabase security and performance advisors after the migration.

## Netlify deployment (free URL)

1. Import this GitHub repository into Netlify.
2. Netlify reads `netlify.toml`; no build settings need to be guessed.
3. Add all required variables from `.env.example` in the Netlify environment UI.
4. Generate a random `CONTACT_RATE_LIMIT_SECRET` of at least 24 characters.
5. Deploy and confirm `/.netlify/functions/health` reports the expected services as configured.
6. Add the deployed Stripe webhook URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`.
7. Subscribe the endpoint to `checkout.session.completed` at minimum.

The initial free address will be a `*.netlify.app` URL. Buy a custom domain only after the business is ready.

## Outreach is intentionally approval-gated

No commercial email provider is wired to an unattended send loop. Before enabling any sender, configure:

- a real sender name and reply-capable mailbox;
- a valid business postal address;
- the final AccessRevamp site URL;
- DNS authentication appropriate to the sending provider;
- a reviewed message with source URL and verified findings;
- the permanent suppression and one-click opt-out path;
- the relevant legal requirements for every recipient jurisdiction.

See [docs/OUTREACH_STANDARD.md](docs/OUTREACH_STANDARD.md).

## Security boundaries

The initial review is passive. It must not submit forms, open checkout, create accounts, use credentials, probe admin/login/cart paths, connect to private IPs, perform exploitation, or describe unverified signals as proven vulnerabilities. See [docs/SECURITY.md](docs/SECURITY.md).

## Required launch items not stored in Git

- Final contact email
- Business legal identity and postal address
- Correct dedicated Supabase project values
- Netlify site connection and environment values
- Stripe live-mode products/links/webhook secret after activation
- Reviewed privacy/terms language for the operating jurisdiction

Secrets belong in the deployment provider, never in this repository.
`);

await write('docs/DEPLOYMENT.md', String.raw`
# Deployment runbook

## 1. Preflight

- `npm ci`
- `npm run check`
- `npm audit --audit-level=high`
- Confirm only the two approved one-time catalog entries appear.
- Confirm the displayed contact identity and legal pages are accurate.

## 2. Supabase

Apply the migration only after the connector or CLI clearly identifies the dedicated AccessRevamp project. Then run security and performance advisors. Configure Auth URLs for localhost, deploy previews, and the production Netlify address. Use the publishable key in the browser and the service-role key only in Netlify functions.

## 3. Stripe

Use sandbox mode through end-to-end testing. Add the Netlify webhook endpoint and verify signature handling plus duplicate event delivery. Move to live mode by creating or confirming the two live one-time prices, replacing only deployment variables, and testing a real low-risk transaction according to Stripe's launch process.

## 4. Netlify

Import the repository, add variables from `.env.example`, and deploy. The configuration supplies the build command, publish directory, function directory, SPA fallback, cache policy, and security headers.

## 5. Acceptance checks

- Keyboard-only navigation through every route
- Mobile layout at narrow widths
- Contact success, validation, honeypot, rate limit, and failure states
- Signup, confirmation, login, logout, RLS, and dashboard empty states
- Stripe test checkout and webhook replay
- Opt-out link, suppression insert, and cancellation of unsent queue items
- Daily outreach guard at item 21
- No secrets or real customer data in logs, source maps, screenshots, or Git history
`);

await write('docs/OUTREACH_STANDARD.md', String.raw`
# Responsible outreach standard

AccessRevamp may prepare up to 20 first-touch business messages per UTC day only after every database gate passes.

## Allowed source data

Use a business contact address that the business intentionally publishes for relevant inquiries. Record the page where the address appears and the public storefront URL. Do not buy opaque lists, infer private addresses, evade access controls, or collect sensitive personal data.

## Claim standard

A passive signal is not proof of a vulnerability. Customer-facing copy may describe a verified accessibility, usability, content, performance, or security-hygiene observation with evidence and a clear limitation. It must not imply compromise, breach, legal noncompliance, or guaranteed financial impact.

## Required message elements

- Honest sender and business identity
- Specific reason the message is relevant
- Public page reviewed
- Accurate, restrained observation
- AccessRevamp website URL
- Exact one-time price when a plan is mentioned: $50 or $199
- Working reply path
- Valid postal address where required
- Clear opt-out and one-click suppression link

## Approval and sending

The backend stores drafts and approved queue items but does not provide an unattended commercial send loop. A sender may be connected only after legal review, mailbox and DNS setup, bounce handling, complaint handling, suppression tests, and a final human approval workflow.

A reply requesting no further contact must be added to `suppression_list` immediately, even when the one-click link was not used.
`);

await write('docs/SECURITY.md', String.raw`
# Security model

## Public review boundary

The review process is passive and limited to ordinary public-page retrieval. It excludes:

- login, signup, account, admin, cart, checkout, and private routes;
- form submission, state-changing requests, WebSockets, popups, and file uploads;
- credentials, customer records, access tokens, and private documents;
- private, loopback, link-local, and cloud metadata IP ranges;
- vulnerability exploitation, stress testing, and bypass attempts.

## Application controls

- Supabase Row Level Security on customer-facing tables
- Service-role key restricted to server functions
- Same-origin enforcement for browser writes
- Strict schemas and body-size limits
- HMAC-derived contact rate keys rather than raw IP storage
- Stripe signature verification and event idempotency
- Exact amount/plan validation before an order is recorded
- Permanent outreach suppression and one-click opt-out
- Security headers and restrictive Content Security Policy
- No secret values in the repository

## Reporting

Use the contact form with the affected URL and a concise reproduction. Do not include secrets or personal data. A real security contact email should be added before public launch.
`);

await write('docs/EMAIL_TEMPLATE.md', String.raw`
# Human-reviewed outreach template

**Subject:** A specific homepage observation for {{business_name}}

Hi {{contact_name_or_team}},

I reviewed the public homepage at {{website_url}} and noticed {{one_verified_observation}}. {{one_sentence_impact_with_no_guarantee}}

AccessRevamp prepares a human-reviewed findings report and homepage concept for a one-time **$50**, or an agreed complete website revamp with the report and practical growth recommendations for a one-time **$199**. There is no subscription.

Method and sample: {{accessrevamp_site_url}}

If this is not relevant, reply “no thanks” or use this opt-out link: {{one_click_opt_out_url}}. We will add this address to our permanent suppression list.

{{real_sender_name}}
AccessRevamp
{{working_reply_email}}
{{valid_postal_address}}

Do not send this template until every placeholder is real, the observation is verified, and the recipient is human approved.
`);

console.log('AccessRevamp backend, migration, tests, and runbooks generated.');
