import { preview } from 'vite';

export function isAccessRevampDocument(html) {
  const document = String(html);
  return /<title>AccessRevamp\b/i.test(document) && /<div\s+id=["']app["']><\/div>/i.test(document);
}

export async function startVerifiedBaselineServer(root) {
  const server = await preview({
    root,
    logLevel: 'silent',
    preview: {
      host: '127.0.0.1',
      port: 0,
      strictPort: true,
      open: false,
    },
  });

  try {
    const resolvedUrl = server.resolvedUrls?.local?.find((url) => url.includes('127.0.0.1'));
    if (!resolvedUrl) throw new Error('Vite did not expose a loopback preview URL.');
    const baseUrl = resolvedUrl.replace(/\/$/, '');
    const response = await fetch(baseUrl);
    const html = await response.text();
    if (!response.ok || !isAccessRevampDocument(html)) {
      throw new Error('The baseline server did not return the expected AccessRevamp document.');
    }
    return { server, baseUrl };
  } catch (error) {
    await server.close();
    throw error;
  }
}
