import { getSupabase } from '../lib/supabase.js';

function applySessionState(session) {
  const signedIn = Boolean(session?.user?.email_confirmed_at);
  document.querySelectorAll('[data-session-signed-in]').forEach((element) => {
    element.hidden = !signedIn;
  });
  document.querySelectorAll('[data-session-signed-out]').forEach((element) => {
    element.hidden = signedIn;
  });
}

export function setupSessionNavigation(navigate) {
  const supabase = getSupabase();
  if (!supabase) {
    applySessionState(null);
    return undefined;
  }

  let disposed = false;
  supabase.auth.getSession().then(({ data }) => {
    if (!disposed) applySessionState(data?.session || null);
  }).catch(() => {
    if (!disposed) applySessionState(null);
  });

  const listener = supabase.auth.onAuthStateChange((_event, session) => {
    if (!disposed) applySessionState(session);
  });

  const onProfileClick = (event) => {
    const profile = event.target.closest('[data-session-signed-in]');
    if (!profile || profile.hidden || !navigate) return;
    event.preventDefault();
    navigate('/account/projects');
  };
  document.addEventListener('click', onProfileClick);

  return () => {
    disposed = true;
    listener.data.subscription.unsubscribe();
    document.removeEventListener('click', onProfileClick);
  };
}
