import { useMemo, useSyncExternalStore } from 'react';

export type RouteName = 'start' | 'tests' | 'test' | 'data' | 'settings';
export interface Route {
  name: RouteName;
  testId?: string;
  query: URLSearchParams;
}

// Hash routes (spec 13.3, IA): #/, #/tests?status=&q=, #/tests/:testId, #/data, #/settings. Anything else is Start.
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  const query = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1));
  const parts = path.split('/').filter(Boolean);
  if (!path.startsWith('/') && path !== '') return { name: 'start', query };
  if (parts.length === 1 && parts[0] === 'tests') return { name: 'tests', query };
  if (parts.length === 1 && parts[0] === 'data') return { name: 'data', query };
  if (parts.length === 1 && parts[0] === 'settings') return { name: 'settings', query };
  if (parts.length === 2 && parts[0] === 'tests') {
    try {
      return { name: 'test', testId: decodeURIComponent(parts[1]!), query };
    } catch {
      return { name: 'start', query };
    }
  }
  return { name: 'start', query };
}

// replace: update the URL without a new history entry (search typing), then tell useRoute.
export function navigate(hash: string, { replace = false } = {}): void {
  if (window.location.hash === hash) return;
  if (!replace) window.location.hash = hash;
  else {
    window.history.replaceState(window.history.state, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

// The snapshot is the hash string (a stable primitive); the parsed route is memoised on it, so `route.query` keeps
// its identity until the hash really changes and effects that depend on it run once per change.
export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, getHash);
  return useMemo(() => parseRoute(hash), [hash]);
}
