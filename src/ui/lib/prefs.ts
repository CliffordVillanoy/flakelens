// Preferences only (theme, density, columns, shortcuts). User data lives in IndexedDB, never here.
// Every access is guarded: private mode, blocked storage or a full quota must never break the app.
const PREFIX = 'flakelens.';

export function getPref<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setPref(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Not saved; the app keeps working for this session.
  }
}
