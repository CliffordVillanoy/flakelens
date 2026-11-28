import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { redactSecrets } from '../src/engine/group/normalize.ts';

// DEV-50: the CI report is uploaded as an artifact, so it is rebuilt from an ALLOWLIST before the upload. Nothing is copied
// unless it is named here; anything else (the commit author, committer and body, the source diff, environment, attachments,
// stdout, absolute paths, and every field a future Playwright adds) is dropped by default.
//
// Kept, and why (it is what the report is for, and what FlakeLens reads when it imports the file):
//   config      version; shard {current, total}; metadata.gitCommit {hash, shortHash, subject, branch}; metadata.os (the one
//               custom field FlakeLens reads); projects[] and filteredProjects[] as {id, name, use.defaultBrowserType}
//   suites      the test tree: titles, file paths (made repo-relative), line, column, project names, test ids, tags
//   tests       status, expectedStatus, per attempt: status, duration, retry, startTime, errors[] / error {message, stack}
//   stats       startTime, duration, expected, skipped, unexpected, flaky (and the top-level errors[] with message and stack)
// Every kept free-text value (titles, paths, messages, stacks, subject, branch) is cleaned: the repo root becomes a relative
// path, other absolute paths and email addresses become [path] and [email], and secrets are masked with redactSecrets (the
// same bounded patterns the app uses). Text is cut at 50,000 characters first, so every pattern sees a bounded input.
//
// Run with: node scripts/scrub-report.ts [report.json]   (in place; a missing file is fine, a bad file fails the step)
// scripts/verify-report.ts is the check that runs after this one.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const isObj = (v: Json | undefined): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const TEXT_CAP = 50_000; // redactSecrets reads this much
const MAX_DEPTH = 100; // nested suites deeper than this are dropped
const MAX_LIST = 100_000; // tests, specs and suites kept per level

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const EMAIL = /[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8}/g;
// A drive path (C:\... or C:/...) and the usual home and runner folders. Bounded repeats, and a lookbehind so a URL such as
// https://host/home/page is not taken for a path.
const DRIVE_PATH = /(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s"'`<>|)]{0,300}/g;
const UNIX_PATH = /(?<![\w:.-])\/(?:home|Users|root|__w)(?:\/[^\s"'`<>|():]{1,100}){0,12}/g;

/** Cleans one free-text value: repo-relative paths, no other absolute path, no email, no secret. */
export function cleanText(value: string, root = '', runs = true): string {
  let s = value.length > TEXT_CAP ? value.slice(0, TEXT_CAP) : value;
  if (root) {
    const re = new RegExp(`${escapeRe(root).replace(/\//g, '[\\\\/]')}(?:[\\\\/]|(?![A-Za-z0-9_]))`, 'g');
    s = s.replace(re, '');
  }
  s = s.replace(DRIVE_PATH, '[path]').replace(UNIX_PATH, '[path]').replace(EMAIL, '[email]');
  return redactSecrets(s, { runs });
}

const HASH = /^[0-9a-f]{7,64}$/i;
const num = (v: Json | undefined): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const put = (out: Obj, key: string, value: Json | undefined) => {
  if (value !== undefined) out[key] = value;
};

export function scrubReport(report: Json): Json {
  if (!isObj(report)) return report;
  const cfg = isObj(report.config) ? report.config : {};
  // The repo root is the parent of the test folder; every absolute path in the report starts with it.
  const root = typeof cfg.rootDir === 'string' ? cfg.rootDir.replace(/[\\/]+$/, '').replace(/[\\/][^\\/]+$/, '') : '';
  const text = (v: Json | undefined, cap = 2_000): string | undefined => (typeof v === 'string' ? cleanText(v, root).slice(0, cap) : undefined);
  // Branch names and commit subjects are plain names, not log text: keyed secrets are still masked, but a long
  // letters-and-digits name such as ci/dev-50-scrub-allowlist stays readable.
  const name = (v: Json | undefined, cap: number): string | undefined => (typeof v === 'string' ? cleanText(v, root, false).slice(0, cap) : undefined);
  // Test ids are hashes, not text: kept only if they look like one.
  const id = (v: Json | undefined): string | undefined => (typeof v === 'string' && /^[0-9a-f]{1,64}(?:-[0-9a-f]{1,64}){0,3}$/i.test(v) ? v : undefined);

  const project = (p: Json): Json => {
    const o = isObj(p) ? p : {};
    const out: Obj = {};
    put(out, 'id', text(o.id, 200));
    put(out, 'name', text(o.name, 200));
    const browser = isObj(o.use) ? text(o.use.defaultBrowserType, 50) : undefined;
    if (browser !== undefined) out.use = { defaultBrowserType: browser };
    return out;
  };
  const projects = (v: Json | undefined): Json[] | undefined => (Array.isArray(v) ? v.slice(0, 100).map(project) : undefined);

  const config: Obj = {};
  put(config, 'version', text(cfg.version, 50));
  if (isObj(cfg.shard) && num(cfg.shard.current) !== undefined && num(cfg.shard.total) !== undefined) config.shard = { current: cfg.shard.current as number, total: cfg.shard.total as number };
  else if (cfg.shard === null) config.shard = null;
  if (isObj(cfg.metadata)) {
    const meta: Obj = {};
    const git = cfg.metadata.gitCommit;
    if (isObj(git)) {
      const c: Obj = {};
      if (typeof git.hash === 'string' && HASH.test(git.hash)) c.hash = git.hash;
      if (typeof git.shortHash === 'string' && HASH.test(git.shortHash)) c.shortHash = git.shortHash;
      put(c, 'subject', name(git.subject, 500));
      put(c, 'branch', name(git.branch, 200));
      meta.gitCommit = c;
    }
    put(meta, 'os', text(cfg.metadata.os, 200));
    config.metadata = meta;
  }
  put(config, 'projects', projects(cfg.projects));
  put(config, 'filteredProjects', projects(cfg.filteredProjects));

  const error = (e: Json | undefined): Json | undefined => {
    if (!isObj(e)) return undefined;
    const out: Obj = {};
    put(out, 'message', text(e.message, TEXT_CAP));
    put(out, 'stack', text(e.stack, TEXT_CAP));
    return out;
  };
  const result = (r: Json): Json => {
    const o = isObj(r) ? r : {};
    const out: Obj = {};
    put(out, 'status', text(o.status, 50));
    put(out, 'duration', num(o.duration));
    put(out, 'retry', num(o.retry));
    put(out, 'startTime', text(o.startTime, 40));
    const one = error(o.error);
    if (one) out.error = one;
    if (Array.isArray(o.errors)) out.errors = o.errors.slice(0, 20).map((e) => error(e) ?? {});
    return out;
  };
  const test = (t: Json): Json => {
    const o = isObj(t) ? t : {};
    const out: Obj = {};
    put(out, 'projectId', text(o.projectId, 200));
    put(out, 'projectName', text(o.projectName, 200));
    put(out, 'expectedStatus', text(o.expectedStatus, 50));
    put(out, 'status', text(o.status, 50));
    if (Array.isArray(o.results)) out.results = o.results.slice(0, 1_000).map(result);
    return out;
  };
  const spec = (s: Json): Json => {
    const o = isObj(s) ? s : {};
    const out: Obj = {};
    put(out, 'title', text(o.title));
    if (typeof o.ok === 'boolean') out.ok = o.ok;
    put(out, 'id', id(o.id));
    put(out, 'file', text(o.file));
    put(out, 'line', num(o.line));
    put(out, 'column', num(o.column));
    if (Array.isArray(o.tags)) out.tags = o.tags.slice(0, 20).map((x) => text(x, 100) ?? '');
    if (Array.isArray(o.tests)) out.tests = o.tests.slice(0, MAX_LIST).map(test);
    return out;
  };
  const suite = (s: Json, depth: number): Json => {
    const o = isObj(s) ? s : {};
    const out: Obj = {};
    put(out, 'title', text(o.title));
    put(out, 'file', text(o.file));
    put(out, 'line', num(o.line));
    put(out, 'column', num(o.column));
    if (Array.isArray(o.specs)) out.specs = o.specs.slice(0, MAX_LIST).map(spec);
    if (Array.isArray(o.suites) && depth < MAX_DEPTH) out.suites = o.suites.slice(0, MAX_LIST).map((x) => suite(x, depth + 1));
    return out;
  };

  const stats: Obj = {};
  if (isObj(report.stats)) {
    put(stats, 'startTime', text(report.stats.startTime, 40));
    for (const k of ['duration', 'expected', 'skipped', 'unexpected', 'flaky']) put(stats, k, num(report.stats[k]));
  }
  const out: Obj = { config, suites: Array.isArray(report.suites) ? report.suites.slice(0, MAX_LIST).map((s) => suite(s, 1)) : [] };
  out.errors = Array.isArray(report.errors) ? report.errors.slice(0, 100).map((e) => error(e) ?? {}) : [];
  out.stats = stats;
  return out;
}

if (process.argv[1]?.endsWith('scrub-report.ts')) {
  const file = process.argv[2] ?? 'test-results/report.json';
  if (existsSync(file)) writeFileSync(file, JSON.stringify(scrubReport(JSON.parse(readFileSync(file, 'utf8')) as Json)));
}
