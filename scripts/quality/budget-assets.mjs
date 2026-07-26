export function initialManifestFiles(manifest, eagerDynamicEntries = []) {
  const files = new Set();
  const visited = new Set();
  const entries = Object.entries(manifest)
    .filter(([, item]) => item?.isEntry)
    .map(([key]) => key);

  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const item = manifest[key];
    if (!item) return;
    if (item.file) files.add(item.file);
    for (const css of item.css || []) files.add(css);
    for (const imported of item.imports || []) visit(imported);
  }

  for (const entry of entries) visit(entry);
  for (const entry of eagerDynamicEntries) visit(entry);
  return files;
}
