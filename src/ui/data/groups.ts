import { DEFAULT_CONFIG } from '@/engine/config';
import { classifyGroup, type GroupCause } from '@/engine/cause/group';
import { groupFailures } from '@/engine/group/group';
import type { Attempt, Dataset, FailureGroup } from '@/engine/types';
import { orderRuns } from '@/engine/view';
import { cleanText } from '../lib/safeText';

// View model of the Groups screen (board 12): the engine's failure groups (DEV-36) with what a card needs, and the
// likely cause of a group (DEV-37). Both are worked out once per dataset and remembered; the cause only for the groups
// that are asked about, so a screen of 5,000 groups classifies the few cards on screen, not all of them.

export type GroupSort = 'failures' | 'tests' | 'latest';
export const GROUP_SORTS: GroupSort[] = ['failures', 'tests', 'latest'];

export interface GroupCard {
  group: FailureGroup;
  tests: { testId: string; title: string }[];
  /** For an environment event: the run where the most tests failed this way, and how many. */
  event: { run: string; tests: number } | null;
  lastSeen: string | null; // start time of the run it was last seen in
  lastRank: number; // position of that run, newest = largest
  text: string; // lower-case template, searched by the filter
}
export interface GroupsView {
  groups: FailureGroup[];
  cards: GroupCard[];
  byAttempt: Map<string, FailureGroup>;
  rank: Map<string, number>;
}

const views = new WeakMap<Dataset, GroupsView>();

export function groupsView(ds: Dataset): GroupsView {
  const cached = views.get(ds);
  if (cached) return cached;
  const groups = groupFailures(ds, DEFAULT_CONFIG);
  const rank = new Map(orderRuns(ds.runs).map((r, i) => [r.runId, i]));
  const runs = new Map(ds.runs.map((r) => [r.runId, r]));
  const files = new Map(ds.imports.map((i) => [i.importId, i.fileName]));
  const tests = new Map(ds.tests.map((t) => [t.testId, t]));
  const attempts = new Map<string, Attempt>();
  if (groups.some((g) => g.environmentEvent)) {
    const wanted = new Set(ds.failures.map((f) => f.attemptId));
    for (const a of ds.attempts) if (wanted.has(a.attemptId)) attempts.set(a.attemptId, a);
  }

  const byAttempt = new Map<string, FailureGroup>();
  const cards = groups.map((group): GroupCard => {
    for (const id of group.attemptIds) byAttempt.set(id, group);
    const last = runs.get(group.lastRunId);
    let event: GroupCard['event'] = null;
    if (group.environmentEvent) {
      const perRun = new Map<string, Set<string>>();
      for (const id of group.attemptIds) {
        const a = attempts.get(id);
        if (!a) continue;
        const set = perRun.get(a.runId);
        if (set) set.add(a.testId);
        else perRun.set(a.runId, new Set([a.testId]));
      }
      let best: { run: string; tests: number } | null = null;
      for (const [run, set] of perRun) {
        if (!best || set.size > best.tests || (set.size === best.tests && (rank.get(run) ?? 0) < (rank.get(best.run) ?? 0))) best = { run, tests: set.size };
      }
      if (best) event = { run: cleanText(files.get(runs.get(best.run)?.importId ?? '') ?? best.run), tests: best.tests };
    }
    return {
      group,
      tests: group.testIds.map((testId) => {
        const t = tests.get(testId);
        return { testId, title: cleanText(t ? [...t.suitePath, t.title].join(' › ') : testId) };
      }),
      event,
      lastSeen: last?.startedAt ?? null,
      lastRank: rank.get(group.lastRunId) ?? 0,
      text: group.normalized.toLowerCase(),
    };
  });
  const view = { groups, cards, byAttempt, rank };
  views.set(ds, view);
  return view;
}

/** Cards whose masked template contains the text (any case). An empty search keeps the list as it is. */
export function filterGroupCards(cards: GroupCard[], q: string): GroupCard[] {
  const needle = q.trim().toLowerCase();
  return needle === '' ? cards : cards.filter((c) => c.text.includes(needle));
}

const byFingerprint = (a: GroupCard, b: GroupCard) => (a.group.fingerprint < b.group.fingerprint ? -1 : 1);

/** Environment events first (one incident explains many tests), then the chosen order. */
export function sortGroupCards(cards: GroupCard[], sort: GroupSort): GroupCard[] {
  const key: Record<GroupSort, (a: GroupCard, b: GroupCard) => number> = {
    failures: (a, b) => b.group.count - a.group.count || b.group.testIds.length - a.group.testIds.length,
    tests: (a, b) => b.group.testIds.length - a.group.testIds.length || b.group.count - a.group.count,
    latest: (a, b) => b.lastRank - a.lastRank || b.group.count - a.group.count,
  };
  return [...cards].sort((a, b) => Number(b.group.environmentEvent) - Number(a.group.environmentEvent) || key[sort](a, b) || byFingerprint(a, b));
}

const causes = new WeakMap<Dataset, Map<string, GroupCause>>();

/** The likely cause of one group, classified on first use. */
export function causeOf(ds: Dataset, group: FailureGroup): GroupCause {
  let map = causes.get(ds);
  if (!map) {
    map = new Map();
    causes.set(ds, map);
  }
  let c = map.get(group.fingerprint);
  if (!c) {
    c = classifyGroup(group, ds, DEFAULT_CONFIG);
    map.set(group.fingerprint, c);
  }
  return c;
}

/** The group that holds the latest failed attempt of a test, or null when it never failed. */
export function groupForTest(ds: Dataset, testId: string): FailureGroup | null {
  const { byAttempt, rank } = groupsView(ds);
  let best: { group: FailureGroup; at: number } | null = null;
  ds.attempts.forEach((a, i) => {
    if (a.testId !== testId || a.status !== 'fail') return;
    const group = byAttempt.get(a.attemptId);
    if (!group) return;
    const at = (rank.get(a.runId) ?? 0) * 1_000_000 + a.retryIndex * 1000 + (i % 1000);
    if (!best || at >= best.at) best = { group, at };
  });
  return (best as { group: FailureGroup } | null)?.group ?? null;
}

export const parseSort = (s: string | null): GroupSort => (s === 'tests' || s === 'latest' ? s : 'failures');
