import { getSupabase } from '../lib/supabase.js';

const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;
const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export function setupProjectIntake() {
  const form = document.querySelector('[data-project-intake-form]');
  if (!form) return undefined;
  const dropzone = form.querySelector('[data-upload-dropzone]');
  const input = form.querySelector('[data-style-images]');
  const preview = form.querySelector('[data-upload-preview]');
  const status = form.querySelector('.form-status');
  const submit = form.querySelector('button[type="submit"]');
  let selectedFiles = [];

  const renderFiles = () => {
    preview.innerHTML = selectedFiles.map((file, index) => `<li><span>${file.name}</span><small>${(file.size / 1024 / 1024).toFixed(1)} MB</small><button type="button" data-remove-upload="${index}" aria-label="Remove ${file.name}">Remove</button></li>`).join('');
  };
  const acceptFiles = (files) => {
    const next = [...files].filter((file) => acceptedTypes.has(file.type) && file.size <= MAX_BYTES).slice(0, MAX_FILES);
    selectedFiles = next;
    renderFiles();
    status.textContent = next.length ? `${next.length} style image${next.length === 1 ? '' : 's'} ready.` : 'Choose JPG, PNG, WebP, or AVIF images no larger than 8MB.';
  };
  const onInput = () => acceptFiles(input.files || []);
  const onDragOver = (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); };
  const onDragLeave = () => dropzone.classList.remove('is-dragging');
  const onDrop = (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); acceptFiles(event.dataTransfer?.files || []); };
  const onPreviewClick = (event) => {
    const button = event.target.closest('[data-remove-upload]');
    if (!button) return;
    selectedFiles.splice(Number(button.dataset.removeUpload), 1);
    renderFiles();
  };
  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) { status.textContent = 'Complete the highlighted fields before sending.'; return; }
    const pages = new FormData(form).getAll('pages');
    if (!pages.length || pages.length > 5) { status.textContent = 'Choose between one and five pages.'; return; }
    const supabase = getSupabase();
    if (!supabase) { status.textContent = 'Customer sign-in is not configured in this deployment. Your brief was not sent.'; return; }
    const sessionResult = await supabase.auth.getSession();
    const session = sessionResult.data?.session;
    if (!session) { status.textContent = 'Sign in with the confirmed checkout email before sending this brief.'; return; }
    const body = new FormData(form);
    body.delete('styleImages');
    selectedFiles.forEach((file) => body.append('styleImages', file, file.name));
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    status.textContent = 'Uploading your private project brief…';
    try {
      const response = await fetch('/api/project-intake', { method: 'POST', headers: { authorization: `Bearer ${session.access_token}` }, body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'The project brief could not be saved.');
      status.textContent = `Project brief received. Reference ${result.reference}.`;
      form.reset(); selectedFiles = []; renderFiles();
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; submit.removeAttribute('aria-busy'); }
  };

  input.addEventListener('change', onInput);
  dropzone.addEventListener('dragover', onDragOver);
  dropzone.addEventListener('dragleave', onDragLeave);
  dropzone.addEventListener('drop', onDrop);
  preview.addEventListener('click', onPreviewClick);
  form.addEventListener('submit', onSubmit);
  return () => {
    input.removeEventListener('change', onInput);
    dropzone.removeEventListener('dragover', onDragOver);
    dropzone.removeEventListener('dragleave', onDragLeave);
    dropzone.removeEventListener('drop', onDrop);
    preview.removeEventListener('click', onPreviewClick);
    form.removeEventListener('submit', onSubmit);
  };
}

