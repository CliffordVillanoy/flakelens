import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import type { Attempt, Dataset, FailureGroup } from '../types';
import { orderRuns } from '../view';
import { fingerprint, type Fingerprint } from './fingerprint';

// Groups failures by cause (spec section 10): exact grouping by fingerprint, then near-duplicate groups merge when the
// Jaccard similarity of their word shingles is at least config.groupMergeJaccard. Candidates come from MinHash bands, so
// the search is close to linear in the number of distinct messages and never compares every pair.

const SHINGLE_WORDS = 2; // one changed word in a message of 20 words or more keeps Jaccard above 0.8
const MINHASHES = 24;
const BANDS = 8; // 8 bands of 3 rows: a pair at Jaccard 0.8 is found about 99.7 % of the time, a pair at 0.3 about 20 %
const ROWS = MINHASHES / BANDS;
const MAX_COMPARE = 16; // in one band bucket, a bucket is compared with at most this many earlier members
const MAX_SHINGLES = 500;

interface Bucket {
  fp: Fingerprint;
  count: number;
  tests: Set<string>;
  runs: Set<string>;
  perRun: Map<string, Set<string>>;
  attemptIds: string[];
  shingles: Uint32Array; // sorted, unique
}

const fnv1a = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

function shinglesOf(normalized: string): Uint32Array {
  const words = normalized.split(' ');
  const out = new Set<number>();
  if (words.length <= SHINGLE_WORDS) out.add(fnv1a(normalized));
  else for (let i = 0; i + SHINGLE_WORDS <= words.length && out.size < MAX_SHINGLES; i++) out.add(fnv1a(words.slice(i, i + SHINGLE_WORDS).join(' ')));
  return Uint32Array.from(out).sort();
}

function jaccard(a: Uint32Array, b: Uint32Array): number {
  let i = 0;
  let j = 0;
  let same = 0;
  while (i < a.length && j < b.length) {
    if (a[i]! === b[j]!) {
      same++;
      i++;
      j++;
    } else if (a[i]! < b[j]!) i++;
    else j++;
  }
  const union = a.length + b.length - same;
  return union === 0 ? 1 : same / union;
}

// MinHash: for each of MINHASHES salted mixes of the shingle hash, keep the smallest value.
function signature(shingles: Uint32Array): Uint32Array {
  const sig = new Uint32Array(MINHASHES).fill(0xffffffff);
  for (const s of shingles) {
    for (let k = 0; k < MINHASHES; k++) {
      let h = Math.imul(s ^ Math.imul(k + 1, 0x9e3779b1), 0x85ebca6b);
      h ^= h >>> 13;
      h = Math.imul(h, 0xc2b2ae35);
      h = (h ^ (h >>> 16)) >>> 0;
      if (h < sig[k]!) sig[k] = h;
    }
  }
  return sig;
}

class UnionFind {
  private parent: Int32Array;
  constructor(n: number) {
    this.parent = Int32Array.from({ length: n }, (_, i) => i);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]!]!;
      x = this.parent[x]!;
    }
    return x;
  }
  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[Math.max(ra, rb)] = Math.min(ra, rb);
  }
}

const firstLine = (s: string) => {
  const i = s.indexOf('\n');
  return (i === -1 ? s : s.slice(0, i)).trim();
};

