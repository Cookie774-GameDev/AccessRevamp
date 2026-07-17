import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,64}$/;
const THEME_CLASSES = new Set(['midnight', 'ivory', 'graphite']);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function text(value, fallback, maxLength) {
  const normalized = String(value || '').trim();
  return (normalized || fallback).slice(0, maxLength);
}

function conceptFrom(value) {
  const payload = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const proofPoints = Array.isArray(payload.proofPoints)
    ? payload.proofPoints.map((item) => text(item, '', 90)).filter(Boolean).slice(0, 3)
    : [];
  return {
    brandName: text(payload.brandName, 'Storefront concept', 80),
    eyebrow: text(payload.eyebrow, 'A clearer first screen', 80),
    headline: text(payload.headline, 'Make the next step unmistakable.', 160),
    subheadline: text(payload.subheadline, 'A focused message, accessible interaction states, and one primary action can make the homepage easier to understand and use.', 360),
    ctaLabel: text(payload.ctaLabel, 'Explore the concept', 48),
    proofPoints: proofPoints.length ? proofPoints : ['Clear hierarchy', 'Accessible interaction states', 'Responsive first-screen layout'],
    theme: THEME_CLASSES.has(payload.theme) ? payload.theme : 'midnight',
  };
}

function response(markup, status = 200) {
  return new Response(markup, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'cross-origin-opener-policy': 'same-origin',
      'cross-origin-resource-policy': 'same-origin',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-robots-tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  });
}

function statusPage(title, message, status) {
  return response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · AccessRevamp</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#07111f;color:#eef5fb;font:16px/1.65 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.card{width:min(620px,100%);padding:40px;border:1px solid #2a4054;border-radius:28px;background:#0d1b2a;box-shadow:0 30px 80px #0008}.eyebrow{color:#6ee7d8;font-size:.78rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{margin:.7rem 0;font-size:clamp(2rem,6vw,3.4rem);line-height:1.02;letter-spacing:-.05em}p{color:#bdcad6}a{color:#6ee7d8}</style><main class="card"><span class="eyebrow">Private AccessRevamp preview</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><a href="/">Return to AccessRevamp</a></main></html>`, status);
}

