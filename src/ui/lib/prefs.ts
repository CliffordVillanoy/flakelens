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

// Settings the user chose on purpose. "Clear all data" keeps them: they are not data, and the shortcuts switch
// is an accessibility setting that must not flip back on by surprise.
const KEPT_ON_CLEAR = ['theme', 'density', 'shortcuts'];

/** Removes every FlakeLens preference except the kept settings (column choice, dismissed tips, ...). */
export function clearPrefs(keep: string[] = KEPT_ON_CLEAR): void {
  try {
    const storage = window.localStorage;
    const mine = Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => !!k && k.startsWith(PREFIX));
    for (const k of mine) if (!keep.includes(k.slice(PREFIX.length))) storage.removeItem(k);
  } catch {
    // Nothing to clear, or storage is blocked.
  }
}
