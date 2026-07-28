export function extractJavaScriptBundleUrls(html, baseUrl) {
  const candidates = [
    ...[...String(html).matchAll(/<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
      .map((match) => match[1]),
    ...[...String(html).matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+\.js(?:\?[^"']*)?)["']/gi)]
      .map((match) => match[1]),
    ...[...String(html).matchAll(/\bimport\(\s*["']([^"']+\.js(?:\?[^"']*)?)["']\s*\)/gi)]
      .map((match) => match[1]),
    ...[...String(html).matchAll(/["'`]((?:\.{0,2}\/|\/|assets\/)[^"'`]+\.js(?:\?[^"'`]*)?)["'`]/gi)]
      .map((match) => match[1]),
  ];
  return [...new Set(candidates.map((candidate) => {
    const normalized = candidate.startsWith('assets/') ? `/${candidate}` : candidate;
    return new URL(normalized, baseUrl).toString();
  }))];
}

export async function fetchJavaScriptBundleGraph(startUrls, fetchBundle, maxBundles = 64) {
  const queue = [...new Set(startUrls)];
  const seen = new Set();
  const sources = [];
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    if (seen.size >= maxBundles) throw new Error('JavaScript bundle graph exceeded its safety limit.');
    seen.add(url);
    const source = await fetchBundle(url);
    sources.push(source);
    for (const dependency of extractJavaScriptBundleUrls(source, url)) {
      if (!seen.has(dependency)) queue.push(dependency);
    }
  }
  return sources.join('\n');
}
