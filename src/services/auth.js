import { getSupabase } from '../lib/supabase.js';

export function setupAuthForm(navigate) {
  const form = document.querySelector('[data-auth-form]');
  if (!form) return undefined;

  const onSubmit = async (event) => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    const supabase = getSupabase();
    if (!supabase) {
      status.textContent = 'Supabase is not connected on this preview.';
      return;
    }
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    submit.disabled = true;
    status.textContent = 'Securing your session…';
    try {
      const result = form.dataset.mode === 'signup'
        ? await supabase.auth.signUp({ email, password, options: { data: { full_name: String(data.get('fullName') || '').trim() } } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (form.dataset.mode === 'signup' && !result.data.session) {
        status.textContent = 'Check your email to confirm the account, then sign in.';
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      status.textContent = error.message || 'Authentication failed.';
    } finally {
      submit.disabled = false;
    }
  };

  form.addEventListener('submit', onSubmit);
  return () => form.removeEventListener('submit', onSubmit);
}
