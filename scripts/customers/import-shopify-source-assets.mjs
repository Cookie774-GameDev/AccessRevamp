import { createHash, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || !value) throw new Error(`Missing value for ${key || 'argument'}.`);
  args.set(key.slice(2), value);
}

const required = (value, name) => {
  const normalized = String(value || '').trim();
  if (!normalized) throw new Error(`${name} is required.`);
  return normalized;
};

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const projectId = required(args.get('project-id'), '--project-id');
const requestedWebsite = new URL(required(args.get('website'), '--website'));
const permissionRecord = required(args.get('permission-record'), '--permission-record');
if (requestedWebsite.protocol !== 'https:') throw new Error('The customer website must use https:');

const supabaseUrl = required(process.env.SUPABASE_URL, 'SUPABASE_URL');
const serviceRoleKey = required(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY');
const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: project, error: projectError } = await client
  .from('customer_projects')
  .select('id,website_url')
  .eq('id', projectId)
  .maybeSingle();
if (projectError) throw projectError;
if (!project) throw new Error('The customer project does not exist.');

const projectWebsite = new URL(project.website_url);
const projectHost = projectWebsite.hostname.toLowerCase();
const requestedHost = requestedWebsite.hostname.toLowerCase();
if (projectHost !== requestedHost || !safeEqual(projectHost, requestedHost)) {
  throw new Error('The requested website does not match the customer project.');
}

const catalogUrl = new URL('/products.json?limit=250', requestedWebsite);
const catalogResponse = await fetch(catalogUrl, {
  headers: { accept: 'application/json' },
  redirect: 'error',
  signal: AbortSignal.timeout(30_000),
});
if (!catalogResponse.ok) throw new Error(`Shopify catalog request failed with ${catalogResponse.status}.`);
const catalog = await catalogResponse.json();
if (!Array.isArray(catalog?.products) || catalog.products.length === 0) {
  throw new Error('No Shopify products were returned.');
}

const allowedAssetHost = (host) => (
  safeEqual(host, projectHost)
  || safeEqual(host, 'cdn.shopify.com')
  || host.endsWith('.shopifycdn.com')
);

const hashRemoteAsset = async (sourceUrl) => {
  const url = new URL(sourceUrl);
  if (url.protocol !== 'https:' || !allowedAssetHost(url.hostname.toLowerCase())) {
    throw new Error(`Rejected an untrusted product asset host: ${url.hostname}`);
  }
  const response = await fetch(url, {
    headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/*' },
    redirect: 'error',
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok || !response.body) throw new Error(`Product image request failed with ${response.status}.`);
  const hash = createHash('sha256');
  let sizeBytes = 0;
  for await (const chunk of response.body) {
    hash.update(chunk);
    sizeBytes += chunk.length;
  }
  return {
    sha256: hash.digest('hex'),
    sizeBytes,
    mimeType: String(response.headers.get('content-type') || '').split(';')[0] || null,
  };
};

const retrievedAt = new Date().toISOString();
let discovered = 0;
let stored = 0;
for (const product of catalog.products) {
  const productIdentifier = String(product.handle || product.id || product.title || '').trim();
  for (const [imageIndex, image] of (product.images || []).entries()) {
    const sourceUrl = String(image?.src || '').trim();
    if (!sourceUrl) continue;
    discovered += 1;
    const evidence = await hashRemoteAsset(sourceUrl);
    const { error } = await client.from('project_source_assets').upsert({
      project_id: projectId,
      asset_type: 'product',
      product_identifier: productIdentifier,
      source_url: sourceUrl,
      original_filename: new URL(sourceUrl).pathname.split('/').at(-1) || null,
      mime_type: evidence.mimeType,
      size_bytes: evidence.sizeBytes,
      sha256: evidence.sha256,
      rights_status: 'public_permission',
      verification_status: 'verified',
      retrieved_at: retrievedAt,
      verified_by: `operator:${permissionRecord}`.slice(0, 500),
      verified_at: retrievedAt,
      metadata: {
        source: 'shopify_products_json',
        product_id: String(product.id || ''),
        product_title: String(product.title || ''),
        product_handle: String(product.handle || ''),
        image_id: String(image.id || ''),
        image_position: imageIndex + 1,
        permission_record: permissionRecord,
      },
    }, { onConflict: 'project_id,sha256', ignoreDuplicates: false });
    if (error) throw error;
    stored += 1;
  }
}

process.stdout.write(`${JSON.stringify({
  projectId,
  products: catalog.products.length,
  assetsDiscovered: discovered,
  assetsStored: stored,
  credentialsPrinted: false,
})}\n`);
