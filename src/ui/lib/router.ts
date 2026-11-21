import { useSyncExternalStore } from 'react';

export type RouteName = 'start' | 'tests' | 'test' | 'data';
export interface Route {
  name: RouteName;
  testId?: string;
  query: URLSearchParams;
}

// Hash routes (spec 13.3, IA): #/, #/tests?status=&q=, #/tests/:testId, #/data. Anything else is Start.
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  const query = new URLSearchParams(q === -1 ? '' : raw.slice(q + 1));
  const parts = path.split('/').filter(Boolean);
  if (!path.startsWith('/') && path !== '') return { name: 'start', query };
  if (parts.length === 1 && parts[0] === 'tests') return { name: 'tests', query };
  if (parts.length === 1 && parts[0] === 'data') return { name: 'data', query };
  if (parts.length === 2 && parts[0] === 'tests') {
    try {
      return { name: 'test', testId: decodeURIComponent(parts[1]!), query };
    } catch {
      return { name: 'start', query };
    }
  }
  return { name: 'start', query };
}

export function navigate(hash: string): void {
  if (window.location.hash !== hash) window.location.hash = hash;
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
const getHash = () => window.location.hash;

// Parse per render from the hash string, so the snapshot stays a stable primitive.
export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, getHash));
}
