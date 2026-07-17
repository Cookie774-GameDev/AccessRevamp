import { handleError, html } from './_shared/http.mjs';
import { hashPreviewToken } from './_shared/secure-tokens.mjs';
import { getSupabaseAdmin } from './_shared/supabase-admin.mjs';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
})[character]);

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${escapeHtml(title)} | Private AccessRevamp Concept</title>
  <style>
    :root{color-scheme:dark;--ink:#f4f8fb;--muted:#a9b8c5;--line:#274057;--panel:#0e1b29;--accent:#70e7d3;--accent2:#87a7ff}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 75% 10%,#172b44 0,transparent 36%),#07111c;color:var(--ink);font:16px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .notice{position:sticky;top:0;z-index:3;padding:12px 20px;border-bottom:1px solid var(--line);background:rgba(7,17,28,.94);backdrop-filter:blur(16px);text-align:center;color:var(--muted);font-size:13px;letter-spacing:.02em}.notice strong{color:var(--ink)}
    .wrap{width:min(1160px,calc(100% - 36px));margin:0 auto;padding:46px 0 70px}.top{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.brand{display:flex;align-items:center;gap:12px;font-weight:750}.mark{display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#07111c}.meta{color:var(--muted);font-size:13px;text-align:right}
    .concept{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:30px;background:linear-gradient(145deg,rgba(18,36,54,.98),rgba(8,18,30,.98));box-shadow:0 30px 90px rgba(0,0,0,.35)}.watermark{position:absolute;right:24px;top:22px;color:rgba(244,248,251,.35);font-size:11px;text-transform:uppercase;letter-spacing:.14em}
    .nav{display:flex;align-items:center;justify-content:space-between;padding:24px 30px;border-bottom:1px solid rgba(255,255,255,.08)}.store{font-size:18px;font-weight:800}.navlinks{display:flex;gap:22px;color:var(--muted);font-size:14px}.hero{display:grid;grid-template-columns:1.12fr .88fr;min-height:560px}.copy{display:flex;flex-direction:column;justify-content:center;padding:70px clamp(30px,7vw,90px)}.eyebrow{color:var(--accent);font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.copy h1{max-width:760px;margin:16px 0 20px;font-size:clamp(42px,6vw,78px);line-height:.98;letter-spacing:-.055em}.sub{max-width:650px;color:var(--muted);font-size:clamp(17px,2vw,21px)}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 21px;border-radius:999px;border:1px solid var(--line);font-weight:750}.primary{border-color:transparent;background:var(--accent);color:#07111c}.proof{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}.proof span{padding:9px 12px;border:1px solid rgba(255,255,255,.09);border-radius:999px;color:#c8d4de;font-size:13px}
    .visual{display:grid;place-items:center;min-height:100%;padding:46px;background:linear-gradient(160deg,rgba(112,231,211,.13),rgba(135,167,255,.08))}.visual-card{width:min(100%,410px);padding:24px;border:1px solid rgba(255,255,255,.12);border-radius:24px;background:rgba(7,17,28,.72);box-shadow:0 24px 70px rgba(0,0,0,.28)}.visual-card small{color:var(--accent);text-transform:uppercase;letter-spacing:.12em}.visual-card h2{margin:12px 0;font-size:26px;letter-spacing:-.03em}.visual-card p{color:var(--muted)}.bars{display:grid;gap:10px;margin-top:24px}.bars span{display:block;height:11px;border-radius:999px;background:linear-gradient(90deg,var(--accent),var(--accent2))}.bars span:nth-child(2){width:78%;opacity:.78}.bars span:nth-child(3){width:58%;opacity:.55}
    .finding{display:grid;grid-template-columns:auto 1fr;gap:16px;margin:24px 0 0;padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--panel)}.finding b{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:rgba(112,231,211,.12);color:var(--accent)}.finding h2{margin:0 0 5px;font-size:17px}.finding p{margin:0;color:var(--muted)}
    @media(max-width:820px){.hero{grid-template-columns:1fr}.visual{min-height:360px}.navlinks{display:none}.copy{padding:62px 30px}.top{align-items:flex-start}.meta{max-width:180px}.watermark{top:auto;bottom:16px}.finding{grid-template-columns:1fr}}
  </style>
</head>
<body>${body}</body>
</html>`;
}

export default async (request) => {
  try {
    if (request.method !== 'GET') {
      return html(page('Method not allowed', '<div class="notice">Method not allowed.</div>'), 405);
    }

    const token = new URL(request.url).searchParams.get('token') || '';
    let tokenHash;
    try {
      tokenHash = hashPreviewToken(token);
    } catch {
      return html(page('Invalid preview', '<div class="notice">This private preview link is invalid.</div>'), 400, {
        'x-robots-tag': 'noindex, nofollow, noarchive',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: preview, error } = await supabase
      .from('ar_previews')
      .select('id,business_name,website_url,concept,finding_summary,affected_users,watermark,expires_at')
      .eq('token_hash', tokenHash)
      .eq('status', 'approved')
      .eq('noindex', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error) throw error;

    if (!preview) {
      return html(page('Preview unavailable', '<div class="notice"><strong>Preview unavailable.</strong> It may have expired or been revoked.</div>'), 404, {
        'x-robots-tag': 'noindex, nofollow, noarchive',
      });
    }

    const concept = preview.concept && typeof preview.concept === 'object' ? preview.concept : {};
    const proofPoints = Array.isArray(concept.proofPoints)
      ? concept.proofPoints.slice(0, 4).map((item) => escapeHtml(String(item).slice(0, 120)))
      : ['Clearer hierarchy', 'Accessible interaction states', 'Focused primary action'];
    const businessName = escapeHtml(preview.business_name);
    const eyebrow = escapeHtml(concept.eyebrow || 'A clearer storefront experience');
    const headline = escapeHtml(concept.headline || 'Make the first screen easier to understand and act on.');
    const subheadline = escapeHtml(concept.subheadline || 'A private concept showing one possible direction for a clearer, more accessible homepage.');
    const primaryCta = escapeHtml(concept.primaryCta || 'Explore the collection');
    const secondaryCta = escapeHtml(concept.secondaryCta || 'Learn more');
    const findingSummary = escapeHtml(preview.finding_summary);
    const affectedUsers = escapeHtml(preview.affected_users || 'Some visitors');
    const expires = new Date(preview.expires_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
    });

    const body = `<div class="notice"><strong>Private concept preview.</strong> Not the live website, not connected to inventory, checkout, accounts, or the business backend.</div>
      <main class="wrap">
        <div class="top"><div class="brand"><span class="mark">A</span><span>AccessRevamp</span></div><div class="meta">Private link · noindex<br>Expires ${escapeHtml(expires)}</div></div>
        <section class="concept" aria-label="Private homepage first-screen concept">
          <span class="watermark">${escapeHtml(preview.watermark || 'Private AccessRevamp Concept')}</span>
          <div class="nav"><span class="store">${businessName}</span><div class="navlinks"><span>Shop</span><span>About</span><span>Support</span></div></div>
          <div class="hero"><div class="copy"><span class="eyebrow">${eyebrow}</span><h1>${headline}</h1><p class="sub">${subheadline}</p><div class="actions"><span class="button primary">${primaryCta}</span><span class="button">${secondaryCta}</span></div><div class="proof">${proofPoints.map((item) => `<span>${item}</span>`).join('')}</div></div><div class="visual"><div class="visual-card"><small>Concept direction</small><h2>One promise. One clear path.</h2><p>This visual is illustrative and intentionally disconnected from the live storefront.</p><div class="bars"><span></span><span></span><span></span></div></div></div></div>
        </section>
        <section class="finding"><b>1</b><div><h2>Human-verified observation</h2><p>${findingSummary} This may affect ${affectedUsers}.</p></div></section>
      </main>`;

    const { error: viewError } = await supabase.rpc('ar_record_preview_view', {
      p_preview_id: preview.id,
    });
    if (viewError) console.error('Could not record private preview view.', viewError);

    return html(page(preview.business_name, body), 200, {
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'cross-origin-resource-policy': 'same-origin',
    });
  } catch (error) {
    return handleError(error);
  }
};
