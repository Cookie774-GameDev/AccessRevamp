import { createLifecycle } from './lifecycle.js';

const DETAIL_ROUTE = '/work/:slug';

function matchRoute(pathname, routes) {
  if (routes[pathname]) return { pattern: pathname, view: routes[pathname], params: {} };

  const workMatch = pathname.match(/^\/work\/([^/]+)$/);
  if (workMatch && routes[DETAIL_ROUTE]) {
    return {
      pattern: DETAIL_ROUTE,
      view: routes[DETAIL_ROUTE],
      params: { slug: decodeURIComponent(workMatch[1]) },
    };
  }

  return null;
}

export function createRouter({ routes, fallback, render }) {
  const lifecycle = createLifecycle();

  const renderPath = (pathname = location.pathname) => {
    lifecycle.cleanup();
    const match = matchRoute(pathname, routes);
    const cleanup = render({
      pathname,
      pattern: match?.pattern || pathname,
      params: match?.params || {},
      view: match?.view || fallback,
    });
    lifecycle.add(cleanup);
  };

  const navigate = (path, { replace = false } = {}) => {
    const url = new URL(path, location.origin);
    if (url.origin !== location.origin) return;
    if (replace) history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    else history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    renderPath(url.pathname);
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const onClick = (event) => {
    const link = event.target.closest('a[data-nav]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const url = new URL(link.href, location.origin);
    if (url.origin !== location.origin) return;
    event.preventDefault();
    navigate(`${url.pathname}${url.search}${url.hash}`);
  };

  const onPopState = () => renderPath(location.pathname);

  return {
    start() {
      document.addEventListener('click', onClick);
      window.addEventListener('popstate', onPopState);
      renderPath();
    },
    navigate,
    destroy() {
      lifecycle.cleanup();
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPopState);
    },
  };
}
