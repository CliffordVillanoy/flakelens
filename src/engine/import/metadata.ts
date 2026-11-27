import type { Run } from '../types';

// Run metadata from a Playwright 1.65 JSON report (DEV-39). Every path below was checked against real reports recorded
// from the flake lab (fixtures/playwright/real/). Everything in a report is untrusted text, so each value is cleaned,
// capped, or null. Nothing here throws, and nothing is guessed: a field the report does not hold stays null.
//
//   commit   config.metadata.gitCommit.hash      (only when the run used captureGitInfo.commit)
//   branch   config.metadata.gitCommit.branch    (same)
//   browser  config.filteredProjects[].use.defaultBrowserType
//   shard    config.shard = { current, total }   (null without --shard)
//   os       not in a Playwright report; only a custom config.metadata.os that the project set itself is read

export const META_MAX = 200;
const RAW_MAX = 10_000; // longer text is cut before it is scanned, so cost does not grow with a hostile string
const PROJECTS_SCANNED = 100;
const BROWSERS_KEPT = 5;
const HASH = /^[0-9a-f]{7,64}$/i;

export type RunMetadata = Pick<Run, 'commit'> & { branch: string | null; browser: string | null; shard: { current: number; total: number } | null; os: string | null };

const record = (v: unknown): Record<string, unknown> | null => (v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Text only: control characters are dropped, the ends trimmed, the length capped. Anything else, or nothing left, is null. */
export function cleanMeta(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let out = '';
  for (const ch of raw.slice(0, RAW_MAX)) {
    const c = ch.codePointAt(0)!;
    if (c < 32 || (c >= 127 && c <= 159) || c === 0x2028 || c === 0x2029) continue;
    out += ch;
  }
  const text = out.trim().slice(0, META_MAX);
  return text === '' ? null : text;
}

const positiveInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 1;

export function readRunMetadata(config: unknown): RunMetadata {
  const cfg = record(config);
  const meta = record(cfg?.metadata);
  const git = record(meta?.gitCommit);

  const hash = cleanMeta(git?.hash);
  const commit = hash !== null && HASH.test(hash) ? hash : null;

  const browsers = new Set<string>();
  const projects = Array.isArray(cfg?.filteredProjects) ? cfg.filteredProjects.slice(0, PROJECTS_SCANNED) : [];
  for (const p of projects) {
    const b = cleanMeta(record(record(p)?.use)?.defaultBrowserType);
    if (b !== null && browsers.size < BROWSERS_KEPT) browsers.add(b);
  }

  const s = record(cfg?.shard);
  return {
    commit,
    branch: cleanMeta(git?.branch),
    browser: browsers.size > 0 ? [...browsers].join(', ').slice(0, META_MAX) : null,
    shard: s && positiveInt(s.current) && positiveInt(s.total) ? { current: s.current, total: s.total } : null,
    os: cleanMeta(meta?.os),
  };
}
