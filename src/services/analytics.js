import { ANALYTICS_EVENTS, ANALYTICS_PROPERTY_KEYS } from '../config/analytics-events.js';

const BLOCKED_KEY = /email|token|secret|password|stripe|url|address|accessnotes|message/i;
let consent = false;
let transport = null;

export function sanitizeProperties(properties = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(properties)) {
    if (BLOCKED_KEY.test(key) || !ANALYTICS_PROPERTY_KEYS.has(key)) throw new Error(`Analytics property is not permitted: ${key}`);
    if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error(`Analytics property must be scalar: ${key}`);
    safe[key] = String(value).slice(0, 80);
  }
  return safe;
}

export function setAnalyticsConsent(value) { consent = value === true; }
export function configureAnalyticsTransport(nextTransport) { transport = typeof nextTransport === 'function' ? nextTransport : null; }

export function track(eventName, properties = {}) {
  if (!ANALYTICS_EVENTS.has(eventName)) return false;
  const detail = { event: eventName, properties: sanitizeProperties(properties) };
  globalThis.dispatchEvent?.(new CustomEvent('accessrevamp:analytics', { detail }));
  if (consent && transport) transport(detail);
  return true;
}
