import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import type { Attempt, Dataset, Label, Run, TestScore } from '../types';
import { countFlips } from './flips';
import { ema, wilsonLower } from './stats';

// Spec section 11 weights: evidence, flip rate, recency-weighted failure spread.
const W_EVIDENCE = 0.6;
const W_FLIPS = 0.25;
const W_RECENCY = 0.15;

// Chronological order as a strict total order (spec 11): an untimed run takes the start time of the timed run
// before it in import order ('' if none), so it stays next to the run it followed; ties break by import order.
function chronological(runs: Run[]): Run[] {
  let last = '';
  const keyed = [...runs]
    .sort((a, b) => a.order - b.order || cmp(a.runId, b.runId))
    .map((run) => ({ run, time: (last = run.startedAt ?? last) }));
  return keyed.sort((a, b) => cmp(a.time, b.time) || a.run.order - b.run.order || cmp(a.run.runId, b.run.runId)).map((k) => k.run);
}
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function scoreTests(ds: Dataset, config: EngineConfig = DEFAULT_CONFIG): TestScore[] {
  const runs = chronological(ds.runs);
  const rank = new Map(runs.map((r, i) => [r.runId, i]));
  const runById = new Map(runs.map((r) => [r.runId, r]));
  const firstRunId = runs[0]?.runId;

  const byTest = new Map<string, Attempt[]>();
  for (const a of ds.attempts) {
    const list = byTest.get(a.testId);
    if (list) list.push(a);
    else byTest.set(a.testId, [a]);
  }

  return ds.tests.map((test) => {
    const all = (byTest.get(test.testId) ?? []).sort(
      (a, b) => rank.get(a.runId)! - rank.get(b.runId)! || a.repeatIndex - b.repeatIndex || a.retryIndex - b.retryIndex,
    );
    const counted = all.filter((a) => a.status !== 'skip');
    const fails = counted.map((a) => a.status === 'fail');
    const n = counted.length;

    const byCommit = new Map<string, Attempt[]>();
    for (const a of counted) {
      const run = runById.get(a.runId)!;
      const key = run.commit ?? run.runId;
      const list = byCommit.get(key);
      if (list) list.push(a);
      else byCommit.set(key, [a]);
    }
    const mixed = new Set<string>();
    let g = 0;
    for (const [key, list] of byCommit) {
      if (list.length >= 2) g++;
      if (list.some((a) => a.status === 'fail') && list.some((a) => a.status === 'pass')) mixed.add(key);
    }
    const m = mixed.size;

    const f = n < 2 ? 0 : countFlips(fails) / (n - 1);
    const r = ema(fails.map(Number), config.emaAlpha);
    const score = 100 * (W_EVIDENCE * wilsonLower(m, g, config.wilsonZ) + W_FLIPS * f + W_RECENCY * 4 * r * (1 - r));

    const recent = fails.slice(-config.failingWindow);
    const recentFailRate = recent.length === 0 ? 0 : recent.filter(Boolean).length / recent.length;

    let wastedMs = 0;
    let possibleWastedMs = 0;
    for (const a of counted) {
      if (a.status !== 'fail') continue;
      const run = runById.get(a.runId)!;
      const ms = a.durationMs ?? 0;
      possibleWastedMs += ms;
      if (mixed.has(run.commit ?? run.runId)) wastedMs += ms;
    }

    const runCount = new Set(counted.map((a) => a.runId)).size;
    const retries = counted.filter((a) => a.retryIndex > 0).length;

    let label: Label;
    if (m === 0 && (n < config.minAttempts || (runCount <= 1 && retries === 0))) label = 'insufficient';
    else if (recentFailRate >= config.failingRate) label = 'failing';
    else if (m >= 1) label = 'flaky';
    else if (n >= config.suspectMinAttempts && f >= config.suspectMinFlipRate) label = 'suspect';
    else label = 'stable';

    const firstSeenRunId = all[0]?.runId ?? '';
    const lastFailed = counted.filter((a) => a.status === 'fail').at(-1);

    return {
      testId: test.testId,
      label,
      wasFlakyEarlier: label === 'failing' && m >= 1,
      isNew: firstSeenRunId !== firstRunId && fails.includes(true) && fails.includes(false),
      score,
      priority: 0,
      mixedCommits: m,
      repeatedCommits: g,
      flipRate: f,
      recentFailRate,
      attempts: n,
      runs: runCount,
      retries,
      wastedMs,
      possibleWastedMs,
      durationUnknown: counted.some((a) => a.durationMs === null),
      firstSeenRunId,
      lastFailedRunId: lastFailed?.runId ?? null,
    };
  });
}