export default async (request) => {
  if (request.method !== 'GET') return statusPage('Method not allowed', 'Open the private preview link in a browser.', 405);

  const token = new URL(request.url).searchParams.get('token') || '';
  if (!TOKEN_PATTERN.test(token)) return statusPage('Preview not found', 'This private preview link is incomplete or invalid.', 404);

  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const supabase = getSupabaseAdmin();
    const { data: preview, error } = await supabase
      .from('previews')
      .select('id,source_url,concept_payload,status,expires_at,human_approved_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!preview || !preview.human_approved_at || preview.status === 'revoked') {
      return statusPage('Preview not found', 'This private concept is unavailable.', 404);
    }

    const expiresAt = new Date(preview.expires_at);
    if (preview.status !== 'active' || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      if (preview.status === 'active') {
        await supabase.from('previews').update({ status: 'expired' }).eq('id', preview.id);
      }
      return statusPage('This preview has expired', 'Private concepts are temporary. Contact AccessRevamp if the business would like a fresh review.', 410);
    }

    const concept = conceptFrom(preview.concept_payload);
    const sourceHost = new URL(preview.source_url).hostname.replace(/^www\./, '');
    const expiresLabel = expiresAt.toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' });
    const proofMarkup = concept.proofPoints.map((item) => `<li><span aria-hidden="true">✓</span>${escapeHtml(item)}</li>`).join('');

    return response(`<!doctype html>
<html lang="en" class="${concept.theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
  <title>${escapeHtml(concept.brandName)} · Private AccessRevamp Concept</title>
  <style>
    :root{color-scheme:dark;--bg:#07111f;--surface:#0d1b2a;--surface-2:#132639;--text:#f3f8fb;--muted:#b8c6d2;--line:#2d465b;--accent:#69e6d6;--accent-text:#062421;--glow:#4bd7c628}
    :root.ivory{color-scheme:light;--bg:#f4f0e8;--surface:#fffdf9;--surface-2:#e9e2d5;--text:#1a252c;--muted:#526067;--line:#cfc7b9;--accent:#125f5b;--accent-text:#fff;--glow:#125f5b18}
    :root.graphite{--bg:#101214;--surface:#171a1d;--surface-2:#20252a;--text:#f7f7f4;--muted:#c1c6c8;--line:#363c41;--accent:#d8ff5f;--accent-text:#1b2200;--glow:#d8ff5f18}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 78% 10%,var(--glow),transparent 34%),var(--bg);color:var(--text);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}.watermark{position:sticky;top:0;z-index:3;display:flex;justify-content:center;padding:10px 20px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(18px);font-size:.76rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.shell{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.nav{width:min(1160px,calc(100% - 36px));margin:auto;padding:26px 0;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{display:flex;align-items:center;gap:12px;font-weight:850;letter-spacing:-.02em}.mark{display:grid;place-items:center;width:40px;height:40px;border:1px solid var(--line);border-radius:13px;background:var(--surface);color:var(--accent)}.tag{padding:8px 12px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.78rem}.hero{width:min(1160px,calc(100% - 36px));margin:auto;padding:clamp(58px,10vw,120px) 0;display:grid;grid-template-columns:minmax(0,1.08fr) minmax(300px,.92fr);gap:clamp(36px,7vw,90px);align-items:center}.eyebrow{display:inline-flex;align-items:center;gap:9px;color:var(--accent);font-size:.78rem;font-weight:850;letter-spacing:.13em;text-transform:uppercase}.eyebrow:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 7px var(--glow)}h1{max-width:780px;margin:18px 0 22px;font-size:clamp(3rem,7.4vw,6.6rem);line-height:.92;letter-spacing:-.068em}p{margin:0;color:var(--muted)}.lede{max-width:690px;font-size:clamp(1.08rem,2vw,1.3rem)}.actions{display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-top:34px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 22px;border-radius:14px;background:var(--accent);color:var(--accent-text);font-weight:850;text-decoration:none}.note{font-size:.84rem}.panel{position:relative;padding:30px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(145deg,var(--surface),var(--surface-2));box-shadow:0 34px 90px #0005;overflow:hidden}.panel:before{content:"";position:absolute;inset:-80px -90px auto auto;width:220px;height:220px;border-radius:50%;background:var(--glow);filter:blur(4px)}.panel>*{position:relative}.panel-label{font-size:.75rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.panel h2{margin:16px 0 12px;font-size:clamp(1.8rem,4vw,3.2rem);line-height:1;letter-spacing:-.05em}.proof{display:grid;gap:12px;margin:30px 0 0;padding:0;list-style:none}.proof li{display:flex;align-items:center;gap:12px;padding:13px 15px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--surface) 78%,transparent)}.proof span{color:var(--accent);font-weight:900}.footer{width:min(1160px,calc(100% - 36px));margin:auto;padding:26px 0 34px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:18px;color:var(--muted);font-size:.82rem}@media(max-width:820px){.hero{grid-template-columns:1fr;padding-top:54px}.nav{align-items:flex-start}.tag{max-width:180px}.footer{flex-direction:column}h1{font-size:clamp(3.2rem,15vw,5.2rem)}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  </style>
</head>
<body>
  <div class="shell">
    <div class="watermark">Private AccessRevamp Concept · Not the live website</div>
    <nav class="nav" aria-label="Concept navigation"><div class="brand"><span class="mark" aria-hidden="true">A</span><span>${escapeHtml(concept.brandName)}</span></div><span class="tag">Prepared for ${escapeHtml(sourceHost)}</span></nav>
    <main class="hero">
      <section><span class="eyebrow">${escapeHtml(concept.eyebrow)}</span><h1>${escapeHtml(concept.headline)}</h1><p class="lede">${escapeHtml(concept.subheadline)}</p><div class="actions"><a class="button" href="#concept-details">${escapeHtml(concept.ctaLabel)}</a><span class="note">Concept only—no inventory, account, or checkout connection.</span></div></section>
      <aside class="panel" id="concept-details"><span class="panel-label">First-screen direction</span><h2>Clearer by design.</h2><p>This private composition illustrates hierarchy and interaction direction. Final implementation follows a written scope and a separate review.</p><ul class="proof">${proofMarkup}</ul></aside>
    </main>
    <footer class="footer"><span>AccessRevamp · See the barrier. Preview the fix.</span><span>Private link expires ${escapeHtml(expiresLabel)} UTC.</span></footer>
  </div>
</body>
</html>`);
  } catch (error) {
    console.error(error);
    return statusPage('Preview temporarily unavailable', 'The private preview could not be loaded. Please contact AccessRevamp.', 503);
  }
};
