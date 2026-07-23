import * as React$1 from "react";
import React, { Children, createContext, createElement, isValidElement } from "react";
import { renderToReadableStream } from "react-dom/server.edge";
import { AsyncLocalStorage } from "node:async_hooks";
import { decode } from "node:querystring";
//#region node_modules/vinext/dist/shims/head.js
/**
* next/head shim
*
* In the Pages Router, <Head> manages document <head> elements.
* - On the server: collects elements into a module-level array that the
*   dev-server reads after render and injects into the HTML <head>.
* - On the client: reduces all mounted <Head> instances into one deduped
*   document.head projection and applies it with DOM manipulation.
*/
var _ssrHeadChildren = [];
var _getSSRHeadChildren = () => _ssrHeadChildren;
var _resetSSRHeadImpl = () => {
	_ssrHeadChildren = [];
};
/**
* Register ALS-backed state accessors. Called by head-state.ts on import.
* @internal
*/
function _registerHeadStateAccessors(accessors) {
	_getSSRHeadChildren = accessors.getSSRHeadChildren;
	_resetSSRHeadImpl = accessors.resetSSRHead;
}
/** Reset the SSR head collector. Call before render. */
function resetSSRHead() {
	_resetSSRHeadImpl();
}
/** Get collected head HTML. Call after render. */
function getSSRHeadHTML() {
	return reduceHeadChildren(_getSSRHeadChildren()).map((child) => headChildToHTML(child.type, child.props)).filter(Boolean).join("\n  ");
}
/**
* Tags allowed inside <head>. Anything else is silently dropped.
* This prevents injection of dangerous elements like <iframe>, <object>, etc.
*/
var ALLOWED_HEAD_TAGS = /* @__PURE__ */ new Set([
	"title",
	"meta",
	"link",
	"style",
	"script",
	"base",
	"noscript"
]);
Array.from(ALLOWED_HEAD_TAGS).join(", ");
var META_TYPES = [
	"name",
	"httpEquiv",
	"charSet",
	"itemProp"
];
/** Self-closing tags: no inner content, emit as <tag ... /> */
var SELF_CLOSING_HEAD_TAGS = /* @__PURE__ */ new Set([
	"meta",
	"link",
	"base"
]);
/** Tags whose content is raw text — closing-tag sequences must be escaped during SSR. */
var RAW_CONTENT_TAGS = /* @__PURE__ */ new Set(["script", "style"]);
function collectHeadElements(list, child) {
	if (child == null || typeof child === "boolean" || typeof child === "string" || typeof child === "number") return list;
	if (!isValidElement(child)) return list;
	if (child.type === React.Fragment) return Children.toArray(child.props.children).reduce(collectHeadElements, list);
	if (typeof child.type !== "string") return list;
	if (!ALLOWED_HEAD_TAGS.has(child.type)) {
		child.type;
		return list;
	}
	return list.concat(child);
}
function normalizeHeadKey(key) {
	if (key == null || typeof key === "number") return null;
	const normalizedKey = String(key);
	const separatorIndex = normalizedKey.indexOf("$");
	return separatorIndex > 0 ? normalizedKey.slice(separatorIndex + 1) : null;
}
function createUniqueHeadFilter() {
	const keys = /* @__PURE__ */ new Set();
	const tags = /* @__PURE__ */ new Set();
	const metaTypes = /* @__PURE__ */ new Set();
	const metaCategories = /* @__PURE__ */ new Map();
	return (child) => {
		let isUnique = true;
		const normalizedKey = normalizeHeadKey(child.key);
		const hasKey = normalizedKey !== null;
		if (normalizedKey) if (keys.has(normalizedKey)) isUnique = false;
		else keys.add(normalizedKey);
		switch (child.type) {
			case "title":
			case "base":
				if (tags.has(child.type)) isUnique = false;
				else tags.add(child.type);
				break;
			case "meta": {
				const props = child.props;
				for (const metaType of META_TYPES) {
					if (!Object.prototype.hasOwnProperty.call(props, metaType)) continue;
					if (metaType === "charSet") {
						if (metaTypes.has(metaType)) isUnique = false;
						else metaTypes.add(metaType);
						continue;
					}
					const category = props[metaType];
					if (typeof category !== "string") continue;
					let categories = metaCategories.get(metaType);
					if (!categories) {
						categories = /* @__PURE__ */ new Set();
						metaCategories.set(metaType, categories);
					}
					if ((metaType !== "name" || !hasKey) && categories.has(category)) isUnique = false;
					else categories.add(category);
				}
				break;
			}
			default: break;
		}
		return isUnique;
	};
}
function reduceHeadChildren(headChildren) {
	return headChildren.reduce((flattenedChildren, child) => flattenedChildren.concat(Children.toArray(child)), []).reduce(collectHeadElements, []).reverse().filter(createUniqueHeadFilter()).reverse();
}
/**
* Validate an HTML attribute name. Rejects names that could break out of
* the attribute context during SSR serialization, or that represent inline
* event handlers (on*). Only allows alphanumeric characters, hyphens, and
* common data-attribute patterns.
*/
var SAFE_ATTR_NAME_RE = /^[a-zA-Z][a-zA-Z0-9\-:.]*$/;
function isSafeAttrName(name) {
	if (!SAFE_ATTR_NAME_RE.test(name)) return false;
	if (name.length > 2 && name[0] === "o" && name[1] === "n" && name[2] >= "A" && name[2] <= "z") return false;
	return true;
}
/**
* Convert props + tag to an HTML string for SSR head injection.
* Callers must only pass tags that have already been validated against
* ALLOWED_HEAD_TAGS (e.g. via reduceHeadChildren / collectHeadElements).
*/
function headChildToHTML(tag, props) {
	const attrs = [];
	let innerHTML = "";
	const rawHtml = getDangerouslySetInnerHTML(props.dangerouslySetInnerHTML);
	if (rawHtml != null) innerHTML = rawHtml;
	else if (typeof props.children === "string") innerHTML = escapeHTML(props.children);
	else if (Array.isArray(props.children)) innerHTML = escapeHTML(props.children.join(""));
	for (const [key, value] of Object.entries(props)) if (key === "children" || key === "dangerouslySetInnerHTML") continue;
	else if (key === "className") attrs.push(`class="${escapeAttr(String(value))}"`);
	else if (typeof value === "string") {
		if (!isSafeAttrName(key)) continue;
		attrs.push(`${key}="${escapeAttr(value)}"`);
	} else if (typeof value === "boolean" && value) {
		if (!isSafeAttrName(key)) continue;
		attrs.push(key);
	}
	const attrStr = attrs.length ? " " + attrs.join(" ") : "";
	if (SELF_CLOSING_HEAD_TAGS.has(tag)) return `<${tag}${attrStr} data-vinext-head="true" />`;
	if (RAW_CONTENT_TAGS.has(tag) && innerHTML) innerHTML = escapeInlineContent(innerHTML, tag);
	return `<${tag}${attrStr} data-vinext-head="true">${innerHTML}</${tag}>`;
}
function escapeHTML(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
	return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
/**
* Escape content that will be placed inside a raw <script> or <style> tag
* during SSR. The HTML parser treats `<\/script>` (or `</style>`) as the end
* of the block regardless of JavaScript string context, so any occurrence
* of `</` followed by the tag name must be escaped.
*
* We replace `<\/script` and `</style` (case-insensitive) with `<\/script`
* and `<\/style` respectively. The `<\/` form is harmless in JS/CSS string
* context but prevents the HTML parser from seeing a closing tag.
*/
function escapeInlineContent(content, tag) {
	const pattern = new RegExp(`<\\/(${tag})`, "gi");
	return content.replace(pattern, "<\\/$1");
}
function getDangerouslySetInnerHTML(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const html = Reflect.get(value, "__html");
	return typeof html === "string" ? html : void 0;
}
//#endregion
//#region node_modules/vinext/dist/shims/dynamic.js
var preloadQueue = [];
/**
* Wait for all pending dynamic() preloads to resolve, then clear the queue.
* Called by the Pages Router SSR handler before rendering.
* No-op for the App Router path which uses React.lazy + Suspense.
*/
function flushPreloads() {
	const pending = preloadQueue.splice(0);
	return Promise.all(pending);
}
//#endregion
//#region node_modules/vinext/dist/utils/base-path.js
/**
* Shared basePath helpers.
*
* Next.js only treats a pathname as being under basePath when it is an exact
* match ("/app") or starts with the basePath followed by a path separator
* ("/app/..."). Prefix-only matches like "/application" must be left intact.
*/
/**
* Check whether a pathname is inside the configured basePath.
*/
function hasBasePath(pathname, basePath) {
	if (!basePath) return false;
	return pathname === basePath || pathname.startsWith(basePath + "/");
}
/**
* Strip the basePath prefix from a pathname when it matches on a segment
* boundary. Returns the original pathname when it is outside the basePath.
*/
function stripBasePath(pathname, basePath) {
	if (!hasBasePath(pathname, basePath)) return pathname;
	return pathname.slice(basePath.length) || "/";
}
//#endregion
//#region node_modules/vinext/dist/shims/internal/router-context.js
/**
* Shim for next/dist/shared/lib/router-context.shared-runtime
*
* Used by: some testing utilities and older libraries.
* Provides the Pages Router context.
*/
var RouterContext = createContext(null);
//#endregion
//#region node_modules/vinext/dist/client/validate-module-path.js
/**
* Defense-in-depth: validate module paths before passing them to dynamic import().
*
* Shared between entry.ts (initial hydration) and router.ts (client-side navigation)
* to ensure all dynamic imports of page/app modules go through the same validation.
*
* Blocks:
* - Non-string or empty values
* - Paths that don't start with `/` or `./` (e.g., `https://evil.com/...`)
* - Protocol URLs (`://`)
* - Protocol-relative URLs (`//...`)
* - Directory traversal (`..`)
*/
function isValidModulePath(p) {
	if (typeof p !== "string" || p.length === 0) return false;
	if (!p.startsWith("/") && !p.startsWith("./")) return false;
	if (p.startsWith("//")) return false;
	if (p.includes("://")) return false;
	if (p.includes("..")) return false;
	return true;
}
//#endregion
//#region node_modules/vinext/dist/client/window-next.js
/**
* Build-time replacement for the vinext package version, injected by the
* Vite plugin via `define` (see `index.ts` — `process.env.__NEXT_VERSION`
* is mirrored from `packages/vinext/package.json#version` so library
* callers that read `process.env.__NEXT_VERSION` see a real value).
*
* In environments where the define did not run (standalone unit tests
* that import this module without going through the plugin), the
* `?? "vinext"` fallback prevents a literal `undefined` from landing on
* `window.next.version`.
*/
var VINEXT_VERSION = "0.0.50";
/**
* Install `window.next` if it has not already been installed in this
* document. Subsequent calls update fields in place so both the Pages
* Router and the App Router bootstraps can call this without clobbering
* each other (e.g. for hybrid `pages/` + `app/` setups).
*
* When called a second time, `router` and `appDir` overwrite the previous
* values. This mirrors Next.js's load order: in a hybrid app the App
* Router's `app-bootstrap.ts` runs after Pages Router's `next.ts` and the
* App Router instance wins.
*
* No module-level cache: we read and write through `window.next` directly
* so that a test (or userland code) that deletes `window.next` cleanly
* resets state.
*/
function installWindowNext(fields) {
	if (typeof window === "undefined") return;
	const existing = window.next;
	if (existing) {
		if (fields.version !== void 0) existing.version = fields.version;
		if (fields.appDir !== void 0) existing.appDir = fields.appDir;
		if (fields.router !== void 0) existing.router = fields.router;
		if (fields.__pendingUrl !== void 0) existing.__pendingUrl = fields.__pendingUrl;
		if (fields.__internal_src_page !== void 0) existing.__internal_src_page = fields.__internal_src_page;
		return;
	}
	window.next = {
		version: fields.version ?? VINEXT_VERSION,
		...fields
	};
}
//#endregion
//#region node_modules/vinext/dist/shims/url-utils.js
/**
* Shared URL utilities for same-origin detection.
*
* Used by link.tsx, navigation.ts, and router.ts to normalize
* same-origin absolute URLs to local paths for client-side navigation.
*/
/**
* If `url` is an absolute same-origin URL, return the local path
* (pathname + search + hash). Returns null for truly external URLs
* or on the server (where origin is unknown).
*/
function toSameOriginPath(url) {
	if (typeof window === "undefined") return null;
	try {
		const parsed = url.startsWith("//") ? new URL(url, window.location.origin) : new URL(url);
		if (parsed.origin === window.location.origin) return parsed.pathname + parsed.search + parsed.hash;
	} catch {}
	return null;
}
/**
* If `url` is an absolute same-origin URL, return the app-relative path
* (basePath stripped from the pathname, if configured). Returns null for
* truly external URLs or on the server.
*/
function toSameOriginAppPath(url, basePath) {
	const localPath = toSameOriginPath(url);
	if (localPath == null || !basePath) return localPath;
	try {
		const parsed = new URL(localPath, "http://vinext.local");
		if (!hasBasePath(parsed.pathname, basePath)) return null;
		return stripBasePath(parsed.pathname, basePath) + parsed.search + parsed.hash;
	} catch {
		return localPath;
	}
}
/**
* Prepend basePath to a local path for browser URLs / fetches.
*/
function withBasePath$1(path, basePath) {
	if (!basePath || !path.startsWith("/") || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) return path;
	return basePath + path;
}
/**
* Resolve a potentially relative href against the current URL.
* Handles: "#hash", "?query", "?query#hash", and relative paths.
*/
function resolveRelativeHref(href, currentUrl, basePath = "") {
	const base = currentUrl ?? (typeof window !== "undefined" ? window.location.href : void 0);
	if (!base) return href;
	if (href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) return href;
	try {
		const resolved = new URL(href, base);
		return (basePath && resolved.pathname === basePath ? "" : basePath ? stripBasePath(resolved.pathname, basePath) : resolved.pathname) + resolved.search + resolved.hash;
	} catch {
		return href;
	}
}
/**
* Convert a local navigation target into the browser URL that should be used
* for history entries, fetches, and onNavigate callbacks.
*/
function toBrowserNavigationHref(href, currentUrl, basePath = "") {
	const resolved = resolveRelativeHref(href, currentUrl, basePath);
	if (!basePath) return withBasePath$1(resolved, basePath);
	if (resolved === "") return basePath;
	if (resolved.startsWith("?") || resolved.startsWith("#")) return basePath + resolved;
	return withBasePath$1(resolved, basePath);
}
function isHashOnlyBrowserUrlChange(href, currentHref, basePath = "") {
	try {
		const current = new URL(currentHref);
		const next = new URL(href, currentHref);
		return stripBasePath(current.pathname, basePath) === stripBasePath(next.pathname, basePath) && current.search === next.search && next.hash !== "";
	} catch {
		return false;
	}
}
//#endregion
//#region node_modules/vinext/dist/utils/domain-locale.js
function normalizeDomainHostname(hostname) {
	if (!hostname) return void 0;
	return hostname.split(",", 1)[0]?.trim().split(":", 1)[0]?.toLowerCase() || void 0;
}
/**
* Match a configured domain either by hostname or locale.
* When both are provided, the checks intentionally use OR semantics so the
* same helper can cover Next.js's hostname lookup and preferred-locale lookup.
* If both are passed, the first domain matching either input wins, so callers
* should pass hostname or detectedLocale, not both.
*/
function detectDomainLocale(domainItems, hostname, detectedLocale) {
	if (!domainItems?.length) return void 0;
	const normalizedHostname = normalizeDomainHostname(hostname);
	const normalizedLocale = detectedLocale?.toLowerCase();
	for (const item of domainItems) if (normalizedHostname === normalizeDomainHostname(item.domain) || normalizedLocale === item.defaultLocale.toLowerCase() || item.locales?.some((locale) => locale.toLowerCase() === normalizedLocale)) return item;
}
function addLocalePrefix(path, locale, localeDefault) {
	const normalizedLocale = locale.toLowerCase();
	if (normalizedLocale === localeDefault.toLowerCase()) return path;
	const pathWithLeadingSlash = path.startsWith("/") ? path : `/${path}`;
	const normalizedPathname = (pathWithLeadingSlash.split(/[?#]/, 1)[0] ?? pathWithLeadingSlash).toLowerCase();
	const localePrefix = `/${normalizedLocale}`;
	if (normalizedPathname === localePrefix || normalizedPathname.startsWith(`${localePrefix}/`)) return path.startsWith("/") ? path : pathWithLeadingSlash;
	return `/${locale}${pathWithLeadingSlash}`;
}
function withBasePath(path, basePath = "") {
	if (!basePath) return path;
	return basePath + path;
}
function getDomainLocaleUrl(url, locale, { basePath, currentHostname, domainItems }) {
	if (!domainItems?.length) return void 0;
	const targetDomain = detectDomainLocale(domainItems, void 0, locale);
	if (!targetDomain) return void 0;
	const currentDomain = detectDomainLocale(domainItems, currentHostname ?? void 0);
	const localizedPath = addLocalePrefix(url, locale, targetDomain.defaultLocale);
	if (currentDomain && normalizeDomainHostname(currentDomain.domain) === normalizeDomainHostname(targetDomain.domain)) return;
	return `${`http${targetDomain.http ? "" : "s"}://`}${targetDomain.domain}${withBasePath(localizedPath, basePath)}`;
}
//#endregion
//#region node_modules/vinext/dist/utils/query.js
function setOwnQueryValue(obj, key, value) {
	Object.defineProperty(obj, key, {
		value,
		enumerable: true,
		writable: true,
		configurable: true
	});
}
function addQueryParam(obj, key, value) {
	if (Object.hasOwn(obj, key)) {
		const current = obj[key];
		setOwnQueryValue(obj, key, Array.isArray(current) ? current.concat(value) : [current, value]);
	} else setOwnQueryValue(obj, key, value);
}
/**
* Merge pathname-derived dynamic route params into a query object.
*
* Route params must win over same-name URL search params so `/posts/123?id=456`
* still exposes `id: "123"` to Pages Router APIs.
*/
function mergeRouteParamsIntoQuery$1(query, params) {
	const merged = { ...query };
	for (const [key, value] of Object.entries(params)) setOwnQueryValue(merged, key, Array.isArray(value) ? [...value] : value);
	return merged;
}
/**
* Parse a URL's query string into a Record, with multi-value keys promoted to arrays.
*/
function parseQueryString(url) {
	const qs = url.split("?")[1];
	if (!qs) return {};
	const params = new URLSearchParams(qs);
	const query = {};
	for (const [key, value] of params) addQueryParam(query, key, value);
	return query;
}
/**
* Convert a Next.js-style query object into URLSearchParams while preserving
* repeated keys for array values.
*
* Ported from Next.js `urlQueryToSearchParams()`:
* https://github.com/vercel/next.js/blob/canary/packages/next/src/shared/lib/router/utils/querystring.ts
*/
function stringifyUrlQueryParam(param) {
	if (typeof param === "string") return param;
	if (typeof param === "number" && !isNaN(param) || typeof param === "boolean") return String(param);
	return "";
}
function urlQueryToSearchParams(query) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (Array.isArray(value)) {
			for (const item of value) params.append(key, stringifyUrlQueryParam(item));
			continue;
		}
		params.set(key, stringifyUrlQueryParam(value));
	}
	return params;
}
/**
* Append query parameters to a URL while preserving any existing query string
* and fragment identifier.
*/
function appendSearchParamsToUrl(url, params) {
	const hashIndex = url.indexOf("#");
	const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
	const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
	const queryIndex = beforeHash.indexOf("?");
	const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
	const existingQuery = queryIndex === -1 ? "" : beforeHash.slice(queryIndex + 1);
	const merged = new URLSearchParams(existingQuery);
	for (const [key, value] of params) merged.append(key, value);
	const search = merged.toString();
	return `${base}${search ? `?${search}` : ""}${hash}`;
}
//#endregion
//#region node_modules/vinext/dist/shims/router.js
/**
* next/router shim
*
* Provides useRouter() hook and Router singleton for Pages Router.
* Backed by the browser History API. Supports client-side navigation
* by fetching new page data and re-rendering the React root.
*/
/** basePath from next.config.js, injected by the plugin at build time */
var __basePath$1 = "";
function createRouterEvents() {
	const listeners = /* @__PURE__ */ new Map();
	return {
		on(event, handler) {
			if (!listeners.has(event)) listeners.set(event, /* @__PURE__ */ new Set());
			listeners.get(event).add(handler);
		},
		off(event, handler) {
			listeners.get(event)?.delete(handler);
		},
		emit(event, ...args) {
			listeners.get(event)?.forEach((handler) => handler(...args));
		}
	};
}
var routerEvents = createRouterEvents();
function resolveUrl(url) {
	if (typeof url === "string") return url;
	let result = url.pathname ?? "/";
	if (url.query) {
		const params = urlQueryToSearchParams(url.query);
		result = appendSearchParamsToUrl(result, params);
	}
	return result;
}
/**
* When `as` is provided, use it as the navigation target. This is a
* simplification: Next.js keeps `url` and `as` as separate values (url for
* data fetching, as for the browser URL). We collapse them because vinext's
* navigateClient() fetches HTML from the target URL, so `as` must be a
* server-resolvable path. Purely decorative `as` values are not supported.
*/
function resolveNavigationTarget(url, as, locale) {
	return applyNavigationLocale(as ?? resolveUrl(url), locale);
}
function getDomainLocales() {
	return window.__NEXT_DATA__?.domainLocales;
}
function getCurrentHostname() {
	return window.location?.hostname;
}
function getDomainLocalePath(url, locale) {
	return getDomainLocaleUrl(url, locale, {
		basePath: __basePath$1,
		currentHostname: getCurrentHostname(),
		domainItems: getDomainLocales()
	});
}
/**
* Apply locale prefix to a URL for client-side navigation.
* Same logic as Link's applyLocaleToHref but reads from window globals.
*/
function applyNavigationLocale(url, locale) {
	if (!locale || typeof window === "undefined") return url;
	if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) return url;
	const domainLocalePath = getDomainLocalePath(url, locale);
	if (domainLocalePath) return domainLocalePath;
	return addLocalePrefix(url, locale, window.__VINEXT_DEFAULT_LOCALE__ ?? "");
}
/** Check if a URL is external (any URL scheme per RFC 3986, or protocol-relative) */
function isExternalUrl(url) {
	return /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("//");
}
/** Resolve a hash URL to a basePath-stripped app URL for event payloads */
function resolveHashUrl(url) {
	if (typeof window === "undefined") return url;
	if (url.startsWith("#")) return stripBasePath(window.location.pathname, __basePath$1) + window.location.search + url;
	try {
		const parsed = new URL(url, window.location.href);
		return stripBasePath(parsed.pathname, __basePath$1) + parsed.search + parsed.hash;
	} catch {
		return url;
	}
}
/** Check if a href is only a hash change relative to the current URL */
function isHashOnlyChange(href) {
	if (href.startsWith("#")) return true;
	if (typeof window === "undefined") return false;
	return isHashOnlyBrowserUrlChange(href, window.location.href, __basePath$1);
}
/** Scroll to hash target element, or top if no hash */
function scrollToHash(hash) {
	if (!hash || hash === "#") {
		window.scrollTo(0, 0);
		return;
	}
	const el = document.getElementById(hash.slice(1));
	if (el) el.scrollIntoView({ behavior: "auto" });
}
/** Save current scroll position into history state for back/forward restoration */
function saveScrollPosition() {
	const state = window.history.state ?? {};
	window.history.replaceState({
		...state,
		__vinext_scrollX: window.scrollX,
		__vinext_scrollY: window.scrollY
	}, "");
}
/** Restore scroll position from history state */
function restoreScrollPosition$1(state) {
	if (state && typeof state === "object" && "__vinext_scrollY" in state) {
		const { __vinext_scrollX: x, __vinext_scrollY: y } = state;
		requestAnimationFrame(() => window.scrollTo(x, y));
	}
}
var _ssrContext = null;
var _getSSRContext = () => _ssrContext;
var _setSSRContextImpl = (ctx) => {
	_ssrContext = ctx;
};
/**
* Register ALS-backed state accessors. Called by router-state.ts on import.
* @internal
*/
function _registerRouterStateAccessors(accessors) {
	_getSSRContext = accessors.getSSRContext;
	_setSSRContextImpl = accessors.setSSRContext;
}
function setSSRContext(ctx) {
	_setSSRContextImpl(ctx);
}
/**
* Extract param names from a Next.js route pattern.
* E.g., "/posts/[id]" → ["id"], "/docs/[...slug]" → ["slug"],
* "/shop/[[...path]]" → ["path"], "/blog/[year]/[month]" → ["year", "month"]
* Also handles internal format: "/posts/:id" → ["id"], "/docs/:slug+" → ["slug"]
*/
function extractRouteParamNames(pattern) {
	const names = [];
	const bracketMatches = pattern.matchAll(/\[{1,2}(?:\.\.\.)?([^\]]+)\]{1,2}/g);
	for (const m of bracketMatches) names.push(m[1]);
	if (names.length > 0) return names;
	const colonMatches = pattern.matchAll(/:([^/+*]+)[+*]?/g);
	for (const m of colonMatches) names.push(m[1]);
	return names;
}
function getPathnameAndQuery() {
	if (typeof window === "undefined") {
		const _ssrCtx = _getSSRContext();
		if (_ssrCtx) {
			const query = {};
			for (const [key, value] of Object.entries(_ssrCtx.query)) query[key] = Array.isArray(value) ? [...value] : value;
			return {
				pathname: _ssrCtx.pathname,
				query,
				asPath: _ssrCtx.asPath
			};
		}
		return {
			pathname: "/",
			query: {},
			asPath: "/"
		};
	}
	const resolvedPath = stripBasePath(window.location.pathname, __basePath$1);
	const pathname = window.__NEXT_DATA__?.page ?? resolvedPath;
	const routeQuery = {};
	const nextData = window.__NEXT_DATA__;
	if (nextData && nextData.query && nextData.page) {
		const routeParamNames = extractRouteParamNames(nextData.page);
		for (const key of routeParamNames) {
			const value = nextData.query[key];
			if (typeof value === "string") routeQuery[key] = value;
			else if (Array.isArray(value)) routeQuery[key] = [...value];
		}
	}
	const searchQuery = {};
	const params = new URLSearchParams(window.location.search);
	for (const [key, value] of params) addQueryParam(searchQuery, key, value);
	return {
		pathname,
		query: {
			...searchQuery,
			...routeQuery
		},
		asPath: resolvedPath + window.location.search + window.location.hash
	};
}
/**
* Error thrown when a navigation is superseded by a newer one.
* Matches Next.js's convention of an Error with `.cancelled = true`.
*/
var NavigationCancelledError = class extends Error {
	cancelled = true;
	constructor(route) {
		super(`Abort fetching component for route: "${route}"`);
		this.name = "NavigationCancelledError";
	}
};
/**
* Error thrown after queueing a hard navigation fallback for a known failure
* mode. Callers can use this to avoid scheduling the same hard navigation twice.
*/
var HardNavigationScheduledError = class extends Error {
	hardNavigationScheduled = true;
	constructor(message) {
		super(message);
		this.name = "HardNavigationScheduledError";
	}
};
/**
* Monotonically increasing ID for tracking the current navigation.
* Each call to navigateClient() increments this and captures the value.
* After each async boundary, the navigation checks whether it is still
* the active one. If a newer navigation has started, the stale one
* throws NavigationCancelledError so the caller can emit routeChangeError
* and skip routeChangeComplete.
*
* Replaces the old boolean `_navInProgress` guard which silently dropped
* the second navigation, causing URL/content mismatch.
*/
var _navigationId = 0;
/** AbortController for the in-flight fetch, so superseded navigations abort network I/O. */
var _activeAbortController = null;
function scheduleHardNavigationAndThrow(url, message) {
	if (typeof window === "undefined") throw new HardNavigationScheduledError(message);
	window.location.href = url;
	throw new HardNavigationScheduledError(message);
}
/**
* Perform client-side navigation: fetch the target page's HTML,
* extract __NEXT_DATA__, and re-render the React root.
*
* Throws NavigationCancelledError if a newer navigation supersedes this one.
* Throws on hard-navigation failures (non-OK response, missing data) so the
* caller can distinguish success from failure for event emission.
*/
async function navigateClient(url) {
	if (typeof window === "undefined") return;
	const root = window.__VINEXT_ROOT__;
	if (!root) {
		window.location.href = url;
		return;
	}
	_activeAbortController?.abort();
	const controller = new AbortController();
	_activeAbortController = controller;
	const navId = ++_navigationId;
	/** Check if this navigation is still the active one. If not, throw. */
	function assertStillCurrent() {
		if (navId !== _navigationId) throw new NavigationCancelledError(url);
	}
	try {
		let res;
		try {
			res = await fetch(url, {
				headers: { Accept: "text/html" },
				signal: controller.signal
			});
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") throw new NavigationCancelledError(url);
			throw err;
		}
		assertStillCurrent();
		if (!res.ok) scheduleHardNavigationAndThrow(url, `Navigation failed: ${res.status} ${res.statusText}`);
		const html = await res.text();
		assertStillCurrent();
		const match = html.match(/<script>window\.__NEXT_DATA__\s*=\s*(.*?)<\/script>/);
		if (!match) scheduleHardNavigationAndThrow(url, "Navigation failed: missing __NEXT_DATA__ in response");
		const nextData = JSON.parse(match[1]);
		const { pageProps } = nextData.props;
		let pageModuleUrl = nextData.__vinext?.pageModuleUrl;
		if (!pageModuleUrl) {
			const moduleMatch = html.match(/import\("([^"]+)"\);\s*\n\s*const PageComponent/);
			const altMatch = html.match(/await import\("([^"]+pages\/[^"]+)"\)/);
			pageModuleUrl = moduleMatch?.[1] ?? altMatch?.[1] ?? void 0;
		}
		if (!pageModuleUrl) scheduleHardNavigationAndThrow(url, "Navigation failed: no page module URL found");
		if (!isValidModulePath(pageModuleUrl)) {
			console.error("[vinext] Blocked import of invalid page module path:", pageModuleUrl);
			scheduleHardNavigationAndThrow(url, "Navigation failed: invalid page module path");
		}
		const pageModule = await import(
			/* @vite-ignore */
			pageModuleUrl
);
		assertStillCurrent();
		const PageComponent = pageModule.default;
		if (!PageComponent) scheduleHardNavigationAndThrow(url, "Navigation failed: page module has no default export");
		const React = (await import("react")).default;
		assertStillCurrent();
		let AppComponent = window.__VINEXT_APP__;
		const appModuleUrl = nextData.__vinext?.appModuleUrl;
		if (!AppComponent && appModuleUrl) if (!isValidModulePath(appModuleUrl)) console.error("[vinext] Blocked import of invalid app module path:", appModuleUrl);
		else try {
			AppComponent = (await import(
				/* @vite-ignore */
				appModuleUrl
)).default;
			window.__VINEXT_APP__ = AppComponent;
		} catch {}
		assertStillCurrent();
		let element;
		if (AppComponent) element = React.createElement(AppComponent, {
			Component: PageComponent,
			pageProps
		});
		else element = React.createElement(PageComponent, pageProps);
		element = wrapWithRouterContext(element);
		window.__NEXT_DATA__ = nextData;
		root.render(element);
	} finally {
		if (navId === _navigationId) _activeAbortController = null;
	}
}
/**
* Run navigateClient and handle errors: emit routeChangeError on failure,
* and fall back to a hard navigation for non-cancel errors so the browser
* recovers to a consistent state.
*
* Returns:
* - "completed" — navigation finished, caller should emit routeChangeComplete
* - "cancelled" — superseded by a newer navigation, caller should return true
*   without emitting routeChangeComplete (matches Next.js behaviour)
* - "failed" — genuine error, caller should return false (hard nav is already
*   scheduled as recovery)
*/
async function runNavigateClient(fullUrl, resolvedUrl) {
	try {
		await navigateClient(fullUrl);
		return "completed";
	} catch (err) {
		routerEvents.emit("routeChangeError", err, resolvedUrl, { shallow: false });
		if (err instanceof NavigationCancelledError) return "cancelled";
		if (typeof window !== "undefined" && !(err instanceof HardNavigationScheduledError)) window.location.href = fullUrl;
		return "failed";
	}
}
/**
* Build the full router value object from the current pathname, query, asPath,
* and a set of navigation methods.  Shared by useRouter() (which passes
* hook-derived callbacks) and wrapWithRouterContext() (which passes the Router
* singleton methods) so the shape stays in sync.
*/
function buildRouterValue(pathname, query, asPath, methods) {
	const _ssrState = _getSSRContext();
	const nextData = typeof window !== "undefined" ? window.__NEXT_DATA__ : void 0;
	const locale = typeof window === "undefined" ? _ssrState?.locale : window.__VINEXT_LOCALE__;
	const locales = typeof window === "undefined" ? _ssrState?.locales : window.__VINEXT_LOCALES__;
	const defaultLocale = typeof window === "undefined" ? _ssrState?.defaultLocale : window.__VINEXT_DEFAULT_LOCALE__;
	const domainLocales = typeof window === "undefined" ? _ssrState?.domainLocales : nextData?.domainLocales;
	return {
		pathname,
		route: typeof window !== "undefined" ? nextData?.page ?? pathname : pathname,
		query,
		asPath,
		basePath: __basePath$1,
		locale,
		locales,
		defaultLocale,
		domainLocales,
		isReady: true,
		isPreview: false,
		isFallback: typeof window !== "undefined" && nextData?.isFallback === true,
		...methods,
		events: routerEvents
	};
}
var _beforePopStateCb;
var _lastPathnameAndSearch = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
if (typeof window !== "undefined") window.addEventListener("popstate", (e) => {
	const browserUrl = window.location.pathname + window.location.search;
	const appUrl = stripBasePath(window.location.pathname, __basePath$1) + window.location.search;
	const isHashOnly = browserUrl === _lastPathnameAndSearch;
	if (_beforePopStateCb !== void 0) {
		if (!_beforePopStateCb({
			url: appUrl,
			as: appUrl,
			options: { shallow: false }
		})) return;
	}
	_lastPathnameAndSearch = browserUrl;
	if (isHashOnly) {
		const hashUrl = appUrl + window.location.hash;
		routerEvents.emit("hashChangeStart", hashUrl, { shallow: false });
		scrollToHash(window.location.hash);
		routerEvents.emit("hashChangeComplete", hashUrl, { shallow: false });
		window.dispatchEvent(new CustomEvent("vinext:navigate"));
		return;
	}
	const fullAppUrl = appUrl + window.location.hash;
	routerEvents.emit("routeChangeStart", fullAppUrl, { shallow: false });
	routerEvents.emit("beforeHistoryChange", fullAppUrl, { shallow: false });
	(async () => {
		if (await runNavigateClient(browserUrl, fullAppUrl) === "completed") {
			routerEvents.emit("routeChangeComplete", fullAppUrl, { shallow: false });
			restoreScrollPosition$1(e.state);
			window.dispatchEvent(new CustomEvent("vinext:navigate"));
		}
	})();
});
/**
* Wrap a React element in a RouterContext.Provider so that
* next/compat/router's useRouter() returns the real Pages Router value.
*
* This is a plain function, NOT a React component — it builds the router
* value object directly from the current SSR context (server) or
* window.location + Router singleton (client), avoiding duplicate state
* that a hook-based component would create.
*/
function wrapWithRouterContext(element) {
	const { pathname, query, asPath } = getPathnameAndQuery();
	const routerValue = buildRouterValue(pathname, query, asPath, {
		push: Router.push,
		replace: Router.replace,
		back: Router.back,
		reload: Router.reload,
		prefetch: Router.prefetch,
		beforePopState: Router.beforePopState
	});
	return createElement(RouterContext.Provider, { value: routerValue }, element);
}
var Router = {
	push: async (url, as, options) => {
		let resolved = resolveNavigationTarget(url, as, options?.locale);
		if (isExternalUrl(resolved)) {
			const localPath = toSameOriginAppPath(resolved, __basePath$1);
			if (localPath == null) {
				window.location.assign(resolved);
				return true;
			}
			resolved = localPath;
		}
		const full = toBrowserNavigationHref(resolved, window.location.href, __basePath$1);
		if (isHashOnlyChange(full)) {
			const eventUrl = resolveHashUrl(full);
			routerEvents.emit("hashChangeStart", eventUrl, { shallow: options?.shallow ?? false });
			const hash = resolved.includes("#") ? resolved.slice(resolved.indexOf("#")) : "";
			window.history.pushState({}, "", resolved.startsWith("#") ? resolved : full);
			_lastPathnameAndSearch = window.location.pathname + window.location.search;
			scrollToHash(hash);
			routerEvents.emit("hashChangeComplete", eventUrl, { shallow: options?.shallow ?? false });
			window.dispatchEvent(new CustomEvent("vinext:navigate"));
			return true;
		}
		saveScrollPosition();
		routerEvents.emit("routeChangeStart", resolved, { shallow: options?.shallow ?? false });
		routerEvents.emit("beforeHistoryChange", resolved, { shallow: options?.shallow ?? false });
		window.history.pushState({}, "", full);
		_lastPathnameAndSearch = window.location.pathname + window.location.search;
		if (!options?.shallow) {
			const result = await runNavigateClient(full, resolved);
			if (result === "cancelled") return true;
			if (result === "failed") return false;
		}
		routerEvents.emit("routeChangeComplete", resolved, { shallow: options?.shallow ?? false });
		const hash = resolved.includes("#") ? resolved.slice(resolved.indexOf("#")) : "";
		if (hash) scrollToHash(hash);
		else if (options?.scroll !== false) window.scrollTo(0, 0);
		window.dispatchEvent(new CustomEvent("vinext:navigate"));
		return true;
	},
	replace: async (url, as, options) => {
		let resolved = resolveNavigationTarget(url, as, options?.locale);
		if (isExternalUrl(resolved)) {
			const localPath = toSameOriginAppPath(resolved, __basePath$1);
			if (localPath == null) {
				window.location.replace(resolved);
				return true;
			}
			resolved = localPath;
		}
		const full = toBrowserNavigationHref(resolved, window.location.href, __basePath$1);
		if (isHashOnlyChange(full)) {
			const eventUrl = resolveHashUrl(full);
			routerEvents.emit("hashChangeStart", eventUrl, { shallow: options?.shallow ?? false });
			const hash = resolved.includes("#") ? resolved.slice(resolved.indexOf("#")) : "";
			window.history.replaceState({}, "", resolved.startsWith("#") ? resolved : full);
			_lastPathnameAndSearch = window.location.pathname + window.location.search;
			scrollToHash(hash);
			routerEvents.emit("hashChangeComplete", eventUrl, { shallow: options?.shallow ?? false });
			window.dispatchEvent(new CustomEvent("vinext:navigate"));
			return true;
		}
		routerEvents.emit("routeChangeStart", resolved, { shallow: options?.shallow ?? false });
		routerEvents.emit("beforeHistoryChange", resolved, { shallow: options?.shallow ?? false });
		window.history.replaceState({}, "", full);
		_lastPathnameAndSearch = window.location.pathname + window.location.search;
		if (!options?.shallow) {
			const result = await runNavigateClient(full, resolved);
			if (result === "cancelled") return true;
			if (result === "failed") return false;
		}
		routerEvents.emit("routeChangeComplete", resolved, { shallow: options?.shallow ?? false });
		const hash = resolved.includes("#") ? resolved.slice(resolved.indexOf("#")) : "";
		if (hash) scrollToHash(hash);
		else if (options?.scroll !== false) window.scrollTo(0, 0);
		window.dispatchEvent(new CustomEvent("vinext:navigate"));
		return true;
	},
	back: () => window.history.back(),
	reload: () => window.location.reload(),
	prefetch: async (url) => {
		if (typeof document !== "undefined") {
			const link = document.createElement("link");
			link.rel = "prefetch";
			link.href = url;
			link.as = "document";
			document.head.appendChild(link);
		}
	},
	beforePopState: (cb) => {
		_beforePopStateCb = cb;
	},
	events: routerEvents
};
if (typeof window !== "undefined") installWindowNext({ router: Router });
//#endregion
//#region node_modules/vinext/dist/shims/internal/als-registry.js
/**
* Shared helper for registering AsyncLocalStorage instances on `globalThis`
* via `Symbol.for(...)` so that they survive multiple module instances.
*
* Why this helper exists
* ----------------------
* Vite's multi-environment setup (RSC / SSR / client) and HMR can load a
* single source module under several different specifiers, producing more
* than one module instance at runtime. If each instance kept its own
* module-local `new AsyncLocalStorage()`, request-scoped state would silently
* fork across instances — `headers()` in one environment wouldn't see what
* `connection()` registered in another, concurrent requests would stomp each
* other, etc.
*
* The fix every shim was applying inline:
*
*   const _ALS_KEY = Symbol.for("vinext.foo.als");
*   const _g = globalThis as unknown as Record<PropertyKey, unknown>;
*   const _als = (_g[_ALS_KEY] ??=
*     new AsyncLocalStorage<T>()) as AsyncLocalStorage<T>;
*
* This helper packages that pattern.
*
* Cross-bundle singleton property — preserved
* -------------------------------------------
* - `Symbol.for(key)` consults the global symbol registry and returns the
*   same symbol regardless of which module instance calls it.
* - `globalThis[sym]` is a single slot shared by every module instance.
* - `??=` only assigns when the slot is empty, so the first caller wins and
*   every subsequent caller (in any module instance) reads the same ALS.
*
* The helper module itself never holds the ALS by reference — it always
* round-trips through `globalThis`. So even if this helper file is itself
* loaded under multiple module instances, every copy still hands back the
* one true ALS for a given key.
*/
var _g$10 = globalThis;
/**
* Get (or lazily create) the AsyncLocalStorage registered on `globalThis`
* under `Symbol.for(key)`. Multiple callers — including callers in different
* module instances — that pass the same `key` receive the same ALS instance.
*
* @param key - String key fed to `Symbol.for(...)`. By convention vinext
*   shims use a dotted namespace such as `"vinext.cache.als"`.
*/
function getOrCreateAls(key) {
	const sym = Symbol.for(key);
	return _g$10[sym] ??= new AsyncLocalStorage();
}
//#endregion
//#region node_modules/vinext/dist/shims/unified-request-context.js
var _REQUEST_CONTEXT_ALS_KEY = Symbol.for("vinext.requestContext.als");
var _g$9 = globalThis;
var _als$7 = getOrCreateAls("vinext.unifiedRequestContext.als");
function _getInheritedExecutionContext() {
	const unifiedStore = _als$7.getStore();
	if (unifiedStore) return unifiedStore.executionContext;
	return _g$9[_REQUEST_CONTEXT_ALS_KEY]?.getStore() ?? null;
}
/**
* Create a fresh `UnifiedRequestContext` with defaults for all fields.
* Pass partial overrides for the fields you need to pre-populate.
*/
function createRequestContext(opts) {
	return {
		headersContext: null,
		actionRevalidationKind: 0,
		dynamicUsageDetected: false,
		invalidDynamicUsageError: null,
		pendingSetCookies: [],
		draftModeCookieHeader: null,
		phase: "render",
		i18nContext: null,
		serverContext: null,
		serverInsertedHTMLCallbacks: [],
		requestScopedCacheLife: null,
		unstableCacheRevalidation: "foreground",
		_privateCache: null,
		currentRequestTags: [],
		currentFetchSoftTags: [],
		currentFetchCacheMode: null,
		isFetchDedupeActive: false,
		currentFetchDedupeEntries: /* @__PURE__ */ new Map(),
		executionContext: _getInheritedExecutionContext(),
		requestCache: /* @__PURE__ */ new WeakMap(),
		ssrContext: null,
		ssrHeadChildren: [],
		rootParams: null,
		...opts
	};
}
function runWithRequestContext(ctx, fn) {
	return _als$7.run(ctx, fn);
}
function runWithUnifiedStateMutation(mutate, fn) {
	const parentCtx = _als$7.getStore();
	if (!parentCtx) return fn();
	const childCtx = { ...parentCtx };
	mutate(childCtx);
	return _als$7.run(childCtx, fn);
}
/**
* Get the current unified request context.
* Returns the ALS store when inside a `runWithRequestContext()` scope,
* or a fresh detached context otherwise. Unlike the legacy per-shim fallback
* singletons, this detached value is ephemeral — mutations do not persist
* across calls. This is intentional to prevent state leakage outside request
* scopes.
*
* Only direct callers observe this detached fallback. Shim `_getState()`
* helpers should continue to gate on `isInsideUnifiedScope()` and fall back
* to their standalone ALS/fallback singletons outside the unified scope.
* If called inside a standalone `runWithExecutionContext()` scope, the
* detached context still reflects that inherited `executionContext`.
*/
function getRequestContext() {
	return _als$7.getStore() ?? createRequestContext();
}
/**
* Check whether the current execution is inside a `runWithRequestContext()` scope.
* Shim modules use this to decide whether to read from the unified store
* or fall back to their own standalone ALS.
*/
function isInsideUnifiedScope() {
	return _als$7.getStore() != null;
}
//#endregion
//#region node_modules/vinext/dist/shims/request-context.js
/**
* Request ExecutionContext — AsyncLocalStorage-backed accessor.
*
* Makes the Cloudflare Workers `ExecutionContext` (which provides
* `waitUntil`) available to any code on the call stack during a request
* without requiring it to be threaded through every function signature.
*
* Usage:
*
*   // In the worker entry, wrap the handler:
*   import { runWithExecutionContext } from "vinext/shims/request-context";
*   export default {
*     fetch(request, env, ctx) {
*       return runWithExecutionContext(ctx, () => handler.fetch(request, env, ctx));
*     }
*   };
*
*   // Anywhere downstream:
*   import { getRequestExecutionContext } from "vinext/shims/request-context";
*   const ctx = getRequestExecutionContext(); // null on Node.js dev
*   ctx?.waitUntil(somePromise);
*/
var _als$6 = getOrCreateAls("vinext.requestContext.als");
function runWithExecutionContext(ctx, fn) {
	if (isInsideUnifiedScope()) return runWithUnifiedStateMutation((uCtx) => {
		uCtx.executionContext = ctx;
	}, fn);
	return _als$6.run(ctx, fn);
}
/**
* Get the `ExecutionContext` for the current request, or `null` when called
* outside a `runWithExecutionContext()` scope (e.g. on Node.js dev server).
*
* Use `ctx?.waitUntil(promise)` to schedule background work that must
* complete before the Worker isolate is torn down.
*/
function getRequestExecutionContext() {
	if (isInsideUnifiedScope()) return getRequestContext().executionContext;
	return _als$6.getStore() ?? null;
}
//#endregion
//#region node_modules/vinext/dist/server/headers.js
/**
* Internal HTTP header name constants used throughout vinext.
*
* Centralizes all custom header names so they are defined once and referenced
* everywhere via imports. Keeping them in one module prevents typos, makes
* rename-refactors trivial, and lets grep find every consumer instantly.
*
* Standard HTTP headers (Content-Type, Cache-Control, etc.) are intentionally
* omitted — only vinext-internal and Next.js-protocol headers belong here.
*/
/** ISR / page cache state indicator: "HIT" | "MISS" | "STALE" | "STATIC". */
var VINEXT_CACHE_HEADER = "X-Vinext-Cache";
/** Deduplicated, sorted list of mounted layout slots for cache keying. */
var VINEXT_MOUNTED_SLOTS_HEADER = "X-Vinext-Mounted-Slots";
/** Route interception context for parallel/intercepting routes. */
var VINEXT_INTERCEPTION_CONTEXT_HEADER = "X-Vinext-Interception-Context";
/** RSC render mode (e.g. "navigation", "prefetch"). */
var VINEXT_RSC_RENDER_MODE_HEADER = "X-Vinext-Rsc-Render-Mode";
var NEXT_ROUTER_STATE_TREE_HEADER = "Next-Router-State-Tree";
var NEXT_ROUTER_PREFETCH_HEADER = "Next-Router-Prefetch";
var NEXT_ROUTER_SEGMENT_PREFETCH_HEADER = "Next-Router-Segment-Prefetch";
var NEXT_URL_HEADER = "Next-Url";
//#endregion
//#region node_modules/vinext/dist/shims/headers.js
var _FALLBACK_KEY$6 = Symbol.for("vinext.nextHeadersShim.fallback");
var _g$8 = globalThis;
getOrCreateAls("vinext.nextHeadersShim.als");
_g$8[_FALLBACK_KEY$6] ??= {
	headersContext: null,
	dynamicUsageDetected: false,
	invalidDynamicUsageError: null,
	pendingSetCookies: [],
	draftModeCookieHeader: null,
	phase: "render"
};
(/* @__PURE__ */ new Date(0)).toUTCString();
(/* @__PURE__ */ new Date(0)).toUTCString();
//#endregion
//#region node_modules/vinext/dist/utils/hash.js
/**
* FNV-1a hash producing a 64-bit result (two 32-bit rounds with different seeds).
* Used for deterministic key generation where collisions must be rare.
*/
function fnv1a64(input) {
	let h1 = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h1 ^= input.charCodeAt(i);
		h1 = h1 * 16777619 >>> 0;
	}
	let h2 = 84696351;
	for (let i = 0; i < input.length; i++) {
		h2 ^= input.charCodeAt(i);
		h2 = h2 * 16777619 >>> 0;
	}
	return h1.toString(36) + h2.toString(36);
}
new AsyncLocalStorage();
//#endregion
//#region node_modules/vinext/dist/utils/cache-control-metadata.js
function isUnknownRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readRecordField(ctx, field) {
	const value = ctx?.[field];
	return isUnknownRecord(value) ? value : void 0;
}
function readCacheControlNumberField(ctx, field) {
	const value = readRecordField(ctx, "cacheControl")?.[field] ?? ctx?.[field];
	return typeof value === "number" ? value : void 0;
}
//#endregion
//#region node_modules/vinext/dist/utils/encode-cache-tag.js
/**
* Cache-tag canonicalisation.
*
* Tags can flow into HTTP headers (e.g. `x-next-cache-tags` on ISR responses,
* Cloudflare cache-tag headers, downstream Worker code) where Node's
* `validateHeaderValue` rejects any byte outside `\t\x20-\x7e` and crashes
* the response with `ERR_INVALID_CHAR`. Even on platforms with permissive
* header setters, divergence between storage form and wire form silently
* breaks invalidation when a `revalidateTag` call's tag does not byte-match
* the form that was stored.
*
* The fix is to apply this encoding at every public boundary so storage,
* comparison, and the wire all see the same ASCII-safe form. The fast-path
* returns the input unchanged for already-ASCII tags (the common case), so
* pre-encoded `%xx` input round-trips losslessly without `decodeURIComponent`
* mangling literal `%xx` characters.
*
* The replacement matches *runs* of out-of-class code units rather than each
* code unit individually so surrogate pairs (emoji, non-BMP characters) are
* handed to `encodeURIComponent` as a complete code point — a per-code-unit
* regex would split the pair and throw `URIError`.
*
* Mirrors Next.js's `packages/next/src/server/lib/encode-cache-tag.ts`
* (introduced in vercel/next.js#93601).
*/
var OUT_OF_CLASS_CHAR = /[^\t\x20-\x7e]/;
var OUT_OF_CLASS_RUN = /[^\t\x20-\x7e]+/g;
function encodeCacheTag(tag) {
	return OUT_OF_CLASS_CHAR.test(tag) ? tag.replace(OUT_OF_CLASS_RUN, (run) => encodeURIComponent(run)) : tag;
}
function encodeCacheTags(tags) {
	return tags.map(encodeCacheTag);
}
function readStringArrayField(ctx, field) {
	const value = ctx?.[field];
	if (!Array.isArray(value)) return [];
	return value.filter((item) => typeof item === "string");
}
var MemoryCacheHandler = class {
	store = /* @__PURE__ */ new Map();
	tagRevalidatedAt = /* @__PURE__ */ new Map();
	async get(key, _ctx) {
		const entry = this.store.get(key);
		if (!entry) return null;
		for (const tag of entry.tags) {
			const revalidatedAt = this.tagRevalidatedAt.get(tag);
			if (revalidatedAt && revalidatedAt >= entry.lastModified) {
				this.store.delete(key);
				return null;
			}
		}
		for (const tag of readStringArrayField(_ctx, "softTags")) {
			const revalidatedAt = this.tagRevalidatedAt.get(tag);
			if (revalidatedAt && revalidatedAt >= entry.lastModified) return null;
		}
		if (entry.expireAt !== null && Date.now() > entry.expireAt) {
			this.store.delete(key);
			return null;
		}
		if (entry.revalidateAt !== null && Date.now() > entry.revalidateAt) return {
			lastModified: entry.lastModified,
			value: entry.value,
			cacheState: "stale",
			cacheControl: entry.cacheControl
		};
		return {
			lastModified: entry.lastModified,
			value: entry.value,
			cacheControl: entry.cacheControl
		};
	}
	async set(key, data, ctx) {
		const tagSet = /* @__PURE__ */ new Set();
		if (data && "tags" in data && Array.isArray(data.tags)) for (const t of data.tags) tagSet.add(t);
		for (const t of readStringArrayField(ctx, "tags")) tagSet.add(t);
		const tags = [...tagSet];
		let effectiveRevalidate;
		let effectiveExpire;
		effectiveRevalidate = readCacheControlNumberField(ctx, "revalidate");
		effectiveExpire = readCacheControlNumberField(ctx, "expire");
		if (data && "revalidate" in data && typeof data.revalidate === "number") effectiveRevalidate = data.revalidate;
		if (effectiveRevalidate === 0) return;
		const now = Date.now();
		const revalidateAt = typeof effectiveRevalidate === "number" && effectiveRevalidate > 0 ? now + effectiveRevalidate * 1e3 : null;
		const expireAt = typeof effectiveExpire === "number" && effectiveExpire > 0 ? now + effectiveExpire * 1e3 : null;
		const cacheControl = typeof effectiveRevalidate === "number" ? effectiveExpire === void 0 ? { revalidate: effectiveRevalidate } : {
			revalidate: effectiveRevalidate,
			expire: effectiveExpire
		} : void 0;
		this.store.set(key, {
			value: data,
			tags,
			lastModified: now,
			revalidateAt,
			expireAt,
			cacheControl
		});
	}
	async revalidateTag(tags, _durations) {
		const tagList = Array.isArray(tags) ? tags : [tags];
		const now = Date.now();
		for (const tag of tagList) this.tagRevalidatedAt.set(tag, now);
	}
	resetRequestCache() {}
};
var _HANDLER_KEY = Symbol.for("vinext.cacheHandler");
var _gHandler = globalThis;
function _getActiveHandler() {
	return _gHandler[_HANDLER_KEY] ?? (_gHandler[_HANDLER_KEY] = new MemoryCacheHandler());
}
/**
* Get the active CacheHandler (for internal use or testing).
*/
function getCacheHandler() {
	return _getActiveHandler();
}
/**
* A fulfilled thenable that React can unwrap synchronously via `use()`
* without ever suspending. Reusing a single instance avoids allocating
* on every call — matching Next.js's browser/client implementation.
*
* @see https://github.com/vercel/next.js/blob/canary/packages/next/src/client/request/io.browser.ts
*/
var _resolvedIOPromise = Promise.resolve(void 0);
_resolvedIOPromise.status = "fulfilled";
_resolvedIOPromise.value = void 0;
var _FALLBACK_KEY$5 = Symbol.for("vinext.cache.fallback");
var _g$7 = globalThis;
var _cacheAls = getOrCreateAls("vinext.cache.als");
_g$7[_FALLBACK_KEY$5] ??= {
	actionRevalidationKind: 0,
	requestScopedCacheLife: null,
	unstableCacheRevalidation: "foreground"
};
var ACTION_DID_NOT_REVALIDATE = 0;
function _runWithCacheState(fn) {
	if (isInsideUnifiedScope()) return runWithUnifiedStateMutation((uCtx) => {
		uCtx.actionRevalidationKind = ACTION_DID_NOT_REVALIDATE;
		uCtx.requestScopedCacheLife = null;
		uCtx.unstableCacheRevalidation = "foreground";
	}, fn);
	const state = {
		actionRevalidationKind: ACTION_DID_NOT_REVALIDATE,
		requestScopedCacheLife: null,
		unstableCacheRevalidation: "foreground"
	};
	return _cacheAls.run(state, fn);
}
getOrCreateAls("vinext.unstableCache.als");
getOrCreateAls("vinext.cacheRuntime.contextAls");
var _PRIVATE_FALLBACK_KEY = Symbol.for("vinext.cacheRuntime.privateFallback");
var _g$6 = globalThis;
var _privateAls = getOrCreateAls("vinext.cacheRuntime.privateAls");
_g$6[_PRIVATE_FALLBACK_KEY] ??= { _privateCache: /* @__PURE__ */ new Map() };
function runWithPrivateCache(fn) {
	if (isInsideUnifiedScope()) return runWithUnifiedStateMutation((uCtx) => {
		uCtx._privateCache = /* @__PURE__ */ new Map();
	}, fn);
	const state = { _privateCache: /* @__PURE__ */ new Map() };
	return _privateAls.run(state, fn);
}
//#endregion
//#region node_modules/vinext/dist/shims/fetch-cache.js
/**
* Extended fetch() with Next.js caching semantics.
*
* Patches `globalThis.fetch` during server rendering to support:
*
*   fetch(url, { next: { revalidate: 60, tags: ['posts'] } })
*   fetch(url, { cache: 'force-cache' })
*   fetch(url, { cache: 'no-store' })
*
* Cached responses are stored via the pluggable CacheHandler, so
* revalidateTag() and revalidatePath() invalidate fetch-level caches.
*
* Usage (in server entry):
*   import { withFetchCache, cleanupFetchCache } from './fetch-cache';
*   const cleanup = withFetchCache();
*   try { ... render ... } finally { cleanup(); }
*
* Or use the async helper:
*   await runWithFetchCache(async () => { ... render ... });
*/
/**
* Headers excluded from the cache key. These are W3C trace context headers
* that can break request caching and deduplication.
* All other headers ARE included in the cache key, matching Next.js behavior.
*/
var HEADER_BLOCKLIST = ["traceparent", "tracestate"];
var CACHE_KEY_PREFIX = "v3";
var MAX_CACHE_KEY_BODY_BYTES = 1024 * 1024;
var BodyTooLargeForCacheKeyError = class extends Error {
	constructor() {
		super("Fetch body too large for cache key generation");
	}
};
var SkipCacheKeyGenerationError = class extends Error {
	constructor() {
		super("Fetch body could not be serialized for cache key generation");
	}
};
/**
* Collect all headers from the request, excluding the blocklist.
* Merges headers from both the Request object and the init object,
* with init taking precedence (matching fetch() spec behavior).
*/
function collectHeaders(input, init) {
	const merged = {};
	if (input instanceof Request && input.headers) input.headers.forEach((v, k) => {
		merged[k] = v;
	});
	if (init?.headers) (init.headers instanceof Headers ? init.headers : new Headers(init.headers)).forEach((v, k) => {
		merged[k] = v;
	});
	for (const blocked of HEADER_BLOCKLIST) delete merged[blocked];
	return merged;
}
/**
* Check whether a fetch request carries any per-user auth headers.
* Used for the safety bypass (skip caching when auth headers are present
* without an explicit cache opt-in).
*/
var AUTH_HEADERS = [
	"authorization",
	"cookie",
	"x-api-key"
];
function hasAuthHeaders(input, init) {
	const headers = collectHeaders(input, init);
	return AUTH_HEADERS.some((name) => name in headers);
}
async function serializeFormData(formData, pushBodyChunk, getTotalBodyBytes) {
	for (const [key, val] of formData.entries()) {
		if (typeof val === "string") {
			pushBodyChunk(JSON.stringify([key, {
				kind: "string",
				value: val
			}]));
			continue;
		}
		if (val.size > MAX_CACHE_KEY_BODY_BYTES || getTotalBodyBytes() + val.size > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
		pushBodyChunk(JSON.stringify([key, {
			kind: "file",
			name: val.name,
			type: val.type,
			value: await val.text()
		}]));
	}
}
function getParsedFormContentType(contentType) {
	const mediaType = contentType?.split(";")[0]?.trim().toLowerCase();
	if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return mediaType;
}
function stripMultipartBoundary(contentType) {
	const [type, ...params] = contentType.split(";");
	const keptParams = params.map((param) => param.trim()).filter(Boolean).filter((param) => !/^boundary\s*=/i.test(param));
	const normalizedType = type.trim().toLowerCase();
	return keptParams.length > 0 ? `${normalizedType}; ${keptParams.join("; ")}` : normalizedType;
}
async function readRequestBodyChunksWithinLimit(request) {
	const contentLengthHeader = request.headers.get("content-length");
	if (contentLengthHeader) {
		const contentLength = Number(contentLengthHeader);
		if (Number.isFinite(contentLength) && contentLength > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
	}
	const requestClone = request.clone();
	const contentType = requestClone.headers.get("content-type") ?? void 0;
	const reader = requestClone.body?.getReader();
	if (!reader) return {
		chunks: [],
		contentType
	};
	const chunks = [];
	let totalBodyBytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			totalBodyBytes += value.byteLength;
			if (totalBodyBytes > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
			chunks.push(value);
		}
	} catch (err) {
		reader.cancel().catch(() => {});
		throw err;
	}
	return {
		chunks,
		contentType
	};
}
/**
* Serialize request body into string chunks for cache key inclusion.
* Handles all body types: string, Uint8Array, ReadableStream, FormData, Blob,
* and Request object bodies.
* Returns the serialized body chunks and optionally stashes the original body
* on init as `_ogBody` so it can still be used after stream consumption.
*/
async function serializeBody(input, init) {
	if (!init?.body && !(input instanceof Request && input.body)) return { bodyChunks: [] };
	const bodyChunks = [];
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	let totalBodyBytes = 0;
	let canonicalizedContentType;
	const pushBodyChunk = (chunk) => {
		totalBodyBytes += encoder.encode(chunk).byteLength;
		if (totalBodyBytes > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
		bodyChunks.push(chunk);
	};
	const getTotalBodyBytes = () => totalBodyBytes;
	if (init?.body instanceof Uint8Array) {
		if (init.body.byteLength > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
		pushBodyChunk(decoder.decode(init.body));
		init._ogBody = init.body;
	} else if (init?.body && typeof init.body.getReader === "function") {
		const [bodyForHashing, bodyForFetch] = init.body.tee();
		init._ogBody = bodyForFetch;
		const reader = bodyForHashing.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				if (typeof value === "string") pushBodyChunk(value);
				else {
					totalBodyBytes += value.byteLength;
					if (totalBodyBytes > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
					bodyChunks.push(decoder.decode(value, { stream: true }));
				}
			}
			const finalChunk = decoder.decode();
			if (finalChunk) pushBodyChunk(finalChunk);
		} catch (err) {
			await reader.cancel();
			if (err instanceof BodyTooLargeForCacheKeyError) throw err;
			throw new SkipCacheKeyGenerationError();
		}
	} else if (init?.body instanceof URLSearchParams) {
		init._ogBody = init.body;
		pushBodyChunk(init.body.toString());
	} else if (init?.body && typeof init.body.keys === "function") {
		const formData = init.body;
		init._ogBody = init.body;
		await serializeFormData(formData, pushBodyChunk, getTotalBodyBytes);
	} else if (init?.body && typeof init.body.arrayBuffer === "function") {
		const blob = init.body;
		if (blob.size > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
		pushBodyChunk(await blob.text());
		const arrayBuffer = await blob.arrayBuffer();
		init._ogBody = new Blob([arrayBuffer], { type: blob.type });
	} else if (typeof init?.body === "string") {
		if (init.body.length > MAX_CACHE_KEY_BODY_BYTES) throw new BodyTooLargeForCacheKeyError();
		pushBodyChunk(init.body);
		init._ogBody = init.body;
	} else if (input instanceof Request && input.body) {
		let chunks;
		let contentType;
		try {
			({chunks, contentType} = await readRequestBodyChunksWithinLimit(input));
		} catch (err) {
			if (err instanceof BodyTooLargeForCacheKeyError) throw err;
			throw new SkipCacheKeyGenerationError();
		}
		const formContentType = getParsedFormContentType(contentType);
		if (formContentType) try {
			await serializeFormData(await new Request(input.url, {
				method: input.method,
				headers: contentType ? { "content-type": contentType } : void 0,
				body: new Blob(chunks)
			}).formData(), pushBodyChunk, getTotalBodyBytes);
			canonicalizedContentType = formContentType === "multipart/form-data" && contentType ? stripMultipartBoundary(contentType) : void 0;
			return {
				bodyChunks,
				canonicalizedContentType
			};
		} catch (err) {
			if (err instanceof BodyTooLargeForCacheKeyError) throw err;
			throw new SkipCacheKeyGenerationError();
		}
		for (const chunk of chunks) pushBodyChunk(decoder.decode(chunk, { stream: true }));
		const finalChunk = decoder.decode();
		if (finalChunk) pushBodyChunk(finalChunk);
	}
	return {
		bodyChunks,
		canonicalizedContentType
	};
}
/**
* Generate a deterministic cache key from a fetch request.
*
* Matches Next.js behavior: the key is a SHA-256 hash of a JSON array
* containing URL, method, all headers (minus blocklist), all RequestInit
* options, and the serialized body.
*/
async function buildFetchCacheKey(input, init) {
	let url;
	let method = "GET";
	if (typeof input === "string") url = input;
	else if (input instanceof URL) url = input.toString();
	else {
		url = input.url;
		method = input.method || "GET";
	}
	if (init?.method) method = init.method;
	const headers = collectHeaders(input, init);
	const { bodyChunks, canonicalizedContentType } = await serializeBody(input, init);
	if (canonicalizedContentType) headers["content-type"] = canonicalizedContentType;
	const cacheString = JSON.stringify([
		CACHE_KEY_PREFIX,
		url,
		method,
		headers,
		init?.mode,
		init?.redirect,
		init?.credentials,
		init?.referrer,
		init?.referrerPolicy,
		init?.integrity,
		init?.cache,
		bodyChunks
	]);
	const buffer = new TextEncoder().encode(cacheString);
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return Array.prototype.map.call(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}
var _PENDING_KEY = Symbol.for("vinext.fetchCache.pendingRefetches");
var _gPending = globalThis;
var pendingRefetches = _gPending[_PENDING_KEY] ??= /* @__PURE__ */ new Map();
var DEDUP_TIMEOUT_MS = 6e4;
var _ORIG_FETCH_KEY = Symbol.for("vinext.fetchCache.originalFetch");
var _gFetch = globalThis;
var originalFetch = _gFetch[_ORIG_FETCH_KEY] ??= globalThis.fetch;
var _FALLBACK_KEY$4 = Symbol.for("vinext.fetchCache.fallback");
var _g$5 = globalThis;
var _als$4 = getOrCreateAls("vinext.fetchCache.als");
var _noop = () => {};
var _responseBodyRegistry;
if (globalThis.FinalizationRegistry) _responseBodyRegistry = new FinalizationRegistry((weakRef) => {
	const stream = weakRef.deref();
	if (stream && !stream.locked) stream.cancel("Response object has been garbage collected").then(_noop, _noop);
});
var _fallbackState$4 = _g$5[_FALLBACK_KEY$4] ??= {
	currentRequestTags: [],
	currentFetchSoftTags: [],
	currentFetchCacheMode: null,
	isFetchDedupeActive: false,
	currentFetchDedupeEntries: /* @__PURE__ */ new Map()
};
function _getState$4() {
	if (isInsideUnifiedScope()) return getRequestContext();
	return _als$4.getStore() ?? _fallbackState$4;
}
function isNoStoreFetch(cacheDirective, nextOpts) {
	return cacheDirective === "no-store" || cacheDirective === "no-cache" || nextOpts?.revalidate === false || nextOpts?.revalidate === 0;
}
function isCacheableFetch(cacheDirective, nextOpts) {
	return cacheDirective === "force-cache" || typeof nextOpts?.revalidate === "number" && nextOpts.revalidate > 0;
}
function hasExplicitRevalidateValue(nextOpts) {
	return nextOpts?.revalidate !== void 0;
}
function resolveSegmentCacheDirective(cacheDirective, nextOpts, mode) {
	if (!mode || mode === "auto") return cacheDirective;
	switch (mode) {
		case "force-cache": return "force-cache";
		case "force-no-store": return "no-store";
		case "only-cache":
			if (isNoStoreFetch(cacheDirective, nextOpts)) throw new Error("Route segment config `fetchCache = \"only-cache\"` conflicts with no-store fetch.");
			return cacheDirective ?? "force-cache";
		case "only-no-store":
			if (isCacheableFetch(cacheDirective, nextOpts)) throw new Error("Route segment config `fetchCache = \"only-no-store\"` conflicts with cacheable fetch.");
			return cacheDirective ?? "no-store";
		case "default-cache": return cacheDirective ?? (hasExplicitRevalidateValue(nextOpts) ? void 0 : "force-cache");
		case "default-no-store": return cacheDirective ?? (hasExplicitRevalidateValue(nextOpts) ? void 0 : "no-store");
	}
	return cacheDirective;
}
function getFetchCacheDirective(input, init) {
	if (init?.cache !== void 0) return init.cache;
	if (!(input instanceof Request) || input.cache === "default") return;
	return input.cache;
}
function buildFetchDedupeKey(request) {
	const filteredHeaders = Array.from(request.headers.entries()).filter(([key]) => !HEADER_BLOCKLIST.includes(key.toLowerCase()));
	return JSON.stringify([
		request.method,
		filteredHeaders,
		request.mode,
		request.redirect,
		request.credentials,
		request.referrer,
		request.referrerPolicy,
		request.integrity
	]);
}
function createFetchDedupeCandidate(input, init) {
	if (init?.signal) return null;
	const method = init?.method?.toUpperCase();
	if (method && method !== "GET" && method !== "HEAD") return null;
	if (init?.keepalive) return null;
	const request = typeof input === "string" || input instanceof URL ? new Request(input, init) : input;
	if (request.method !== "GET" && request.method !== "HEAD" || request.keepalive) return null;
	return {
		url: request.url,
		key: buildFetchDedupeKey(request)
	};
}
function buildDedupeClone(body, source) {
	const cloned = new Response(body, {
		status: source.status,
		statusText: source.statusText,
		headers: new Headers(source.headers)
	});
	Object.defineProperty(cloned, "url", {
		value: source.url,
		configurable: true,
		enumerable: true,
		writable: false
	});
	if (_responseBodyRegistry && cloned.body) _responseBodyRegistry.register(cloned, new WeakRef(cloned.body));
	return cloned;
}
function cloneDedupeResponse(response) {
	if (!response.body) return [buildDedupeClone(null, response), buildDedupeClone(null, response)];
	const [body1, body2] = response.body.tee();
	return [buildDedupeClone(body1, response), buildDedupeClone(body2, response)];
}
function dedupeFetch(input, init) {
	const state = _getState$4();
	if (!state.isFetchDedupeActive) return originalFetch(input, init);
	const candidate = createFetchDedupeCandidate(input, init);
	if (!candidate) return originalFetch(input, init);
	const entriesByUrl = state.currentFetchDedupeEntries;
	let entries = entriesByUrl.get(candidate.url);
	if (!entries) {
		entries = [];
		entriesByUrl.set(candidate.url, entries);
	}
	for (const entry of entries) {
		if (entry.key !== candidate.key) continue;
		return entry.promise.then(() => {
			if (!entry.response) throw new Error("[vinext] Missing deduped fetch response");
			const [responseForCaller, responseForFutureCaller] = cloneDedupeResponse(entry.response);
			entry.response = responseForFutureCaller;
			return responseForCaller;
		});
	}
	const promise = originalFetch(input, init);
	const entry = {
		key: candidate.key,
		promise,
		response: null
	};
	entries.push(entry);
	return promise.then((response) => {
		const [responseForCaller, responseForFutureCaller] = cloneDedupeResponse(response);
		entry.response = responseForFutureCaller;
		return responseForCaller;
	}, (err) => {
		const idx = entries.indexOf(entry);
		if (idx !== -1) entries.splice(idx, 1);
		throw err;
	});
}
/**
* Create a patched fetch function with Next.js caching semantics.
*
* The patched fetch:
* 1. Checks `cache` and `next` options to determine caching behavior
* 2. On cache hit, returns the cached response without hitting the network
* 3. On cache miss, fetches from network, stores in cache, returns response
* 4. Respects `next.revalidate` for TTL-based revalidation
* 5. Respects `next.tags` for tag-based invalidation via revalidateTag()
*/
function createPatchedFetch() {
	return async function patchedFetch(input, init) {
		const nextOpts = init?.next;
		const cacheDirective = resolveSegmentCacheDirective(getFetchCacheDirective(input, init), nextOpts, _getState$4().currentFetchCacheMode);
		if (!nextOpts && !cacheDirective) return dedupeFetch(input, init);
		if (cacheDirective === "no-store" || cacheDirective === "no-cache" || nextOpts?.revalidate === false || nextOpts?.revalidate === 0) return dedupeFetch(input, stripNextFromInit(init, cacheDirective));
		if (!(cacheDirective === "force-cache" || typeof nextOpts?.revalidate === "number" && nextOpts.revalidate > 0) && hasAuthHeaders(input, init)) return dedupeFetch(input, stripNextFromInit(init, cacheDirective));
		let revalidateSeconds;
		if (cacheDirective === "force-cache") revalidateSeconds = nextOpts?.revalidate && typeof nextOpts.revalidate === "number" ? nextOpts.revalidate : 31536e3;
		else if (typeof nextOpts?.revalidate === "number" && nextOpts.revalidate > 0) revalidateSeconds = nextOpts.revalidate;
		else if (nextOpts?.tags && nextOpts.tags.length > 0) revalidateSeconds = 31536e3;
		else return dedupeFetch(input, stripNextFromInit(init, cacheDirective));
		const tags = encodeCacheTags(nextOpts?.tags ?? []);
		const softTags = _getState$4().currentFetchSoftTags;
		let fetchInit = stripNextFromInit(init, cacheDirective);
		let cacheKey;
		try {
			cacheKey = await buildFetchCacheKey(input, fetchInit);
			fetchInit = stripNextFromInit(fetchInit, cacheDirective);
		} catch (err) {
			if (err instanceof BodyTooLargeForCacheKeyError || err instanceof SkipCacheKeyGenerationError) {
				fetchInit = stripNextFromInit(fetchInit, cacheDirective);
				return dedupeFetch(input, fetchInit);
			}
			throw err;
		}
		const handler = getCacheHandler();
		const reqTags = _getState$4().currentRequestTags;
		if (tags.length > 0) {
			for (const tag of tags) if (!reqTags.includes(tag)) reqTags.push(tag);
		}
		try {
			const cached = await handler.get(cacheKey, {
				kind: "FETCH",
				tags,
				softTags
			});
			if (cached?.value && cached.value.kind === "FETCH" && cached.cacheState !== "stale") {
				const cachedData = cached.value.data;
				return new Response(cachedData.body, {
					status: cachedData.status ?? 200,
					headers: cachedData.headers
				});
			}
			if (cached?.value && cached.value.kind === "FETCH" && cached.cacheState === "stale") {
				const staleData = cached.value.data;
				if (!pendingRefetches.has(cacheKey)) {
					const refetchPromise = originalFetch(input, fetchInit).then(async (freshResp) => {
						if (freshResp.status !== 200) return;
						const freshBody = await freshResp.text();
						const freshHeaders = {};
						freshResp.headers.forEach((v, k) => {
							if (k.toLowerCase() === "set-cookie") return;
							freshHeaders[k] = v;
						});
						const freshValue = {
							kind: "FETCH",
							data: {
								headers: freshHeaders,
								body: freshBody,
								url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
								status: freshResp.status
							},
							tags,
							revalidate: revalidateSeconds
						};
						await handler.set(cacheKey, freshValue, {
							fetchCache: true,
							tags,
							revalidate: revalidateSeconds
						});
					}).catch((err) => {
						const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
						console.error(`[vinext] fetch cache background revalidation failed for ${url} (key=${cacheKey.slice(0, 12)}...):`, err);
					}).finally(() => {
						if (pendingRefetches.get(cacheKey) === refetchPromise) pendingRefetches.delete(cacheKey);
						clearTimeout(timeoutId);
					});
					pendingRefetches.set(cacheKey, refetchPromise);
					const timeoutId = setTimeout(() => {
						if (pendingRefetches.get(cacheKey) === refetchPromise) pendingRefetches.delete(cacheKey);
					}, DEDUP_TIMEOUT_MS);
					getRequestExecutionContext()?.waitUntil(refetchPromise);
				}
				return new Response(staleData.body, {
					status: staleData.status ?? 200,
					headers: staleData.headers
				});
			}
		} catch (cacheErr) {
			console.error("[vinext] fetch cache read error:", cacheErr);
		}
		const response = await dedupeFetch(input, fetchInit);
		if (response.status === 200) {
			const cloned = response.clone();
			const body = await cloned.text();
			const headers = {};
			cloned.headers.forEach((v, k) => {
				if (k.toLowerCase() === "set-cookie") return;
				headers[k] = v;
			});
			const cacheValue = {
				kind: "FETCH",
				data: {
					headers,
					body,
					url: typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
					status: cloned.status
				},
				tags,
				revalidate: revalidateSeconds
			};
			handler.set(cacheKey, cacheValue, {
				fetchCache: true,
				tags,
				revalidate: revalidateSeconds
			}).catch((err) => {
				console.error("[vinext] fetch cache write error:", err);
			});
		}
		return response;
	};
}
/**
* Strip the `next` property from RequestInit before passing to real fetch.
* The `next` property is not a standard fetch option and would cause warnings
* in some environments.
*/
function stripNextFromInit(init, cacheOverride) {
	if (!init) return cacheOverride === void 0 ? void 0 : { cache: cacheOverride };
	const { next: _next, _ogBody, ...rest } = init;
	if (cacheOverride !== void 0) rest.cache = cacheOverride;
	if (_ogBody !== void 0) rest.body = _ogBody;
	return Object.keys(rest).length > 0 ? rest : void 0;
}
var _PATCH_KEY = Symbol.for("vinext.fetchCache.patchInstalled");
function _ensurePatchInstalled() {
	if (_g$5[_PATCH_KEY]) return;
	_g$5[_PATCH_KEY] = true;
	globalThis.fetch = createPatchedFetch();
}
/**
* Run an async function with patched fetch caching enabled.
* Uses `AsyncLocalStorage.run()` for proper per-request isolation
* of collected fetch tags in concurrent server environments.
*/
async function runWithFetchCache(fn) {
	_ensurePatchInstalled();
	if (isInsideUnifiedScope()) return await runWithUnifiedStateMutation((uCtx) => {
		uCtx.currentRequestTags = [];
		uCtx.currentFetchSoftTags = [];
		uCtx.isFetchDedupeActive = true;
		uCtx.currentFetchDedupeEntries = /* @__PURE__ */ new Map();
	}, fn);
	return _als$4.run({
		currentRequestTags: [],
		currentFetchSoftTags: [],
		currentFetchCacheMode: null,
		isFetchDedupeActive: true,
		currentFetchDedupeEntries: /* @__PURE__ */ new Map()
	}, fn);
}
/**
* Install the patched fetch without creating a standalone ALS scope.
*
* `runWithFetchCache()` is the standalone helper: it installs the patch and
* creates an isolated per-request tag store. The unified request context owns
* that isolation itself via `currentRequestTags`, so callers inside
* `runWithRequestContext()` only need the process-global fetch monkey-patch.
*/
function ensureFetchPatch() {
	_ensurePatchInstalled();
}
//#endregion
//#region node_modules/vinext/dist/shims/router-state.js
/**
* Server-only Pages Router state backed by AsyncLocalStorage.
*
* Provides request-scoped isolation for SSR context (pathname, query,
* locale) so concurrent requests on Workers don't share state.
*
* This module is server-only — it imports node:async_hooks and must NOT
* be bundled for the browser.
*/
var _FALLBACK_KEY$3 = Symbol.for("vinext.router.fallback");
var _g$4 = globalThis;
var _als$3 = getOrCreateAls("vinext.router.als");
var _fallbackState$3 = _g$4[_FALLBACK_KEY$3] ??= { ssrContext: null };
function _getState$3() {
	if (isInsideUnifiedScope()) return getRequestContext();
	return _als$3.getStore() ?? _fallbackState$3;
}
_registerRouterStateAccessors({
	getSSRContext() {
		return _getState$3().ssrContext;
	},
	setSSRContext(ctx) {
		_getState$3().ssrContext = ctx;
	}
});
//#endregion
//#region node_modules/vinext/dist/shims/url-safety.js
/**
* Shared URL safety utilities for Link, Form, and navigation shims.
*
* Centralizes dangerous URI scheme detection so all components and
* navigation functions use the same validation logic.
*/
/**
* Detect dangerous URI schemes that should never be navigated to.
*
* Adapted from Next.js's javascript URL detector:
* packages/next/src/client/lib/javascript-url.ts
* https://github.com/vercel/next.js/blob/canary/packages/next/src/client/lib/javascript-url.ts
*
* URL parsing ignores leading C0 control characters / spaces, and treats
* embedded tab/newline characters in the scheme as insignificant. We mirror
* that behavior here so obfuscated values like `java\nscript:` and
* `\x00javascript:` are still blocked.
*
* Vinext intentionally extends this handling to `data:` and `vbscript:` too,
* since both are also dangerous navigation targets.
*/
var LEADING_IGNORED = "[\\u0000-\\u001F \\u200B\\uFEFF]*";
var SCHEME_IGNORED = "[\\r\\n\\t]*";
function buildDangerousSchemeRegex(scheme) {
	const chars = scheme.split("").join(SCHEME_IGNORED);
	return new RegExp(`^${LEADING_IGNORED}${chars}${SCHEME_IGNORED}:`, "i");
}
buildDangerousSchemeRegex("javascript"), buildDangerousSchemeRegex("data"), buildDangerousSchemeRegex("vbscript");
[
	"RSC",
	"Accept",
	NEXT_ROUTER_STATE_TREE_HEADER,
	NEXT_ROUTER_PREFETCH_HEADER,
	NEXT_ROUTER_SEGMENT_PREFETCH_HEADER,
	NEXT_URL_HEADER,
	VINEXT_INTERCEPTION_CONTEXT_HEADER,
	VINEXT_MOUNTED_SLOTS_HEADER,
	VINEXT_RSC_RENDER_MODE_HEADER
].join(", ");
new TextEncoder();
//#endregion
//#region node_modules/vinext/dist/shims/readonly-url-search-params.js
var ReadonlyURLSearchParamsError = class extends Error {
	constructor() {
		super("Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams");
	}
};
/**
* Read-only URLSearchParams wrapper matching Next.js runtime behavior.
* Mutation methods remain present for instanceof/API compatibility but throw.
*/
var ReadonlyURLSearchParams = class extends URLSearchParams {
	append(_name, _value) {
		throw new ReadonlyURLSearchParamsError();
	}
	delete(_name, _value) {
		throw new ReadonlyURLSearchParamsError();
	}
	set(_name, _value) {
		throw new ReadonlyURLSearchParamsError();
	}
	sort() {
		throw new ReadonlyURLSearchParamsError();
	}
};
//#endregion
//#region node_modules/vinext/dist/shims/navigation.js
var _SERVER_INSERTED_HTML_CTX_KEY = Symbol.for("vinext.serverInsertedHTMLContext");
function getServerInsertedHTMLContext() {
	if (typeof React$1.createContext !== "function") return null;
	const globalState = globalThis;
	if (!globalState[_SERVER_INSERTED_HTML_CTX_KEY]) globalState[_SERVER_INSERTED_HTML_CTX_KEY] = React$1.createContext(null);
	return globalState[_SERVER_INSERTED_HTML_CTX_KEY] ?? null;
}
getServerInsertedHTMLContext();
var GLOBAL_ACCESSORS_KEY = Symbol.for("vinext.navigation.globalAccessors");
/**
* Register ALS-backed state accessors. Called by navigation-state.ts on import.
* @internal
*/
function _registerStateAccessors(accessors) {
	accessors.getServerContext;
	accessors.setServerContext;
	accessors.getInsertedHTMLCallbacks;
	accessors.clearInsertedHTMLCallbacks;
}
var isServer = typeof window === "undefined";
var _CLIENT_NAV_STATE_KEY = Symbol.for("vinext.clientNavigationState");
function getClientNavigationState() {
	if (isServer) return null;
	const globalState = window;
	globalState[_CLIENT_NAV_STATE_KEY] ??= {
		listeners: /* @__PURE__ */ new Set(),
		cachedSearch: window.location.search,
		cachedReadonlySearchParams: new ReadonlyURLSearchParams(window.location.search),
		cachedPathname: stripBasePath(window.location.pathname, ""),
		clientParams: {},
		clientParamsJson: "{}",
		pendingClientParams: null,
		pendingClientParamsJson: null,
		pendingPathname: null,
		pendingPathnameNavId: null,
		originalPushState: window.history.pushState.bind(window.history),
		originalReplaceState: window.history.replaceState.bind(window.history),
		patchInstalled: false,
		hasPendingNavigationUpdate: false,
		suppressUrlNotifyCount: 0,
		navigationSnapshotActiveCount: 0
	};
	return globalState[_CLIENT_NAV_STATE_KEY];
}
function notifyNavigationListeners() {
	const state = getClientNavigationState();
	if (!state) return;
	for (const fn of state.listeners) fn();
}
function syncCommittedUrlStateFromLocation() {
	const state = getClientNavigationState();
	if (!state) return false;
	let changed = false;
	const pathname = stripBasePath(window.location.pathname, "");
	if (pathname !== state.cachedPathname) {
		state.cachedPathname = pathname;
		changed = true;
	}
	const search = window.location.search;
	if (search !== state.cachedSearch) {
		state.cachedSearch = search;
		state.cachedReadonlySearchParams = new ReadonlyURLSearchParams(search);
		changed = true;
	}
	return changed;
}
/**
* Commit pending client navigation state to committed snapshots.
*
* navId is optional: callers that don't own pendingPathname (for example,
* superseded pre-paint cleanup) may pass undefined to flush URL/params state
* without clearing pendingPathname owned by the active navigation. Such callers
* must opt in explicitly if they also own an activated render snapshot.
*/
function commitClientNavigationState(navId, options) {
	if (isServer) return;
	const state = getClientNavigationState();
	if (!state) return;
	if ((navId !== void 0 || options?.releaseSnapshot === true) && state.navigationSnapshotActiveCount > 0) state.navigationSnapshotActiveCount -= 1;
	const urlChanged = syncCommittedUrlStateFromLocation();
	if (state.pendingClientParams !== null && state.pendingClientParamsJson !== null) {
		state.clientParams = state.pendingClientParams;
		state.clientParamsJson = state.pendingClientParamsJson;
		state.pendingClientParams = null;
		state.pendingClientParamsJson = null;
	}
	if (state.pendingPathnameNavId === null || navId !== void 0 && state.pendingPathnameNavId === navId) {
		state.pendingPathname = null;
		state.pendingPathnameNavId = null;
	}
	const shouldNotify = urlChanged || state.hasPendingNavigationUpdate;
	state.hasPendingNavigationUpdate = false;
	if (shouldNotify) notifyNavigationListeners();
}
/**
* Restore scroll position from a history state object (used on popstate).
*
* When an RSC navigation is in flight (back/forward triggers both this
* handler and the browser entry's popstate handler which calls
* __VINEXT_RSC_NAVIGATE__), we must wait for the new content to render
* before scrolling. Otherwise the user sees old content flash at the
* restored scroll position.
*
* This handler fires before the browser entry's popstate handler (because
* navigation.ts is loaded before hydration completes), so we defer via a
* microtask to give the browser entry handler a chance to set
* __VINEXT_RSC_PENDING__. Promise.resolve() schedules a microtask
* that runs after all synchronous event listeners have completed.
*/
function restoreScrollPosition(state) {
	if (state && typeof state === "object" && "__vinext_scrollY" in state) {
		const { __vinext_scrollX: x, __vinext_scrollY: y } = state;
		Promise.resolve().then(() => {
			const pending = window.__VINEXT_RSC_PENDING__ ?? null;
			if (pending) pending.then(() => {
				requestAnimationFrame(() => {
					window.scrollTo(x, y);
				});
			});
			else requestAnimationFrame(() => {
				window.scrollTo(x, y);
			});
		});
	}
}
if (!isServer) {
	const state = getClientNavigationState();
	if (state && !state.patchInstalled) {
		state.patchInstalled = true;
		window.addEventListener("popstate", (event) => {
			if (typeof window.__VINEXT_RSC_NAVIGATE__ !== "function") {
				commitClientNavigationState();
				restoreScrollPosition(event.state);
			}
		});
		window.history.pushState = function patchedPushState(data, unused, url) {
			state.originalPushState.call(window.history, data, unused, url);
			if (state.suppressUrlNotifyCount === 0) commitClientNavigationState();
		};
		window.history.replaceState = function patchedReplaceState(data, unused, url) {
			state.originalReplaceState.call(window.history, data, unused, url);
			if (state.suppressUrlNotifyCount === 0) commitClientNavigationState();
		};
	}
}
//#endregion
//#region node_modules/vinext/dist/shims/navigation-state.js
/**
* Server-only navigation state backed by AsyncLocalStorage.
*
* This module provides request-scoped isolation for navigation context
* and useServerInsertedHTML callbacks. Without ALS, concurrent requests
* on Cloudflare Workers would share module-level state and leak data
* (pathnames, params, CSS-in-JS styles) between requests.
*
* This module is server-only — it imports node:async_hooks and must NOT
* be bundled for the browser. The dual-environment navigation.ts shim
* uses a registration pattern so it works in both environments.
*/
var _FALLBACK_KEY$2 = Symbol.for("vinext.navigation.fallback");
var _g$3 = globalThis;
var _als$2 = getOrCreateAls("vinext.navigation.als");
var _fallbackState$2 = _g$3[_FALLBACK_KEY$2] ??= {
	serverContext: null,
	serverInsertedHTMLCallbacks: []
};
function _getState$2() {
	if (isInsideUnifiedScope()) return getRequestContext();
	return _als$2.getStore() ?? _fallbackState$2;
}
function runWithServerInsertedHTMLState(fn) {
	if (isInsideUnifiedScope()) return runWithUnifiedStateMutation((uCtx) => {
		uCtx.serverInsertedHTMLCallbacks = [];
	}, fn);
	const state = {
		serverContext: (_als$2.getStore() ?? _fallbackState$2).serverContext,
		serverInsertedHTMLCallbacks: []
	};
	return _als$2.run(state, fn);
}
var _accessors = {
	getServerContext() {
		return _getState$2().serverContext;
	},
	setServerContext(ctx) {
		_getState$2().serverContext = ctx;
	},
	getInsertedHTMLCallbacks() {
		return _getState$2().serverInsertedHTMLCallbacks;
	},
	clearInsertedHTMLCallbacks() {
		_getState$2().serverInsertedHTMLCallbacks = [];
	}
};
_registerStateAccessors(_accessors);
globalThis[GLOBAL_ACCESSORS_KEY] = _accessors;
//#endregion
//#region node_modules/vinext/dist/shims/head-state.js
var _FALLBACK_KEY$1 = Symbol.for("vinext.head.fallback");
var _g$2 = globalThis;
var _als$1 = getOrCreateAls("vinext.head.als");
var _fallbackState$1 = _g$2[_FALLBACK_KEY$1] ??= { ssrHeadChildren: [] };
function _getState$1() {
	if (isInsideUnifiedScope()) return getRequestContext();
	return _als$1.getStore() ?? _fallbackState$1;
}
function runWithHeadState(fn) {
	if (isInsideUnifiedScope()) return runWithUnifiedStateMutation((uCtx) => {
		uCtx.ssrHeadChildren = [];
	}, fn);
	return _als$1.run({ ssrHeadChildren: [] }, fn);
}
_registerHeadStateAccessors({
	getSSRHeadChildren() {
		return _getState$1().ssrHeadChildren;
	},
	resetSSRHead() {
		_getState$1().ssrHeadChildren = [];
	}
});
/**
* Register ALS-backed accessors. Called by i18n-state.ts on import.
* @internal
*/
function _registerI18nStateAccessors(accessors) {
	accessors.getI18nContext;
	accessors.setI18nContext;
}
//#endregion
//#region node_modules/vinext/dist/shims/i18n-state.js
/**
* Server-only i18n state backed by AsyncLocalStorage.
*
* Provides request-scoped isolation for i18n context (locale,
* defaultLocale, domainLocales, hostname) so concurrent requests
* on Workers or Node.js don't share mutable locale state.
*
* This module is server-only — it imports node:async_hooks and must NOT
* be bundled for the browser.
*/
var _FALLBACK_KEY = Symbol.for("vinext.i18n.fallback");
var _g$1 = globalThis;
var _als = getOrCreateAls("vinext.i18n.als");
var _fallbackState = _g$1[_FALLBACK_KEY] ??= { i18nContext: null };
function _getState() {
	if (isInsideUnifiedScope()) return getRequestContext();
	return _als.getStore() ?? _fallbackState;
}
_registerI18nStateAccessors({
	getI18nContext() {
		return _getState().i18nContext;
	},
	setI18nContext(ctx) {
		_getState().i18nContext = ctx;
	}
});
//#endregion
//#region node_modules/vinext/dist/server/html.js
/**
* HTML-safe JSON serialization for embedding data in <script> tags.
*
* JSON.stringify does NOT escape characters that are meaningful to the
* HTML parser. If a JSON string value contains "<\/script>", the browser
* closes the script tag early — anything after it executes as HTML.
* This is a well-known stored XSS vector in SSR frameworks.
*
* Next.js mitigates this with htmlEscapeJsonString(). We do the same.
*
* Characters escaped:
*   <   → \u003c   (prevents <\/script> and <!-- breakout)
*   >   → \u003e   (prevents --> and other HTML close sequences)
*   &   → \u0026   (prevents &lt; entity interpretation in XHTML)
*   \u2028 → \\u2028 (line separator — invalid in JS string literals pre-ES2019)
*   \u2029 → \\u2029 (paragraph separator — same)
*
* The result is valid JSON that is also safe to embed in any HTML context
* without additional escaping.
*/
function safeJsonStringify(data) {
	return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function escapeHtmlAttr(value) {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function createNonceAttribute(nonce) {
	if (!nonce) return "";
	return ` nonce="${escapeHtmlAttr(nonce)}"`;
}
function createInlineScriptTag(content, nonce) {
	return `<script${createNonceAttribute(nonce)}>${content}<\/script>`;
}
//#endregion
//#region node_modules/vinext/dist/build/google-fonts/sort-variants.js
function sortFontsVariantValues(valA, valB) {
	if (valA.includes(",") && valB.includes(",")) {
		const [aPrefix, aSuffix] = valA.split(",", 2);
		const [bPrefix, bSuffix] = valB.split(",", 2);
		if (aPrefix === bPrefix) return parseInt(aSuffix) - parseInt(bSuffix);
		return parseInt(aPrefix) - parseInt(bPrefix);
	}
	return parseInt(valA) - parseInt(valB);
}
//#endregion
//#region node_modules/vinext/dist/build/google-fonts/build-url.js
function buildGoogleFontsUrl$1(fontFamily, axes, display) {
	const variants = [];
	if (axes.wght) for (const wght of axes.wght) if (!axes.ital) variants.push([["wght", wght], ...axes.variableAxes ?? []]);
	else for (const ital of axes.ital) variants.push([
		["ital", ital],
		["wght", wght],
		...axes.variableAxes ?? []
	]);
	else if (axes.variableAxes) variants.push([...axes.variableAxes]);
	if (axes.variableAxes) for (const variant of variants) variant.sort(([a], [b]) => {
		const aIsLowercase = a.charCodeAt(0) > 96;
		const bIsLowercase = b.charCodeAt(0) > 96;
		if (aIsLowercase && !bIsLowercase) return -1;
		if (bIsLowercase && !aIsLowercase) return 1;
		return a > b ? 1 : -1;
	});
	let url = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}`;
	if (variants.length > 0) {
		const keyList = variants[0].map(([key]) => key).join(",");
		const valueLists = variants.map((variant) => variant.map(([, val]) => val).join(",")).sort(sortFontsVariantValues).join(";");
		url = `${url}:${keyList}@${valueLists}`;
	}
	return `${url}&display=${display}`;
}
//#endregion
//#region node_modules/vinext/dist/shims/font-google-base.js
/**
* next/font/google shim
*
* Provides a compatible shim for Next.js Google Fonts.
*
* Two modes:
* 1. **Dev / CDN mode** (default): Loads fonts from Google Fonts CDN via <link> tags.
* 2. **Self-hosted mode** (production build): The vinext:google-fonts Vite plugin
*    fetches font CSS + .woff2 files at build time, caches them locally, and injects
*    @font-face CSS pointing at local assets. No requests to Google at runtime.
*
* Usage:
*   import { Inter } from 'next/font/google';
*   const inter = Inter({ subsets: ['latin'], weight: ['400', '700'] });
*   // inter.className -> stable CSS class for this font/options pair
*   // inter.style -> { fontFamily: "'Inter', sans-serif" }
*   // inter.variable -> CSS class that sets the font CSS variable
*/
/**
* Escape a string for safe interpolation inside a CSS single-quoted string.
*
* Prevents CSS injection by escaping characters that could break out of
* a `'...'` CSS string context: backslashes, single quotes, and newlines.
*/
function escapeCSSString(value) {
	return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\a ").replace(/\r/g, "\\d ");
}
/**
* Validate a CSS custom property name (e.g. `--font-inter`).
*
* Custom properties must start with `--` and only contain alphanumeric
* characters, hyphens, and underscores. Anything else could be used to
* break out of the CSS declaration and inject arbitrary rules.
*
* Returns the name if valid, undefined otherwise.
*/
function sanitizeCSSVarName(name) {
	if (/^--[a-zA-Z0-9_-]+$/.test(name)) return name;
}
/**
* Sanitize a CSS font-family fallback name.
*
* Generic family names (sans-serif, serif, monospace, etc.) are used as-is.
* Named families are wrapped in escaped quotes. This prevents injection via
* crafted fallback values like `); } body { color: red; } .x {`.
*/
function sanitizeFallback(name) {
	const generics = /* @__PURE__ */ new Set([
		"serif",
		"sans-serif",
		"monospace",
		"cursive",
		"fantasy",
		"system-ui",
		"ui-serif",
		"ui-sans-serif",
		"ui-monospace",
		"ui-rounded",
		"emoji",
		"math",
		"fangsong"
	]);
	const trimmed = name.trim();
	if (generics.has(trimmed)) return trimmed;
	return `'${escapeCSSString(trimmed)}'`;
}
var injectedFonts = /* @__PURE__ */ new Set();
/**
* Convert a font family name to a CSS variable name.
* e.g., "Inter" -> "--font-inter", "Roboto Mono" -> "--font-roboto-mono"
*/
function toVarName(family) {
	return "--font-" + family.toLowerCase().replace(/\s+/g, "-");
}
function fontClassSegment(family) {
	return family.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "font";
}
function normalizeStringSetOption(value) {
	if (!value) return "";
	return [...new Set((Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean))].sort().join(",");
}
function normalizeWeightOption(value) {
	const normalized = normalizeStringSetOption(value);
	return normalized === "variable" ? "" : normalized;
}
function normalizeStyleOption(value) {
	const values = new Set((Array.isArray(value) ? value : value ? [value] : []).map((item) => item.trim()).filter(Boolean));
	const hasItalic = values.has("italic");
	const hasNormal = values.has("normal");
	if (!hasItalic) return "";
	return hasNormal ? "italic,normal" : "italic";
}
function normalizeFallbackOption(value) {
	if (!value) return "";
	return value.map((item) => item.trim()).join(",");
}
function normalizeBooleanOption(value) {
	if (value === void 0) return "";
	return value ? "1" : "0";
}
function normalizeStringOrBooleanOption(value) {
	if (value === void 0) return "";
	return typeof value === "boolean" ? normalizeBooleanOption(value) : value;
}
function hashString(value) {
	let hash = 2166136261;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 16777619) >>> 0;
	}
	return hash.toString(36).padStart(7, "0");
}
function createFontIdentity(family, options, cssVarName, fallback) {
	return hashString([
		family,
		cssVarName,
		normalizeWeightOption(options.weight),
		normalizeStyleOption(options.style),
		normalizeStringSetOption(options.subsets),
		options.display ?? "swap",
		normalizeBooleanOption(options.preload),
		normalizeFallbackOption(fallback),
		normalizeStringOrBooleanOption(options.adjustFontFallback),
		normalizeStringSetOption(options.axes),
		options._selfHostedCSS ?? ""
	].join("\0"));
}
/**
* Build a Google Fonts CSS URL.
*
* In production this code path is dead. The build plugin
* (`vinext:google-fonts` in `src/plugins/fonts.ts`) statically resolves
* each font call's axis values against the bundled metadata, fetches the
* Google Fonts CSS, and injects the resulting CSS as `_selfHostedCSS` so
* the runtime never queries Google. The shim only reaches this builder
* when the plugin's static parser bails (dynamic options, eval-only
* shapes), which is dev-only.
*
* The dev fallback intentionally has no metadata: shipping the 388 KB
* `font-data.json` to the Worker bundle would dwarf the rest of the shim,
* and the production path already has the metadata-aware variant. The
* tradeoff is that the dev fallback cannot resolve a variable font's
* actual `wght` axis range. It emits no axis segment when no `weight` is
* given, which makes Google return the default static face (200) instead
* of the broken `:wght@100..900` URL that issue #885 reports.
*/
function buildGoogleFontsUrl(family, options) {
	const weights = options.weight ? Array.isArray(options.weight) ? options.weight : [options.weight] : [];
	const styles = options.style ? Array.isArray(options.style) ? options.style : [options.style] : [];
	const hasItalic = styles.includes("italic");
	const hasNormal = styles.includes("normal");
	const ital = hasItalic ? [...hasNormal ? ["0"] : [], "1"] : void 0;
	const normalizedWeights = weights.length === 1 && weights[0] === "variable" ? [] : weights;
	return buildGoogleFontsUrl$1(family, {
		wght: normalizedWeights.length > 0 ? normalizedWeights : ital ? ["400"] : void 0,
		ital
	}, options.display ?? "swap");
}
/**
* Inject a <link> tag for the font (client-side only).
* On the server, we track font URLs for SSR head injection.
*/
function injectFontStylesheet(url) {
	if (injectedFonts.has(url)) return;
	injectedFonts.add(url);
	if (typeof document !== "undefined") {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = url;
		document.head.appendChild(link);
	}
}
/** Track which className CSS rules have been injected. */
var injectedClassRules = /* @__PURE__ */ new Set();
/**
* Inject a CSS rule that maps a className to a font-family.
*
* This is what makes `<div className={inter.className}>` apply the font.
* Next.js generates equivalent rules at build time.
*
* In Next.js, the .className class ONLY sets font-family — it does NOT
* set CSS variables. CSS variables are handled separately by the .variable class.
*/
function injectClassNameRule(className, fontFamily) {
	if (injectedClassRules.has(className)) return;
	injectedClassRules.add(className);
	const css = `.${className} { font-family: ${fontFamily}; }\n`;
	if (typeof document === "undefined") {
		ssrFontStyles$1.push(css);
		return;
	}
	const style = document.createElement("style");
	style.textContent = css;
	style.setAttribute("data-vinext-font-class", className);
	document.head.appendChild(style);
}
/** Track which variable class CSS rules have been injected. */
var injectedVariableRules = /* @__PURE__ */ new Set();
/**
* Inject a CSS rule that sets a CSS variable on an element.
* This is what makes `<html className={inter.variable}>` set the CSS variable
* that can be referenced by other styles (e.g., Tailwind's font-sans).
*
* In Next.js, the .variable class ONLY sets the CSS variable — it does NOT
* set font-family. This is critical because apps commonly apply multiple
* .variable classes to <body> (e.g., geistSans.variable + geistMono.variable).
* If we also set font-family here, the last class wins due to CSS cascade,
* causing all text to use that font (e.g., everything becomes monospace).
*/
function injectVariableClassRule(variableClassName, cssVarName, fontFamily) {
	if (injectedVariableRules.has(variableClassName)) return;
	injectedVariableRules.add(variableClassName);
	const css = `.${variableClassName} { ${cssVarName}: ${fontFamily}; }\n`;
	if (typeof document === "undefined") {
		ssrFontStyles$1.push(css);
		return;
	}
	const style = document.createElement("style");
	style.textContent = css;
	style.setAttribute("data-vinext-font-variable", variableClassName);
	document.head.appendChild(style);
}
var ssrFontStyles$1 = [];
/**
* Get collected SSR font class styles (used by the renderer).
* Note: We don't clear the arrays because fonts are loaded at module import
* time and need to persist across all requests in the Workers environment.
*/
function getSSRFontStyles$1() {
	return [...ssrFontStyles$1];
}
var ssrFontUrls = [];
/**
* Get collected SSR font URLs (used by the renderer).
* Note: We don't clear the arrays because fonts are loaded at module import
* time and need to persist across all requests in the Workers environment.
*/
function getSSRFontLinks() {
	return [...ssrFontUrls];
}
var ssrFontPreloads$1 = [];
var ssrFontPreloadHrefs = /* @__PURE__ */ new Set();
/**
* Get collected SSR font preload data (used by the renderer).
* Returns an array of { href, type } objects for emitting
* <link rel="preload" as="font" ...> tags.
*/
function getSSRFontPreloads$1() {
	return [...ssrFontPreloads$1];
}
/**
* Determine the MIME type for a font file based on its extension.
*/
function getFontMimeType(pathOrUrl) {
	if (pathOrUrl.endsWith(".woff2")) return "font/woff2";
	if (pathOrUrl.endsWith(".woff")) return "font/woff";
	if (pathOrUrl.endsWith(".ttf")) return "font/ttf";
	if (pathOrUrl.endsWith(".otf")) return "font/opentype";
	return "font/woff2";
}
/**
* Extract font file URLs from @font-face CSS rules.
* Parses url('...') references from the CSS text.
*/
function extractFontUrlsFromCSS(css) {
	const urls = [];
	const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
	let match;
	while ((match = urlRegex.exec(css)) !== null) {
		const url = match[1];
		if (url && url.startsWith("/")) urls.push(url);
	}
	return urls;
}
/**
* Collect font file URLs from self-hosted CSS for preload link generation.
* Only collects on the server (SSR). Deduplicates by href using a Set for O(1) lookups.
*/
function collectFontPreloadsFromCSS(css) {
	if (typeof document !== "undefined") return;
	const urls = extractFontUrlsFromCSS(css);
	for (const href of urls) if (!ssrFontPreloadHrefs.has(href)) {
		ssrFontPreloadHrefs.add(href);
		ssrFontPreloads$1.push({
			href,
			type: getFontMimeType(href)
		});
	}
}
/** Track injected self-hosted @font-face blocks (deduplicate) */
var injectedSelfHosted = /* @__PURE__ */ new Set();
/**
* Inject self-hosted @font-face CSS (from the build plugin).
* This replaces the CDN <link> tag with inline CSS.
*/
function injectSelfHostedCSS(css) {
	if (injectedSelfHosted.has(css)) return;
	injectedSelfHosted.add(css);
	collectFontPreloadsFromCSS(css);
	if (typeof document === "undefined") {
		ssrFontStyles$1.push(css);
		return;
	}
	const style = document.createElement("style");
	style.textContent = css;
	style.setAttribute("data-vinext-font-selfhosted", "true");
	document.head.appendChild(style);
}
function createFontLoader(family) {
	return function fontLoader(options = {}) {
		const fallback = options.fallback ?? ["sans-serif"];
		const fontFamily = `'${escapeCSSString(family)}', ${fallback.map(sanitizeFallback).join(", ")}`;
		const defaultVarName = toVarName(family);
		const cssVarName = options.variable ? sanitizeCSSVarName(options.variable) ?? defaultVarName : defaultVarName;
		const id = createFontIdentity(family, options, cssVarName, fallback);
		const classSegment = fontClassSegment(family);
		const className = `__font_${classSegment}_${id}`;
		const variableClassName = `__variable_${classSegment}_${id}`;
		if (options._selfHostedCSS) injectSelfHostedCSS(options._selfHostedCSS);
		else {
			const url = buildGoogleFontsUrl(family, options);
			injectFontStylesheet(url);
			if (typeof document === "undefined") {
				if (!ssrFontUrls.includes(url)) ssrFontUrls.push(url);
			}
		}
		injectClassNameRule(className, fontFamily);
		injectVariableClassRule(variableClassName, cssVarName, fontFamily);
		return {
			className,
			style: { fontFamily },
			variable: variableClassName
		};
	};
}
var googleFonts = new Proxy({}, { get(_target, prop) {
	if (typeof prop !== "string") return void 0;
	if (prop === "__esModule") return true;
	if (prop === "default") return googleFonts;
	return createFontLoader(prop.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2"));
} });
//#endregion
//#region node_modules/vinext/dist/shims/font-local.js
var ssrFontStyles = [];
var ssrFontPreloads = [];
/**
* Get collected SSR font styles (used by the renderer).
* Note: We don't clear the arrays because fonts are loaded at module import
* time and need to persist across all requests in the Workers environment.
*/
function getSSRFontStyles() {
	return [...ssrFontStyles];
}
/**
* Get collected SSR font preload data (used by the renderer).
* Returns an array of { href, type } objects for emitting
* <link rel="preload" as="font" ...> tags.
*/
function getSSRFontPreloads() {
	return [...ssrFontPreloads];
}
//#endregion
//#region node_modules/vinext/dist/config/config-matchers.js
/**
* Parse a Cookie header string into a key-value record.
*/
function parseCookies(cookieHeader) {
	if (!cookieHeader) return {};
	const cookies = {};
	for (const part of cookieHeader.split(";")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim();
		const value = part.slice(eq + 1).trim();
		if (key) cookies[key] = value;
	}
	return cookies;
}
/**
* Sanitize a redirect/rewrite destination to collapse protocol-relative URLs.
*
* After parameter substitution, a destination like `/:path*` can become
* `//evil.com` if the catch-all captured a decoded `%2F` (`/evil.com`).
* Browsers interpret `//evil.com` as a protocol-relative URL, redirecting
* users off-site.
*
* This function collapses any leading double (or more) slashes to a single
* slash for non-external (relative) destinations.
*/
function sanitizeDestination(dest) {
	if (dest.startsWith("http://") || dest.startsWith("https://")) return dest;
	dest = dest.replace(/^[\\/]+/, "/");
	return dest;
}
//#endregion
//#region node_modules/vinext/dist/routing/utils.js
function decodeMatchedParam(value) {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
/**
* Decode captured route params with `decodeURIComponent`, mirroring Next.js
* route-matcher.ts:25-27. Mutates the params object in place. Catch-all
* arrays are decoded element-wise. Malformed escapes are preserved (the
* strict normalization layer rejects them at the request boundary).
*/
function decodeMatchedParams(params) {
	for (const key of Object.keys(params)) {
		const value = params[key];
		if (Array.isArray(value)) params[key] = value.map(decodeMatchedParam);
		else params[key] = decodeMatchedParam(value);
	}
}
globalThis.URLPattern;
new Headers(), new URLSearchParams();
//#endregion
//#region node_modules/vinext/dist/server/http-error-responses.js
/**
* Build a 500 Internal Server Error plain-text response.
*
* The `message` argument lets dev-mode handlers surface failure details while
* production paths fall back to the canonical body. Pass `undefined` (or omit)
* to use the canonical "Internal Server Error" body.
*/
function internalServerErrorResponse(message, init) {
	return new Response(message ?? "Internal Server Error", {
		status: 500,
		headers: init?.headers
	});
}
//#endregion
//#region node_modules/vinext/dist/routing/route-trie.js
function createNode() {
	return {
		staticChildren: /* @__PURE__ */ new Map(),
		dynamicChild: null,
		catchAllChild: null,
		optionalCatchAllChild: null,
		route: null
	};
}
/**
* Build a trie from pre-sorted routes.
*
* Routes must have a `patternParts` property (string[] of URL segments).
* Pattern segment conventions:
*   - `:name`  — dynamic segment
*   - `:name+` — catch-all (1+ segments)
*   - `:name*` — optional catch-all (0+ segments)
*   - anything else — static segment
*
* First route to claim a terminal position wins (routes are pre-sorted
* by precedence, so insertion order preserves correct priority).
*/
function buildRouteTrie(routes) {
	const root = createNode();
	for (const route of routes) {
		const parts = route.patternParts;
		if (parts.length === 0) {
			if (root.route === null) root.route = route;
			continue;
		}
		let node = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (part.endsWith("+") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.catchAllChild === null) node.catchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.endsWith("*") && part.startsWith(":")) {
				if (i !== parts.length - 1) break;
				const paramName = part.slice(1, -1);
				if (node.optionalCatchAllChild === null) node.optionalCatchAllChild = {
					paramName,
					route
				};
				break;
			}
			if (part.startsWith(":")) {
				const paramName = part.slice(1);
				if (node.dynamicChild === null) node.dynamicChild = {
					paramName,
					node: createNode()
				};
				node = node.dynamicChild.node;
				if (i === parts.length - 1) {
					if (node.route === null) node.route = route;
				}
				continue;
			}
			let child = node.staticChildren.get(part);
			if (!child) {
				child = createNode();
				node.staticChildren.set(part, child);
			}
			node = child;
			if (i === parts.length - 1) {
				if (node.route === null) node.route = route;
			}
		}
	}
	return root;
}
/**
* Match a URL against the trie.
*
* Returns decoded param values — `decodeURIComponent` is applied to
* individual param entries so that `%2F` → `/`, `%23` → `#`, etc.
* Segment boundaries (the original `/` splits) are preserved by the
* upstream normalization layer; this step only decodes the captured
* param strings the caller sees.
*
* Mirrors Next.js route-matcher.ts:25-27.
*
* @param root - Trie root built by `buildRouteTrie`
* @param urlParts - Pre-split URL segments (no empty strings)
* @returns Match result with route and extracted params, or null
*/
function trieMatch(root, urlParts) {
	const result = match(root, urlParts, 0);
	if (result) decodeMatchedParams(result.params);
	return result;
}
function createParams() {
	return Object.create(null);
}
function match(node, urlParts, index) {
	if (index === urlParts.length) {
		if (node.route !== null) return {
			route: node.route,
			params: createParams()
		};
		if (node.optionalCatchAllChild !== null) return {
			route: node.optionalCatchAllChild.route,
			params: createParams()
		};
		return null;
	}
	const segment = urlParts[index];
	const staticChild = node.staticChildren.get(segment);
	if (staticChild) {
		const result = match(staticChild, urlParts, index + 1);
		if (result !== null) return result;
	}
	if (node.dynamicChild !== null) {
		const result = match(node.dynamicChild.node, urlParts, index + 1);
		if (result !== null) {
			result.params[node.dynamicChild.paramName] = segment;
			return result;
		}
	}
	if (node.catchAllChild !== null) {
		const remaining = urlParts.slice(index);
		const params = createParams();
		params[node.catchAllChild.paramName] = remaining;
		return {
			route: node.catchAllChild.route,
			params
		};
	}
	if (node.optionalCatchAllChild !== null) {
		const remaining = urlParts.slice(index);
		const params = createParams();
		params[node.optionalCatchAllChild.paramName] = remaining;
		return {
			route: node.optionalCatchAllChild.route,
			params
		};
	}
	return null;
}
//#endregion
//#region node_modules/vinext/dist/server/instrumentation.js
/**
* Get the registered onRequestError handler (if any).
*
* Reads from globalThis so it works across Vite environment boundaries.
*/
function getOnRequestErrorHandler() {
	return globalThis.__VINEXT_onRequestErrorHandler__ ?? null;
}
/**
* Report a request error via the instrumentation handler.
*
* No-op if no onRequestError handler is registered.
*
* Reads the handler from globalThis so this function works correctly regardless
* of which environment it is called from.
*/
function reportRequestError(error, request, context) {
	const handler = getOnRequestErrorHandler();
	if (!handler) return Promise.resolve();
	const promise = (async () => {
		try {
			await handler(error, request, context);
		} catch (reportErr) {
			console.error("[vinext] onRequestError handler threw:", reportErr instanceof Error ? reportErr.message : String(reportErr));
		}
	})();
	getRequestExecutionContext()?.waitUntil(promise);
	return promise;
}
//#endregion
//#region node_modules/vinext/dist/server/pages-media-type.js
/**
* Shared media-type helpers and body-parse error for Pages API routes.
*
* Used by both api-handler.ts (Pages Router dev/prod with Node.js req/res) and
* pages-node-compat.ts (Pages Router fetch-based facade for Cloudflare Workers).
*/
var PagesBodyParseError = class extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
		this.name = "PagesBodyParseError";
	}
};
function getMediaType(contentType) {
	const [type] = (contentType ?? "text/plain").split(";");
	return type?.trim().toLowerCase() || "text/plain";
}
function isJsonMediaType(mediaType) {
	return mediaType === "application/json" || mediaType === "application/ld+json";
}
//#endregion
//#region node_modules/vinext/dist/utils/text-stream.js
/**
* Helpers for the repeated `new TextDecoder()` + `ReadableStream` chunk-loop
* pattern used across the server. Each helper handles the streaming-decode
* boundary correctly (final empty `decoder.decode()` flush so any incomplete
* trailing UTF-8 sequence is reported).
*
* Sites with additional load-bearing behaviour (line-buffered transforms,
* raw-byte accumulators, mixed string/Uint8Array streams, cache-key body
* canonicalisation) intentionally still inline their own decoder.
*/
/**
* Drain a UTF-8 byte stream and return the full decoded text. The stream
* reader is released on both success and failure.
*/
async function readStreamAsText(stream) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	const chunks = [];
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(decoder.decode(value, { stream: true }));
		}
		chunks.push(decoder.decode());
		return chunks.join("");
	} finally {
		reader.releaseLock();
	}
}
/**
* Drain a UTF-8 byte stream up to `maxBytes` of *raw* input, returning the
* decoded text. If the raw size limit is exceeded, the reader is cancelled
* and `onLimitExceeded` is invoked; it MUST throw — its return type is
* `never` to enforce that. Each caller passes its own error type.
*
* The size check is on raw bytes (pre-decode) to bound memory before
* paying the decoder cost.
*/
async function readStreamAsTextWithLimit(stream, maxBytes, onLimitExceeded) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	const chunks = [];
	let totalSize = 0;
	try {
		for (;;) {
			const result = await reader.read();
			if (result.done) break;
			totalSize += result.value.byteLength;
			if (totalSize > maxBytes) {
				await reader.cancel();
				onLimitExceeded();
			}
			chunks.push(decoder.decode(result.value, { stream: true }));
		}
		chunks.push(decoder.decode());
		return chunks.join("");
	} finally {
		reader.releaseLock();
	}
}
//#endregion
//#region node_modules/vinext/dist/server/pages-node-compat.js
var MAX_PAGES_API_BODY_SIZE = 1 * 1024 * 1024;
async function readPagesRequestBodyWithLimit(request, maxBytes) {
	if (!request.body) return "";
	return readStreamAsTextWithLimit(request.body, maxBytes, () => {
		throw new PagesBodyParseError("Request body too large", 413);
	});
}
async function parsePagesApiBody(request, maxBytes = MAX_PAGES_API_BODY_SIZE) {
	if (Number.parseInt(request.headers.get("content-length") || "0", 10) > maxBytes) throw new PagesBodyParseError("Request body too large", 413);
	let rawBody = "";
	try {
		rawBody = await readPagesRequestBodyWithLimit(request, maxBytes);
	} catch (err) {
		if (err instanceof PagesBodyParseError) throw err;
		throw new PagesBodyParseError("Request body too large", 413);
	}
	const mediaType = getMediaType(request.headers.get("content-type"));
	if (!rawBody) return isJsonMediaType(mediaType) ? {} : mediaType === "application/x-www-form-urlencoded" ? decode(rawBody) : void 0;
	if (isJsonMediaType(mediaType)) try {
		return JSON.parse(rawBody);
	} catch {
		throw new PagesBodyParseError("Invalid JSON", 400);
	}
	if (mediaType === "application/x-www-form-urlencoded") return decode(rawBody);
	return rawBody;
}
function createPagesReqRes(options) {
	const headersObj = {};
	for (const [key, value] of options.request.headers) headersObj[key.toLowerCase()] = value;
	const req = {
		method: options.request.method,
		url: options.url,
		headers: headersObj,
		query: options.query,
		body: options.body,
		cookies: parseCookies(options.request.headers.get("cookie"))
	};
	let resStatusCode = 200;
	const resHeaders = {};
	const setCookieHeaders = [];
	let resBody = null;
	let ended = false;
	let resolveResponse;
	const responsePromise = new Promise((resolve) => {
		resolveResponse = resolve;
	});
	const res = {
		get statusCode() {
			return resStatusCode;
		},
		set statusCode(code) {
			resStatusCode = code;
		},
		get headersSent() {
			return ended;
		},
		writeHead(code, headers) {
			resStatusCode = code;
			if (headers) for (const [key, value] of Object.entries(headers)) if (key.toLowerCase() === "set-cookie") if (Array.isArray(value)) setCookieHeaders.push(...value.map(String));
			else setCookieHeaders.push(String(value));
			else resHeaders[key.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
			return res;
		},
		setHeader(name, value) {
			if (name.toLowerCase() === "set-cookie") {
				setCookieHeaders.length = 0;
				if (Array.isArray(value)) setCookieHeaders.push(...value.map(String));
				else setCookieHeaders.push(String(value));
			} else resHeaders[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
			return res;
		},
		getHeader(name) {
			if (name.toLowerCase() === "set-cookie") return setCookieHeaders.length > 0 ? setCookieHeaders : void 0;
			return resHeaders[name.toLowerCase()];
		},
		end(data) {
			if (ended) return;
			ended = true;
			if (data !== void 0 && data !== null) resBody = data;
			const headers = new Headers();
			for (const [key, value] of Object.entries(resHeaders)) headers.set(key, String(value));
			for (const cookie of setCookieHeaders) headers.append("set-cookie", cookie);
			resolveResponse(new Response(resBody, {
				status: resStatusCode,
				headers
			}));
		},
		status(code) {
			resStatusCode = code;
			return res;
		},
		json(data) {
			resHeaders["content-type"] = "application/json";
			res.end(JSON.stringify(data));
		},
		send(data) {
			if (Buffer.isBuffer(data)) {
				if (!resHeaders["content-type"]) resHeaders["content-type"] = "application/octet-stream";
				resHeaders["content-length"] = String(data.length);
				res.end(new Uint8Array(data));
				return;
			}
			if (typeof data === "object" && data !== null) {
				resHeaders["content-type"] = "application/json";
				res.end(JSON.stringify(data));
				return;
			}
			if (!resHeaders["content-type"]) resHeaders["content-type"] = "text/plain";
			res.end(String(data));
		},
		redirect(statusOrUrl, url) {
			if (typeof statusOrUrl === "string") res.writeHead(307, { Location: statusOrUrl });
			else res.writeHead(statusOrUrl, { Location: url ?? "" });
			res.end();
		},
		getHeaders() {
			const headers = { ...resHeaders };
			if (setCookieHeaders.length > 0) headers["set-cookie"] = setCookieHeaders;
			return headers;
		}
	};
	return {
		req,
		res,
		responsePromise
	};
}
//#endregion
//#region node_modules/vinext/dist/server/pages-api-route.js
function buildPagesApiQuery(url, params) {
	return mergeRouteParamsIntoQuery$1(parseQueryString(url), params);
}
async function handlePagesApiRoute(options) {
	if (!options.match) return new Response("404 - API route not found", { status: 404 });
	const { route, params } = options.match;
	const handler = route.module.default;
	if (typeof handler !== "function") return new Response("API route does not export a default function", { status: 500 });
	try {
		const query = buildPagesApiQuery(options.url, params);
		const { req, res, responsePromise } = createPagesReqRes({
			body: await parsePagesApiBody(options.request),
			query,
			request: options.request,
			url: options.url
		});
		await handler(req, res);
		res.end();
		return await responsePromise;
	} catch (error) {
		if (error instanceof PagesBodyParseError) return new Response(error.message, {
			status: error.statusCode,
			statusText: error.message
		});
		options.reportRequestError?.(error instanceof Error ? error : new Error(String(error)), route.pattern);
		return internalServerErrorResponse();
	}
}
//#endregion
//#region node_modules/vinext/dist/server/isr-cache.js
/**
* ISR (Incremental Static Regeneration) cache layer.
*
* Wraps the pluggable CacheHandler with stale-while-revalidate semantics:
* - Fresh hit: serve immediately
* - Stale hit: serve immediately + trigger background regeneration
* - Miss: render synchronously, cache, serve
*
* Background regeneration is deduped — only one regeneration per cache key
* runs at a time, preventing thundering herd on popular pages.
*
* This layer works with any CacheHandler backend (memory, Redis, KV, etc.)
* because it only uses the standard get/set interface.
*/
/**
* Get a cache entry with staleness information.
*
* Returns { value, isStale: false } for fresh entries,
* { value, isStale: true } for expired-but-usable entries,
* or null for cache misses.
*/
async function isrGet$1(key) {
	const result = await getCacheHandler().get(key);
	if (!result || !result.value) return null;
	if (result.cacheState === "expired") return null;
	return {
		value: result,
		isStale: result.cacheState === "stale"
	};
}
/**
* Store a value in the ISR cache with a revalidation period.
*/
async function isrSet$1(key, data, revalidateSeconds, tags, expireSeconds) {
	await getCacheHandler().set(key, data, {
		cacheControl: expireSeconds === void 0 ? { revalidate: revalidateSeconds } : {
			revalidate: revalidateSeconds,
			expire: expireSeconds
		},
		revalidate: revalidateSeconds,
		tags: tags ?? []
	});
}
var _PENDING_REGEN_KEY = Symbol.for("vinext.isrCache.pendingRegenerations");
var _g = globalThis;
var pendingRegenerations = _g[_PENDING_REGEN_KEY] ??= /* @__PURE__ */ new Map();
/**
* Trigger a background regeneration for a cache key.
*
* If a regeneration for this key is already in progress, this is a no-op.
* The renderFn should produce the new cache value and call isrSet internally.
*
* On Cloudflare Workers the regeneration promise is registered with
* `ctx.waitUntil()` via the ALS-backed ExecutionContext, keeping the isolate
* alive until the regeneration completes even after the Response is returned.
*
* When `errorContext` is provided and the render function fails, the error
* is reported via `reportRequestError` (instrumentation hook) with
* `revalidateReason: "stale"`.
*/
function triggerBackgroundRegeneration$1(key, renderFn, errorContext) {
	if (pendingRegenerations.has(key)) return;
	const promise = renderFn().catch((err) => {
		console.error(`[vinext] ISR background regeneration failed for ${key}:`, err);
		if (errorContext) reportRequestError(err instanceof Error ? err : new Error(String(err)), {
			path: key,
			method: "GET",
			headers: {}
		}, {
			routerKind: errorContext.routerKind,
			routePath: errorContext.routePath,
			routeType: errorContext.routeType,
			revalidateReason: "stale"
		});
	}).finally(() => {
		pendingRegenerations.delete(key);
	});
	pendingRegenerations.set(key, promise);
	getRequestExecutionContext()?.waitUntil(promise);
}
/**
* Build a CachedPagesValue for the Pages Router ISR cache.
*/
function buildPagesCacheValue(html, pageData, status) {
	return {
		kind: "PAGES",
		html,
		pageData,
		headers: void 0,
		status
	};
}
function normalizeCachePathname(pathname) {
	return pathname === "/" ? "/" : pathname.replace(/\/$/, "");
}
function buildCacheKey(prefix, pathname, suffix) {
	const normalized = normalizeCachePathname(pathname);
	const suffixPart = suffix ? `:${suffix}` : "";
	const key = `${prefix}:${normalized}${suffixPart}`;
	if (key.length <= 200) return key;
	return `${prefix}:__hash:${fnv1a64(normalized)}${suffixPart}`;
}
/**
* Compute an ISR cache key for a given router type and pathname.
* Long pathnames are hashed to stay within KV key-length limits (512 bytes).
*/
function isrCacheKey$1(router, pathname, buildId) {
	return buildCacheKey(buildId ? `${router}:${buildId}` : router, pathname);
}
var _REVALIDATE_KEY = Symbol.for("vinext.isrCache.revalidateDurations");
_g[_REVALIDATE_KEY] ??= /* @__PURE__ */ new Map();
//#endregion
//#region node_modules/vinext/dist/server/csp.js
var ESCAPE_REGEX = /[&><\u2028\u2029]/;
function matchesDirectiveName(directive, name) {
	return directive === name || directive.startsWith(`${name} `);
}
function getScriptNonceFromHeader(cspHeaderValue) {
	const directives = cspHeaderValue.split(";").map((directive) => directive.trim());
	const directive = directives.find((value) => matchesDirectiveName(value, "script-src")) ?? directives.find((value) => matchesDirectiveName(value, "default-src"));
	if (!directive) return;
	const nonce = directive.split(" ").slice(1).map((source) => source.trim()).find((source) => source.startsWith("'nonce-") && source.length > 8 && source.endsWith("'"))?.slice(7, -1);
	if (!nonce) return;
	if (ESCAPE_REGEX.test(nonce)) throw new Error("Nonce value from Content-Security-Policy contained HTML escape characters.\nLearn more: https://nextjs.org/docs/messages/nonce-contained-invalid-characters");
	return nonce;
}
function getScriptNonceFromHeaders(headers) {
	const csp = headers?.get("content-security-policy") ?? headers?.get("content-security-policy-report-only");
	if (!csp) return;
	return getScriptNonceFromHeader(csp);
}
function getScriptNonceFromHeaderSources(...headersList) {
	for (const headers of headersList) {
		const nonce = getScriptNonceFromHeaders(headers);
		if (nonce) return nonce;
	}
}
//#endregion
//#region node_modules/vinext/dist/server/cache-control.js
var STATIC_CACHE_CONTROL = "s-maxage=31536000, stale-while-revalidate";
var STALE_REVALIDATE_CACHE_CONTROL = "s-maxage=0, stale-while-revalidate";
/**
* Matches Next.js's `getCacheControlHeader` stale window semantics while
* preserving vinext's legacy unbounded SWR header when no expire ceiling is
* available yet.
*
* Next.js source:
* https://github.com/vercel/next.js/blob/canary/packages/next/src/server/lib/cache-control.ts
*/
function buildRevalidateCacheControl(revalidateSeconds, expireSeconds) {
	if (expireSeconds === void 0) return `s-maxage=${revalidateSeconds}, stale-while-revalidate`;
	if (revalidateSeconds >= expireSeconds) return `s-maxage=${revalidateSeconds}`;
	return `s-maxage=${revalidateSeconds}, stale-while-revalidate=${expireSeconds - revalidateSeconds}`;
}
/**
* Builds Cache-Control for ISR cache reads. HIT responses and STALE responses
* with stored expire metadata use the same route policy because Next.js derives
* this header from cache-control metadata, not from the cache hit/stale state.
* STALE entries without expire metadata keep vinext's legacy `s-maxage=0`
* fallback so older cache entries are not treated as newly fresh downstream.
*/
function buildCachedRevalidateCacheControl(cacheState, revalidateSeconds, expireSeconds) {
	if (revalidateSeconds === Infinity) return STATIC_CACHE_CONTROL;
	if (cacheState === "STALE" && expireSeconds === void 0) return STALE_REVALIDATE_CACHE_CONTROL;
	return buildRevalidateCacheControl(revalidateSeconds, expireSeconds);
}
//#endregion
//#region node_modules/vinext/dist/shims/script-nonce-context.js
var ScriptNonceContext = React.createContext(void 0);
function ScriptNonceProvider(props) {
	return React.createElement(ScriptNonceContext.Provider, { value: props.nonce }, props.children);
}
function withScriptNonce(element, nonce) {
	if (!nonce) return element;
	return React.createElement(ScriptNonceProvider, { nonce }, element);
}
//#endregion
//#region node_modules/vinext/dist/server/pages-page-response.js
function buildPagesFontHeadHtml(fontLinks, fontPreloads, fontStyles, scriptNonce) {
	let html = "";
	const nonceAttr = createNonceAttribute(scriptNonce);
	for (const link of fontLinks) html += `<link rel="stylesheet"${nonceAttr} href="${escapeHtmlAttr(link)}" />\n  `;
	for (const preload of fontPreloads) html += `<link rel="preload"${nonceAttr} href="${escapeHtmlAttr(preload.href)}" as="font" type="${escapeHtmlAttr(preload.type)}" crossorigin />\n  `;
	if (fontStyles.length > 0) html += `<style data-vinext-fonts${nonceAttr}>${fontStyles.join("\n")}</style>\n  `;
	return html;
}
function buildPagesNextDataScript(options) {
	const nextDataPayload = {
		props: { pageProps: options.pageProps },
		page: options.routePattern,
		query: options.params,
		buildId: options.buildId,
		isFallback: false
	};
	if (options.i18n.locales) {
		nextDataPayload.locale = options.i18n.locale;
		nextDataPayload.locales = options.i18n.locales;
		nextDataPayload.defaultLocale = options.i18n.defaultLocale;
		nextDataPayload.domainLocales = options.i18n.domainLocales;
	}
	const localeGlobals = options.i18n.locales ? `;window.__VINEXT_LOCALE__=${options.safeJsonStringify(options.i18n.locale)};window.__VINEXT_LOCALES__=${options.safeJsonStringify(options.i18n.locales)};window.__VINEXT_DEFAULT_LOCALE__=${options.safeJsonStringify(options.i18n.defaultLocale)}` : "";
	return createInlineScriptTag(`window.__NEXT_DATA__ = ${options.safeJsonStringify(nextDataPayload)}${localeGlobals}`, options.scriptNonce);
}
async function buildPagesShellHtml(bodyMarker, fontHeadHTML, nextDataScript, options) {
	if (options.DocumentComponent) {
		let html = await options.renderDocumentToString(React.createElement(options.DocumentComponent));
		html = html.replace("__NEXT_MAIN__", bodyMarker);
		if (options.ssrHeadHTML || options.assetTags || fontHeadHTML) html = html.replace("</head>", `  ${fontHeadHTML}${options.ssrHeadHTML}\n  ${options.assetTags}\n</head>`);
		html = html.replace("<!-- __NEXT_SCRIPTS__ -->", nextDataScript);
		if (!html.includes("__NEXT_DATA__")) html = html.replace("</body>", `  ${nextDataScript}\n</body>`);
		return html;
	}
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${fontHeadHTML}${options.ssrHeadHTML}\n  ${options.assetTags}\n</head>
<body>
  <div id="__next">${bodyMarker}</div>\n  ${nextDataScript}\n</body>
</html>`;
}
async function buildPagesCompositeStream(bodyStream, shellPrefix, shellSuffix) {
	const encoder = new TextEncoder();
	return new ReadableStream({ async start(controller) {
		controller.enqueue(encoder.encode(shellPrefix));
		const reader = bodyStream.getReader();
		try {
			for (;;) {
				const chunk = await reader.read();
				if (chunk.done) break;
				controller.enqueue(chunk.value);
			}
		} finally {
			reader.releaseLock();
		}
		controller.enqueue(encoder.encode(shellSuffix));
		controller.close();
	} });
}
async function reportPagesIsrCacheWriteError(error, cacheKey, routePattern) {
	console.error(`[vinext] Pages ISR cache write failed for ${cacheKey}:`, error);
	try {
		await reportRequestError(error instanceof Error ? error : new Error(String(error)), {
			path: cacheKey,
			method: "GET",
			headers: {}
		}, {
			routerKind: "Pages Router",
			routePath: routePattern,
			routeType: "render"
		});
	} catch {}
}
function schedulePagesIsrCacheWrite(options) {
	const cacheWritePromise = readStreamAsText(options.stream).then((bodyHtml) => options.setCache(options.cacheKey, {
		kind: "PAGES",
		html: options.shellPrefix + bodyHtml + options.shellSuffix,
		pageData: options.pageData,
		headers: void 0,
		status: void 0
	}, options.revalidateSeconds, void 0, options.expireSeconds)).catch((error) => reportPagesIsrCacheWriteError(error, options.cacheKey, options.routePattern));
	getRequestExecutionContext()?.waitUntil(cacheWritePromise);
}
function applyGsspHeaders(headers, gsspRes) {
	if (!gsspRes) return 200;
	const gsspHeaders = gsspRes.getHeaders();
	for (const key of Object.keys(gsspHeaders)) {
		const value = gsspHeaders[key];
		if (key.toLowerCase() === "set-cookie" && Array.isArray(value)) {
			for (const cookie of value) headers.append("set-cookie", String(cookie));
			continue;
		}
		if (Array.isArray(value)) {
			headers.set(key, value.join(", "));
			continue;
		}
		if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") headers.set(key, String(value));
	}
	headers.set("Content-Type", "text/html");
	return gsspRes.statusCode;
}
async function renderPagesPageResponse(options) {
	const pageElement = withScriptNonce(React.createElement(React.Fragment, null, options.createPageElement(options.pageProps)), options.scriptNonce);
	options.resetSSRHead?.();
	await options.flushPreloads?.();
	const fontHeadHTML = buildPagesFontHeadHtml(options.getFontLinks(), options.fontPreloads, options.getFontStyles(), options.scriptNonce);
	const nextDataScript = buildPagesNextDataScript({
		buildId: options.buildId,
		i18n: options.i18n,
		pageProps: options.pageProps,
		params: options.params,
		routePattern: options.routePattern,
		safeJsonStringify: options.safeJsonStringify,
		scriptNonce: options.scriptNonce
	});
	const bodyMarker = "<!--VINEXT_STREAM_BODY-->";
	const bodyStream = await options.renderToReadableStream(pageElement);
	const shellHtml = await buildPagesShellHtml(bodyMarker, fontHeadHTML, nextDataScript, {
		assetTags: options.assetTags,
		DocumentComponent: options.DocumentComponent,
		renderDocumentToString: options.renderDocumentToString,
		ssrHeadHTML: options.getSSRHeadHTML?.() ?? ""
	});
	options.clearSsrContext();
	const markerIndex = shellHtml.indexOf(bodyMarker);
	const shellPrefix = shellHtml.slice(0, markerIndex);
	const shellSuffix = shellHtml.slice(markerIndex + 25);
	let responseBodyStream = bodyStream;
	if (!options.scriptNonce && options.isrRevalidateSeconds !== null && options.isrRevalidateSeconds > 0) {
		const cacheBodyStreamPair = bodyStream.tee();
		responseBodyStream = cacheBodyStreamPair[0];
		const cacheBodyStream = cacheBodyStreamPair[1];
		const isrPathname = options.routeUrl.split("?")[0];
		schedulePagesIsrCacheWrite({
			cacheKey: options.isrCacheKey("pages", isrPathname),
			expireSeconds: options.expireSeconds,
			pageData: options.pageProps,
			revalidateSeconds: options.isrRevalidateSeconds,
			routePattern: options.routePattern,
			setCache: options.isrSet,
			shellPrefix,
			shellSuffix,
			stream: cacheBodyStream
		});
	}
	const compositeStream = await buildPagesCompositeStream(responseBodyStream, shellPrefix, shellSuffix);
	const responseHeaders = new Headers({ "Content-Type": "text/html" });
	const finalStatus = applyGsspHeaders(responseHeaders, options.gsspRes);
	if (options.scriptNonce) responseHeaders.set("Cache-Control", "no-store, must-revalidate");
	else if (options.isrRevalidateSeconds) {
		responseHeaders.set("Cache-Control", buildRevalidateCacheControl(options.isrRevalidateSeconds, options.expireSeconds));
		responseHeaders.set(VINEXT_CACHE_HEADER, "MISS");
	}
	if (options.fontLinkHeader) responseHeaders.set("Link", options.fontLinkHeader);
	return Object.assign(new Response(compositeStream, {
		status: finalStatus,
		headers: responseHeaders
	}), { __vinextStreamedHtmlResponse: true });
}
//#endregion
//#region node_modules/vinext/dist/server/pages-page-data.js
function buildPagesNotFoundResponse() {
	return new Response("<!DOCTYPE html><html><body><h1>404 - Page not found</h1></body></html>", {
		status: 404,
		headers: { "Content-Type": "text/html" }
	});
}
function buildPagesDataNotFoundResponse() {
	return new Response("404", { status: 404 });
}
function resolvePagesRedirectStatus(redirect) {
	return redirect.statusCode != null ? redirect.statusCode : redirect.permanent ? 308 : 307;
}
function matchesPagesStaticPath(pathEntry, params) {
	return Object.entries(pathEntry.params).every(([key, value]) => {
		const actual = params[key];
		if (Array.isArray(value)) return Array.isArray(actual) && value.join("/") === actual.join("/");
		return String(value) === String(actual);
	});
}
function buildPagesCacheResponse(html, cacheState, fontLinkHeader, revalidateSeconds, expireSeconds, cacheControl) {
	const effectiveRevalidateSeconds = cacheControl?.revalidate ?? revalidateSeconds ?? 60;
	const effectiveExpireSeconds = cacheControl === void 0 ? void 0 : cacheControl.expire ?? expireSeconds;
	const headers = {
		"Content-Type": "text/html",
		[VINEXT_CACHE_HEADER]: cacheState,
		"Cache-Control": buildCachedRevalidateCacheControl(cacheState, effectiveRevalidateSeconds, effectiveExpireSeconds)
	};
	if (fontLinkHeader) headers.Link = fontLinkHeader;
	return new Response(html, {
		status: 200,
		headers
	});
}
function rewritePagesCachedHtml(cachedHtml, freshBody, nextDataScript) {
	const bodyStart = cachedHtml.indexOf("<div id=\"__next\">");
	const contentStart = bodyStart >= 0 ? bodyStart + 17 : -1;
	const nextDataStart = cachedHtml.indexOf("<script>window.__NEXT_DATA__");
	if (contentStart >= 0 && nextDataStart >= 0) {
		const region = cachedHtml.slice(contentStart, nextDataStart);
		const lastCloseDiv = region.lastIndexOf("</div>");
		const gap = lastCloseDiv >= 0 ? region.slice(lastCloseDiv + 6) : "";
		const nextDataEnd = cachedHtml.indexOf("<\/script>", nextDataStart) + 9;
		const tail = cachedHtml.slice(nextDataEnd);
		return cachedHtml.slice(0, contentStart) + freshBody + "</div>" + gap + nextDataScript + tail;
	}
	return "<!DOCTYPE html>\n<html>\n<head>\n</head>\n<body>\n  <div id=\"__next\">" + freshBody + "</div>\n  " + nextDataScript + "\n</body>\n</html>";
}
async function renderPagesIsrHtml(options) {
	const freshBody = await options.renderIsrPassToStringAsync(options.createPageElement(options.pageProps));
	const nextDataScript = buildPagesNextDataScript({
		buildId: options.buildId,
		i18n: options.i18n,
		pageProps: options.pageProps,
		params: options.params,
		routePattern: options.routePattern,
		safeJsonStringify: options.safeJsonStringify
	});
	return rewritePagesCachedHtml(options.cachedHtml, freshBody, nextDataScript);
}
async function resolvePagesPageData(options) {
	if (typeof options.pageModule.getStaticPaths === "function" && options.route.isDynamic) {
		const pathsResult = await options.pageModule.getStaticPaths({
			locales: options.i18n.locales ?? [],
			defaultLocale: options.i18n.defaultLocale ?? ""
		});
		if ((pathsResult?.fallback ?? false) === false) {
			if (!(pathsResult?.paths ?? []).some((pathEntry) => matchesPagesStaticPath(pathEntry, options.params))) return {
				kind: "response",
				response: buildPagesNotFoundResponse()
			};
		}
	}
	let pageProps = {};
	let gsspRes = null;
	if (typeof options.pageModule.getServerSideProps === "function") {
		const { req, res, responsePromise } = options.createGsspReqRes();
		const result = await options.pageModule.getServerSideProps({
			params: options.params,
			req,
			res,
			query: options.query,
			resolvedUrl: options.routeUrl,
			locale: options.i18n.locale,
			locales: options.i18n.locales,
			defaultLocale: options.i18n.defaultLocale
		});
		if (res.headersSent) return {
			kind: "response",
			response: await responsePromise
		};
		if (result?.props) pageProps = result.props;
		if (result?.redirect) return {
			kind: "response",
			response: new Response(null, {
				status: resolvePagesRedirectStatus(result.redirect),
				headers: { Location: options.sanitizeDestination(result.redirect.destination) }
			})
		};
		if (result?.notFound) return {
			kind: "response",
			response: buildPagesDataNotFoundResponse()
		};
		gsspRes = res;
	}
	let isrRevalidateSeconds = null;
	if (typeof options.pageModule.getStaticProps === "function") {
		const pathname = options.routeUrl.split("?")[0];
		const cacheKey = options.isrCacheKey("pages", pathname);
		const cached = await options.isrGet(cacheKey);
		const cachedValue = cached?.value.value;
		if (cachedValue?.kind === "PAGES" && cached && !cached.isStale && !options.scriptNonce) return {
			kind: "response",
			response: buildPagesCacheResponse(cachedValue.html, "HIT", options.fontLinkHeader, void 0, options.expireSeconds, cached.value.cacheControl)
		};
		if (cachedValue?.kind === "PAGES" && cached && cached.isStale && !options.scriptNonce) {
			options.triggerBackgroundRegeneration(cacheKey, async function() {
				return options.runInFreshUnifiedContext(async () => {
					const freshResult = await options.pageModule.getStaticProps?.({
						params: options.params,
						locale: options.i18n.locale,
						locales: options.i18n.locales,
						defaultLocale: options.i18n.defaultLocale
					});
					if (freshResult?.props && typeof freshResult.revalidate === "number" && freshResult.revalidate > 0) {
						options.applyRequestContexts();
						const freshHtml = await renderPagesIsrHtml({
							buildId: options.buildId,
							cachedHtml: cachedValue.html,
							createPageElement: options.createPageElement,
							i18n: options.i18n,
							pageProps: freshResult.props,
							params: options.params,
							renderIsrPassToStringAsync: options.renderIsrPassToStringAsync,
							routePattern: options.routePattern,
							safeJsonStringify: options.safeJsonStringify
						});
						await options.isrSet(cacheKey, buildPagesCacheValue(freshHtml, freshResult.props), freshResult.revalidate, void 0, options.expireSeconds);
					}
				});
			}, {
				routerKind: "Pages Router",
				routePath: options.routePattern,
				routeType: "render"
			});
			return {
				kind: "response",
				response: buildPagesCacheResponse(cachedValue.html, "STALE", options.fontLinkHeader, void 0, options.expireSeconds, cached.value.cacheControl)
			};
		}
		const result = await options.pageModule.getStaticProps({
			params: options.params,
			locale: options.i18n.locale,
			locales: options.i18n.locales,
			defaultLocale: options.i18n.defaultLocale
		});
		if (result?.props) pageProps = result.props;
		if (result?.redirect) return {
			kind: "response",
			response: new Response(null, {
				status: resolvePagesRedirectStatus(result.redirect),
				headers: { Location: options.sanitizeDestination(result.redirect.destination) }
			})
		};
		if (result?.notFound) return {
			kind: "response",
			response: buildPagesDataNotFoundResponse()
		};
		if (typeof result?.revalidate === "number" && result.revalidate > 0) isrRevalidateSeconds = result.revalidate;
	}
	return {
		kind: "render",
		gsspRes,
		isrRevalidateSeconds,
		pageProps
	};
}
//#endregion
//#region \0virtual:vinext-server-entry
var buildId = "135608c6-1014-4094-8281-19af1bd2a768";
var vinextConfig = {
	"basePath": "",
	"trailingSlash": false,
	"redirects": [],
	"rewrites": {
		"beforeFiles": [],
		"afterFiles": [],
		"fallback": []
	},
	"headers": [],
	"expireTime": 31536e3,
	"i18n": null,
	"images": {}
};
function isrGet(key) {
	return isrGet$1(key);
}
function isrSet(key, data, revalidateSeconds, tags, expireSeconds) {
	return isrSet$1(key, data, revalidateSeconds, tags, expireSeconds);
}
function triggerBackgroundRegeneration(key, renderFn, errorContext) {
	return triggerBackgroundRegeneration$1(key, renderFn, errorContext);
}
function isrCacheKey(router, pathname) {
	return isrCacheKey$1(router, pathname, buildId);
}
async function renderToStringAsync(element) {
	const stream = await renderToReadableStream(element);
	await stream.allReady;
	return new Response(stream).text();
}
async function renderIsrPassToStringAsync(element) {
	return await runWithServerInsertedHTMLState(() => runWithHeadState(() => _runWithCacheState(() => runWithPrivateCache(() => runWithFetchCache(async () => renderToStringAsync(element))))));
}
var DocumentComponent = null;
var pageRoutes = [];
var _pageRouteTrie = buildRouteTrie(pageRoutes);
var apiRoutes = [];
var _apiRouteTrie = buildRouteTrie(apiRoutes);
function matchRoute(url, routes) {
	const pathname = url.split("?")[0];
	const urlParts = (pathname === "/" ? "/" : pathname.replace(/\/$/, "")).split("/").filter(Boolean);
	return trieMatch(routes === pageRoutes ? _pageRouteTrie : _apiRouteTrie, urlParts);
}
function matchPageRoute(url, request) {
	return matchRoute(url, pageRoutes);
}
function parseQuery(url) {
	const qs = url.split("?")[1];
	if (!qs) return {};
	const p = new URLSearchParams(qs);
	const q = {};
	for (const [k, v] of p) if (k in q) q[k] = Array.isArray(q[k]) ? q[k].concat(v) : [q[k], v];
	else q[k] = v;
	return q;
}
function mergeRouteParamsIntoQuery(query, params) {
	return Object.assign(query, params);
}
function patternToNextFormat(pattern) {
	return pattern.replace(/:([^\/]+?)\+(?=\/|$)/g, "[...$1]").replace(/:([^\/]+?)\*(?=\/|$)/g, "[[...$1]]").replace(/:([^\/]+?)(?=\/|$)/g, "[$1]");
}
function collectAssetTags(manifest, moduleIds, scriptNonce) {
	const m = manifest && Object.keys(manifest).length > 0 ? manifest : typeof globalThis !== "undefined" && globalThis.__VINEXT_SSR_MANIFEST__ || null;
	const tags = [];
	const seen = /* @__PURE__ */ new Set();
	const nonceAttr = createNonceAttribute(scriptNonce);
	var lazyChunks = typeof globalThis !== "undefined" && globalThis.__VINEXT_LAZY_CHUNKS__ || null;
	var lazySet = lazyChunks && lazyChunks.length > 0 ? new Set(lazyChunks) : null;
	if (typeof globalThis !== "undefined" && globalThis.__VINEXT_CLIENT_ENTRY__) {
		const entry = globalThis.__VINEXT_CLIENT_ENTRY__;
		seen.add(entry);
		tags.push("<link rel=\"modulepreload\"" + nonceAttr + " href=\"/" + entry + "\" />");
		tags.push("<script type=\"module\"" + nonceAttr + " src=\"/" + entry + "\" crossorigin><\/script>");
	}
	if (m) {
		var allFiles = [];
		if (moduleIds && moduleIds.length > 0) {
			for (var mi = 0; mi < moduleIds.length; mi++) {
				var id = moduleIds[mi];
				var files = m[id];
				if (!files) {
					for (var mk in m) if (id.endsWith("/" + mk) || id === mk) {
						files = m[mk];
						break;
					}
				}
				if (files) for (var fi = 0; fi < files.length; fi++) allFiles.push(files[fi]);
			}
			for (var key in m) {
				var vals = m[key];
				if (!vals) continue;
				for (var vi = 0; vi < vals.length; vi++) {
					var file = vals[vi];
					var basename = file.split("/").pop() || "";
					if (basename.startsWith("framework-") || basename.startsWith("vinext-") || basename.includes("vinext-client-entry") || basename.includes("vinext-app-browser-entry")) allFiles.push(file);
				}
			}
		} else for (var akey in m) {
			var avals = m[akey];
			if (avals) for (var ai = 0; ai < avals.length; ai++) allFiles.push(avals[ai]);
		}
		for (var ti = 0; ti < allFiles.length; ti++) {
			var tf = allFiles[ti];
			if (tf.charAt(0) === "/") tf = tf.slice(1);
			if (seen.has(tf)) continue;
			seen.add(tf);
			if (tf.endsWith(".css")) tags.push("<link rel=\"stylesheet\"" + nonceAttr + " href=\"/" + tf + "\" />");
			else if (tf.endsWith(".js")) {
				if (lazySet && lazySet.has(tf)) continue;
				tags.push("<link rel=\"modulepreload\"" + nonceAttr + " href=\"/" + tf + "\" />");
				tags.push("<script type=\"module\"" + nonceAttr + " src=\"/" + tf + "\" crossorigin><\/script>");
			}
		}
	}
	return tags.join("\n  ");
}
async function renderPage(request, url, manifest, ctx, middlewareHeaders) {
	if (ctx) return runWithExecutionContext(ctx, () => _renderPage(request, url, manifest, middlewareHeaders));
	return _renderPage(request, url, manifest, middlewareHeaders);
}
async function _renderPage(request, url, manifest, middlewareHeaders) {
	const localeInfo = {
		locale: void 0,
		url,
		hadPrefix: false,
		domainLocale: void 0,
		redirectUrl: void 0
	};
	const locale = localeInfo.locale;
	const routeUrl = localeInfo.url;
	const currentDefaultLocale = void 0;
	const domainLocales = void 0;
	if (localeInfo.redirectUrl) return new Response(null, {
		status: 307,
		headers: { Location: localeInfo.redirectUrl }
	});
	const match = matchRoute(routeUrl, pageRoutes);
	if (!match) return new Response("<!DOCTYPE html><html><body><h1>404 - Page not found</h1></body></html>", {
		status: 404,
		headers: { "Content-Type": "text/html" }
	});
	const { route, params } = match;
	return runWithRequestContext(createRequestContext({ executionContext: getRequestExecutionContext() }), async () => {
		ensureFetchPatch();
		try {
			const routePattern = patternToNextFormat(route.pattern);
			const query = mergeRouteParamsIntoQuery(parseQuery(routeUrl), params);
			if (typeof setSSRContext === "function") setSSRContext({
				pathname: routePattern,
				query,
				asPath: routeUrl,
				locale,
				locales: void 0,
				defaultLocale: currentDefaultLocale,
				domainLocales
			});
			const pageModule = route.module;
			const PageComponent = pageModule.default;
			if (!PageComponent) return new Response("Page has no default export", { status: 500 });
			const scriptNonce = getScriptNonceFromHeaderSources(request.headers, middlewareHeaders);
			var _fontLinkHeader = "";
			var _allFp = [];
			try {
				var _fpGoogle = typeof getSSRFontPreloads$1 === "function" ? getSSRFontPreloads$1() : [];
				var _fpLocal = typeof getSSRFontPreloads === "function" ? getSSRFontPreloads() : [];
				_allFp = _fpGoogle.concat(_fpLocal);
				if (_allFp.length > 0) _fontLinkHeader = _allFp.map(function(p) {
					return "<" + p.href + ">; rel=preload; as=font; type=" + p.type + "; crossorigin";
				}).join(", ");
			} catch (e) {}
			const pageDataResult = await resolvePagesPageData({
				applyRequestContexts() {
					if (typeof setSSRContext === "function") setSSRContext({
						pathname: routePattern,
						query,
						asPath: routeUrl,
						locale,
						locales: void 0,
						defaultLocale: currentDefaultLocale,
						domainLocales
					});
				},
				buildId,
				createGsspReqRes() {
					return createPagesReqRes({
						body: void 0,
						query,
						request,
						url: routeUrl
					});
				},
				createPageElement(currentPageProps) {
					return wrapWithRouterContext(React.createElement(PageComponent, currentPageProps));
				},
				fontLinkHeader: _fontLinkHeader,
				i18n: {
					locale,
					locales: void 0,
					defaultLocale: currentDefaultLocale,
					domainLocales
				},
				isrCacheKey,
				isrGet,
				isrSet,
				expireSeconds: vinextConfig.expireTime,
				pageModule,
				params,
				query,
				renderIsrPassToStringAsync,
				route: { isDynamic: route.isDynamic },
				routePattern,
				routeUrl,
				runInFreshUnifiedContext(callback) {
					return runWithRequestContext(createRequestContext({ executionContext: getRequestExecutionContext() }), async () => {
						ensureFetchPatch();
						return callback();
					});
				},
				safeJsonStringify,
				sanitizeDestination,
				scriptNonce,
				triggerBackgroundRegeneration
			});
			if (pageDataResult.kind === "response") return pageDataResult.response;
			let pageProps = pageDataResult.pageProps;
			var gsspRes = pageDataResult.gsspRes;
			let isrRevalidateSeconds = pageDataResult.isrRevalidateSeconds;
			return renderPagesPageResponse({
				assetTags: collectAssetTags(manifest, route.filePath ? [route.filePath] : [], scriptNonce),
				buildId,
				clearSsrContext() {
					if (typeof setSSRContext === "function") setSSRContext(null);
				},
				createPageElement(currentPageProps) {
					return wrapWithRouterContext(React.createElement(PageComponent, currentPageProps));
				},
				DocumentComponent,
				flushPreloads: typeof flushPreloads === "function" ? flushPreloads : void 0,
				fontLinkHeader: _fontLinkHeader,
				fontPreloads: _allFp,
				getFontLinks() {
					try {
						return typeof getSSRFontLinks === "function" ? getSSRFontLinks() : [];
					} catch (e) {
						return [];
					}
				},
				getFontStyles() {
					try {
						var allFontStyles = [];
						if (typeof getSSRFontStyles$1 === "function") allFontStyles.push(...getSSRFontStyles$1());
						if (typeof getSSRFontStyles === "function") allFontStyles.push(...getSSRFontStyles());
						return allFontStyles;
					} catch (e) {
						return [];
					}
				},
				getSSRHeadHTML: typeof getSSRHeadHTML === "function" ? getSSRHeadHTML : void 0,
				gsspRes,
				isrCacheKey,
				expireSeconds: vinextConfig.expireTime,
				isrRevalidateSeconds,
				isrSet,
				i18n: {
					locale,
					locales: void 0,
					defaultLocale: currentDefaultLocale,
					domainLocales
				},
				pageProps,
				params,
				renderDocumentToString(element) {
					return renderToStringAsync(element);
				},
				renderToReadableStream(element) {
					return renderToReadableStream(element);
				},
				resetSSRHead: typeof resetSSRHead === "function" ? resetSSRHead : void 0,
				routePattern,
				routeUrl,
				safeJsonStringify,
				scriptNonce
			});
		} catch (e) {
			console.error("[vinext] SSR error:", e);
			reportRequestError(e instanceof Error ? e : new Error(String(e)), {
				path: url,
				method: request.method,
				headers: Object.fromEntries(request.headers.entries())
			}, {
				routerKind: "Pages Router",
				routePath: route.pattern,
				routeType: "render"
			}).catch(() => {});
			return new Response("Internal Server Error", { status: 500 });
		}
	});
}
async function handleApiRoute(request, url) {
	return handlePagesApiRoute({
		match: matchRoute(url, apiRoutes),
		request,
		url,
		reportRequestError(error, routePattern) {
			console.error("[vinext] API error:", error);
			reportRequestError(error, {
				path: url,
				method: request.method,
				headers: Object.fromEntries(request.headers.entries())
			}, {
				routerKind: "Pages Router",
				routePath: routePattern,
				routeType: "route"
			});
		}
	});
}
async function runMiddleware() {
	return { continue: true };
}
//#endregion
export { handleApiRoute, matchPageRoute, pageRoutes, renderPage, runMiddleware, vinextConfig };