export function groupFailures(ds: Dataset, config: EngineConfig = DEFAULT_CONFIG): FailureGroup[] {
  if (ds.failures.length === 0) return [];

  const wanted = new Set(ds.failures.map((f) => f.attemptId));
  const attempts = new Map<string, Attempt>();
  for (const a of ds.attempts) if (wanted.has(a.attemptId)) attempts.set(a.attemptId, a);

  // 1. exact groups: one bucket per fingerprint
  const byHash = new Map<string, Bucket>();
  for (const f of ds.failures) {
    const a = attempts.get(f.attemptId);
    if (!a) continue;
    const text = f.message.trim() !== '' ? f.message : firstLine(f.stack);
    const fp = fingerprint(text);
    let b = byHash.get(fp.fingerprint);
    if (!b) {
      b = { fp, count: 0, tests: new Set(), runs: new Set(), perRun: new Map(), attemptIds: [], shingles: new Uint32Array(0) };
      byHash.set(fp.fingerprint, b);
    }
    b.count++;
    b.attemptIds.push(f.attemptId);
    b.tests.add(a.testId);
    b.runs.add(a.runId);
    const inRun = b.perRun.get(a.runId);
    if (inRun) inRun.add(a.testId);
    else b.perRun.set(a.runId, new Set([a.testId]));
  }
  const buckets = [...byHash.values()].sort((x, y) => (x.fp.fingerprint < y.fp.fingerprint ? -1 : 1));

  // 2. near-duplicates: MinHash bands propose pairs, exact Jaccard decides, union-find joins
  const uf = new UnionFind(buckets.length);
  if (buckets.length > 1 && config.groupMergeJaccard < 1) {
    for (const b of buckets) b.shingles = shinglesOf(b.fp.normalized);
    const sigs = buckets.map((b) => signature(b.shingles));
    for (let band = 0; band < BANDS; band++) {
      const seen = new Map<string, number[]>();
      for (let i = 0; i < buckets.length; i++) {
        let key = '';
        for (let r = 0; r < ROWS; r++) key += sigs[i]![band * ROWS + r]! + ',';
        const members = seen.get(key);
        if (!members) {
          seen.set(key, [i]);
          continue;
        }
        for (let m = members.length - 1, tried = 0; m >= 0 && tried < MAX_COMPARE; m--, tried++) {
          const j = members[m]!;
          if (uf.find(i) === uf.find(j)) continue;
          const a = buckets[i]!.shingles;
          const c = buckets[j]!.shingles;
          if (Math.min(a.length, c.length) / Math.max(a.length, c.length) < config.groupMergeJaccard) continue;
          if (jaccard(a, c) >= config.groupMergeJaccard) uf.union(i, j);
        }
        members.push(i);
      }
    }
  }

  // 3. one group per component
  const rank = new Map(orderRuns(ds.runs).map((r, i) => [r.runId, i]));
  const components = new Map<number, Bucket[]>();
  buckets.forEach((b, i) => {
    const root = uf.find(i);
    const list = components.get(root);
    if (list) list.push(b);
    else components.set(root, [b]);
  });
  const groups: FailureGroup[] = [];
  for (const list of components.values()) {
    const rep = list.reduce((best, b) => (b.count > best.count ? b : best), list[0]!); // ties keep the lowest fingerprint
    const tests = new Set<string>();
    const runs = new Set<string>();
    const perRun = new Map<string, Set<string>>();
    let count = 0;
    const attemptIds: string[] = [];
    for (const b of list) {
      count += b.count;
      for (const id of b.attemptIds) attemptIds.push(id);
      b.tests.forEach((t) => tests.add(t));
      b.runs.forEach((r) => runs.add(r));
      for (const [run, set] of b.perRun) {
        const merged = perRun.get(run);
        if (merged) set.forEach((t) => merged.add(t));
        else perRun.set(run, new Set(set));
      }
    }
    const runIds = [...runs].sort((x, y) => (rank.get(x) ?? 0) - (rank.get(y) ?? 0) || (x < y ? -1 : 1));
    groups.push({
      fingerprint: rep.fp.fingerprint,
      template: rep.fp.template,
      normalized: rep.fp.normalized,
      count,
      testIds: [...tests].sort(),
      runIds,
      attemptIds,
      firstRunId: runIds[0]!,
      lastRunId: runIds[runIds.length - 1]!,
      environmentEvent: [...perRun.values()].some((set) => set.size >= config.envEventMinTests),
    });
  }
  return groups.sort((x, y) => y.count - x.count || (x.fingerprint < y.fingerprint ? -1 : 1));
}
