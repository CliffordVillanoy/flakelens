import { it, expect } from 'vitest';
import fc from 'fast-check';
import { buildDataset } from './score/testkit';
import { scoreTests } from './score/score';
import { lastRuns, orderRuns, runHistories, runHistory } from './view';

it('orders mixed timed and untimed runs like scoreTests does', () => {
  // A (order 0, t=2), B (untimed, order 1), C (order 2, t=1): C, A, B
  const ds = buildDataset([{ tests: { t: ['fail'] } }, { tests: { t: ['fail'] } }, { tests: { t: ['pass'] } }]);
  ds.runs[0]!.startedAt = '2026-01-01T00:02:00.000Z';
  ds.runs[2]!.startedAt = '2026-01-01T00:01:00.000Z';
  expect(orderRuns(ds.runs).map((r) => r.runId)).toEqual(['run2', 'run0', 'run1']);
  expect(orderRuns([...ds.runs].reverse()).map((r) => r.runId)).toEqual(['run2', 'run0', 'run1']);
  const history = runHistory(ds, 't');
  expect(history.map((c) => c.run.runId)).toEqual(['run2', 'run0', 'run1']);
  const s = scoreTests(ds)[0]!;
  expect(s.firstSeenRunId).toBe(history[0]!.run.runId);
  expect(s.lastFailedRunId).toBe(history.filter((c) => c.outcome === 'fail').at(-1)!.run.runId);
});

it('history order agrees with scoreTests for any mix of timestamps', () => {
  fc.assert(
    fc.property(fc.array(fc.option(fc.integer({ min: 0, max: 5 })), { minLength: 1, maxLength: 8 }), (times) => {
      const ds = buildDataset(times.map((_, i) => ({ tests: { t: [i % 2 ? 'pass' : 'fail'] } })));
      times.forEach((m, i) => (ds.runs[i]!.startedAt = m === null ? null : `2026-01-01T00:0${m}:00.000Z`));
      const history = runHistory(ds, 't');
      const s = scoreTests(ds)[0]!;
      return s.firstSeenRunId === history[0]!.run.runId &&
        s.lastFailedRunId === (history.filter((c) => c.outcome === 'fail').at(-1)?.run.runId ?? null);
    }),
  );
});

it('sets outcome per run: pass, fail, retryPass, skip', () => {
  const ds = buildDataset([
    { tests: { t: ['pass'] } },
    { tests: { t: ['fail', 'fail'] } },
    { tests: { t: ['fail', 'pass'] } },
    { tests: { t: ['skip'] } },
    { tests: {} },
  ]);
  const h = runHistory(ds, 't');
  expect(h.map((c) => c.outcome)).toEqual(['pass', 'fail', 'retryPass', 'skip']);
  expect(h[2]!.attempts).toEqual(['fail', 'pass']);
});

it('marks runs on a commit with both a pass and a fail as mixedCommit', () => {
  const ds = buildDataset([
    { commit: 'a', tests: { t: ['pass'] } },
    { commit: 'a', tests: { t: ['fail'] } },
    { commit: 'b', tests: { t: ['pass'] } },
    { commit: 'c', tests: { t: ['fail', 'pass'] } },
  ]);
  expect(runHistory(ds, 't').map((c) => c.mixedCommit)).toEqual([true, true, false, true]);
});

it('lastRuns keeps the newest n, oldest first', () => {
  const ds = buildDataset(Array.from({ length: 15 }, () => ({ tests: { t: ['pass' as const] } })));
  expect(lastRuns(ds, 't').map((c) => c.run.runId)).toEqual(Array.from({ length: 12 }, (_, i) => `run${i + 3}`));
  expect(lastRuns(ds, 't', 2).map((c) => c.run.runId)).toEqual(['run13', 'run14']);
});

it('runHistories builds every test history in one pass, equal to runHistory per test', () => {
  const ds = buildDataset([
    { commit: 'a', tests: { t: ['pass'], u: ['fail', 'pass'] } },
    { commit: 'a', tests: { t: ['fail'] } },
    { tests: { u: ['skip'] } },
  ]);
  const all = runHistories(ds);
  expect(all.get('t')).toEqual(runHistory(ds, 't'));
  expect(all.get('u')).toEqual(runHistory(ds, 'u'));
  expect(all.get('missing')).toBeUndefined();
});
