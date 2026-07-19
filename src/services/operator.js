import { getSupabase } from "../lib/supabase.js";
import { escapeHtml } from "../components/icons.js";
export function setupOperator() {
  const host = document.querySelector("[data-operator-content]");
  if (!host) return;
  let disposed = false;
  const load = async () => {
    const supabase = getSupabase();
    const session = (await supabase?.auth.getSession())?.data?.session;
    if (!session) {
      host.dataset.operatorState = "signed-out";
      host.innerHTML =
        '<h2>Operator sign-in required</h2><a class="button" href="/login" data-nav>Sign in</a>';
      return;
    }
    try {
      const response = await fetch("/api/operator-overview", {
          headers: { authorization: `Bearer ${session.access_token}` },
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error || "Access denied");
      if (disposed) return;
      document.querySelector("[data-sending-state]").textContent =
        data.sendingEnabled ? "unexpectedly enabled — investigate" : "disabled";
      host.dataset.operatorState = "ready";
      host.innerHTML = `${data.partialFailures?.length ? `<div class="notice">Partial data: ${data.partialFailures.map(escapeHtml).join(", ")}</div>` : ""}<div class="dashboard-grid"><section class="dashboard-card"><h2>Prospect evidence</h2>${data.prospects.length ? data.prospects.map((p) => `<article><strong>${escapeHtml(p.business_name)}</strong><p>${escapeHtml(p.observation)} <span class="status-pill">${escapeHtml(p.evidence_strength)} / ${p.confidence}% confidence</span></p><small>Source recorded ${new Date(p.observed_at).toLocaleDateString()} · stage ${escapeHtml(p.stage)} · score ${p.score}</small></article>`).join("") : "<p>No evidence records.</p>"}</section><section class="dashboard-card"><h2>Queue — never send</h2><p>${data.queue.length} bounded queue record(s). Approval requires reviewed evidence, an active preview, human message approval, and suppression check in one database transaction.</p></section><section class="dashboard-card"><h2>Delivery</h2><p>${data.projects.length} project record(s).</p></section><section class="dashboard-card"><h2>Refund dependencies</h2><p>${data.refundDependencies.length} dependency record(s) awaiting or recording resolution.</p></section></div>`;
    } catch (error) {
      host.dataset.operatorState = "denied";
      host.innerHTML = `<h2>Operator workspace unavailable</h2><p>${escapeHtml(error.message)}</p>`;
    }
  };
  load();
  return () => {
    disposed = true;
  };
}
