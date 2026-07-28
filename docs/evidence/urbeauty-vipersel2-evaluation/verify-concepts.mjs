import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "playwright";

const root = path.dirname(fileURLToPath(import.meta.url));
const screenshots = path.join(root, "screenshots");
const evidence = path.join(root, "evidence");
const concepts = [
  "concept-01-ritual-shelf.html",
  "concept-02-color-cabinet.html",
  "concept-03-quiet-utility.html",
  "concept-04-orbit.html",
  "concept-05-ribbon.html"
];
const mime = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8"
};

await fs.mkdir(screenshots, { recursive: true });
await fs.mkdir(evidence, { recursive: true });

const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const requested = pathname === "/" ? concepts[0] : pathname.slice(1);
    const resolved = path.resolve(root, requested);
    if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`) && resolved !== path.resolve(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await fs.readFile(resolved);
    response.writeHead(200, { "content-type": mime[path.extname(resolved)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const concept of concepts) {
    for (const viewport of [
      { name: "desktop-1440x1200", width: 1440, height: 1200 },
      { name: "mobile-390x844", width: 390, height: 844 }
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.width, height: viewport.height },
        reducedMotion: "reduce"
      });
      const consoleErrors = [];
      const pageErrors = [];
      const failedRequests = [];
      const badResponses = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText || "unknown"
      }));
      page.on("response", (response) => {
        if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
      });
      const response = await page.goto(`${origin}/${concept}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const images = await page.locator("img").evaluateAll((nodes) => nodes.map((image) => ({
        src: image.getAttribute("src"),
        alt: image.getAttribute("alt"),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      })));
      const metrics = await page.evaluate(() => ({
        title: document.title,
        h1Count: document.querySelectorAll("h1").length,
        text: document.body.innerText.replace(/\n{3,}/g, "\n\n").trim(),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        overflowingElements: [...document.querySelectorAll("body *")].filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > window.innerWidth + 1 || rect.left < -1;
        }).slice(0, 12).map((element) => ({
          tag: element.tagName.toLowerCase(),
          className: element.className,
          left: Math.round(element.getBoundingClientRect().left),
          right: Math.round(element.getBoundingClientRect().right),
          width: Math.round(element.getBoundingClientRect().width)
        })),
        rasterizedTextCandidates: [...document.querySelectorAll("canvas, svg image")].length
      }));
      const stem = concept.replace(".html", "");
      const screenshot = `${stem}-${viewport.name}.png`;
      await page.screenshot({ path: path.join(screenshots, screenshot), fullPage: false });
      results.push({
        concept,
        url: `${origin}/${concept}`,
        viewport,
        status: response?.status() || null,
        screenshot: `screenshots/${screenshot}`,
        consoleErrors,
        pageErrors,
        failedRequests,
        badResponses,
        brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0),
        images,
        metrics
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await fs.writeFile(
  path.join(evidence, "browser-verification.json"),
  `${JSON.stringify({ generated_utc: new Date().toISOString(), protocol: "local HTTP", results }, null, 2)}\n`
);
await fs.writeFile(
  path.join(evidence, "text-inventory.txt"),
  results
    .filter((result) => result.viewport.name === "desktop-1440x1200")
    .map((result) => `===== ${result.concept} =====\n${result.metrics.text}`)
    .join("\n\n")
);

const manifest = JSON.parse(await fs.readFile(path.join(root, "asset-manifest.json"), "utf8"));
const hashFile = async (relativePath) => {
  const buffer = await fs.readFile(path.join(root, relativePath));
  return createHash("sha256").update(buffer).digest("hex");
};
const assetHashChecks = await Promise.all(manifest.assets.map(async (asset) => ({
  file: asset.file,
  expected_sha256: asset.sha256,
  actual_sha256: await hashFile(asset.file),
  match: asset.sha256 === await hashFile(asset.file)
})));
const screenshotHashes = await Promise.all(
  results.map(async (result) => ({
    file: result.screenshot,
    sha256: await hashFile(result.screenshot)
  }))
);
const htmlHashes = await Promise.all(
  concepts.map(async (concept) => ({
    file: concept,
    sha256: await hashFile(concept)
  }))
);
await fs.writeFile(
  path.join(evidence, "hashes.json"),
  `${JSON.stringify({
    generated_utc: new Date().toISOString(),
    algorithm: "SHA-256",
    asset_hash_checks: assetHashChecks,
    html_hashes: htmlHashes,
    screenshot_hashes: screenshotHashes
  }, null, 2)}\n`
);

const failures = results.filter((result) =>
  result.status !== 200 ||
  result.consoleErrors.length ||
  result.pageErrors.length ||
  result.failedRequests.length ||
  result.badResponses.length ||
  result.brokenImages.length ||
  result.metrics.horizontalOverflow ||
  result.metrics.h1Count !== 1 ||
  result.metrics.rasterizedTextCandidates !== 0
);
if (assetHashChecks.some((asset) => !asset.match)) {
  failures.push({ concept: "asset-manifest", viewport: "n/a", assetHashChecks });
}
console.log(JSON.stringify({
  checks: results.length,
  screenshots: results.map((result) => result.screenshot),
  failures: failures.map((result) => ({
    concept: result.concept,
    viewport: result.viewport.name,
    status: result.status,
    consoleErrors: result.consoleErrors,
    pageErrors: result.pageErrors,
    failedRequests: result.failedRequests,
    badResponses: result.badResponses,
    brokenImages: result.brokenImages,
    horizontalOverflow: result.metrics.horizontalOverflow,
    overflowingElements: result.metrics.overflowingElements,
    h1Count: result.metrics.h1Count,
    rasterizedTextCandidates: result.metrics.rasterizedTextCandidates
  }))
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
