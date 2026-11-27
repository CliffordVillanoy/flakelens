// Cause classifier accuracy on the flake lab (DEV-37, spec section 17). Node only: reads files from disk.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { classifyFailure } from '../src/engine/cause/classify';
import { classifyGroup } from '../src/engine/cause/group';
import { groupFailures } from '../src/engine/group/group';
import { DEFAULT_CONFIG } from '../src/engine/config';
import type { CauseId, Dataset } from '../src/engine/types';
import { labelKey, readLabels, type LabelEntry } from '../flake-lab/labels';
import { loadLab } from './eval-lab';

type ManifestEntry = { file: string; commit: string };

// Ground-truth cause (labels.json, spec categories) to the engine's cause id.
export const CAUSE_ID: Record<string, CauseId> = {
  'timing and waits': 'timing',
  'order dependency': 'order',
  'shared state or data': 'sharedState',
  'network or external service': 'network',
  'environment or resources': 'environment',
  concurrency: 'concurrency',
  'locator or UI': 'locator',
  'time and randomness': 'time',
  infrastructure: 'infrastructure',
};
export const IDS: CauseId[] = ['timing', 'order', 'sharedState', 'network', 'environment', 'concurrency', 'locator', 'time', 'infrastructure'];
const COLUMNS: CauseId[] = [...IDS, 'unknown'];

export interface TestResult {
  title: string;
  truth: CauseId;
  predicted: CauseId;
  votes: Partial<Record<CauseId, number>>;
}
export interface GroupResult {
  tests: string[];
  failures: number;
  predicted: CauseId;
  confidence: string;
  agreement: number;
  matchedShare: number;
  environmentEvent: boolean;
  truths: CauseId[];
}
export interface CauseEval {
  tests: TestResult[];
  groups: GroupResult[];
}

/** Classifies every failure of every lab test with a known cause (from its own raw text), then takes the majority per test. */
export function evaluateCauses(ds: Dataset, labels: Record<string, LabelEntry>): CauseEval {
  const groups = groupFailures(ds, DEFAULT_CONFIG);
  const envOf = new Map<string, boolean>();
  for (const g of groups) for (const id of g.attemptIds) envOf.set(id, g.environmentEvent);
  const testById = new Map(ds.tests.map((t) => [t.testId, t]));
  const attemptTest = new Map(ds.attempts.map((a) => [a.attemptId, a.testId]));

  const votesByTest = new Map<string, Map<CauseId, number>>();
  for (const f of ds.failures) {
    const testId = attemptTest.get(f.attemptId);
    if (!testId) continue;
    const r = classifyFailure({ message: f.message, stack: f.stack, environmentEvent: envOf.get(f.attemptId) ?? false });
    const m = votesByTest.get(testId) ?? new Map<CauseId, number>();
    m.set(r.category, (m.get(r.category) ?? 0) + 1);
    votesByTest.set(testId, m);
  }

  const tests: TestResult[] = [];
  for (const [testId, votes] of votesByTest) {
    const t = testById.get(testId)!;
    const key = labelKey(t.title, t.project);
    const cause = labels[key]?.cause ?? null;
    if (cause === null) continue;
    const winner = [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] === 'unknown' ? 1 : b[0] === 'unknown' ? -1 : 0))[0]![0];
    tests.push({ title: key, truth: CAUSE_ID[cause]!, predicted: winner, votes: Object.fromEntries(votes) });
  }
  tests.sort((a, b) => (a.title < b.title ? -1 : 1));

  const groupResults: GroupResult[] = groups.map((g) => {
    const c = classifyGroup(g, ds, DEFAULT_CONFIG);
    const names = [...new Set(g.testIds.map((id) => labelKey(testById.get(id)!.title, testById.get(id)!.project)))].sort();
    return {
      tests: names,
      failures: g.count,
      predicted: c.category,
      confidence: c.confidence,
      agreement: c.agreement,
      matchedShare: c.matchedShare,
      environmentEvent: g.environmentEvent,
      truths: [...new Set(names.map((n) => labels[n]?.cause).filter((x): x is NonNullable<typeof x> => !!x).map((x) => CAUSE_ID[x]!))],
    };
  });
  return { tests, groups: groupResults };
}

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${((100 * n) / d).toFixed(0)} %`);

export function buildReport(result: CauseEval): string {
  const { tests, groups } = result;
  const correct = tests.filter((t) => t.truth === t.predicted).length;
  const unknown = tests.filter((t) => t.predicted === 'unknown');
  const wrong = tests.filter((t) => t.predicted !== 'unknown' && t.truth !== t.predicted);

  const matrix = IDS.map((truth) => {
    const row = tests.filter((t) => t.truth === truth);
    const cells = COLUMNS.map((p) => row.filter((t) => t.predicted === p).length);
    return `| ${truth} | ${row.length} | ${cells.map((n) => (n === 0 ? '.' : String(n))).join(' | ')} | ${pct(row.filter((t) => t.predicted === truth).length, row.length)} |`;
  });
  const detail = tests.map((t) => `| ${t.title} | ${t.truth} | ${t.predicted} | ${t.truth === t.predicted ? 'right' : t.predicted === 'unknown' ? 'unknown (wrong)' : 'wrong'} | ${Object.entries(t.votes).map(([k, v]) => `${k} ${v}`).join(', ')} |`);
  const groupRows = groups.map(
    (g) => `| ${g.tests.join('<br>')} | ${g.failures} | ${g.environmentEvent ? 'yes' : 'no'} | ${g.truths.join(' / ') || 'n/a'} | ${g.predicted} | ${g.confidence} | ${g.agreement.toFixed(2)} | ${g.matchedShare.toFixed(2)} |`,
  );

  return [
    '# Flake lab: cause classifier report',
    '',
    'Generated by `npm run eval:causes` from `fixtures/lab/` and `flake-lab/labels.json`. Do not edit by hand.',
    '',
    '## Method',
    '',
    `- Test set: the ${tests.length} lab tests that fail and have an injected cause in \`flake-lab/labels.json\` (a test that runs in two Playwright projects counts once per project).`,
    '- Each failure is classified by `classifyFailure` from its own raw message and stack (not from the group template); a failure in an environment event group is classified with `environmentEvent` on. The test gets the cause most of its failures voted for. A tie goes to a real cause, never to unknown.',
    '- `unknown` means no rule fired. It is counted as wrong in the accuracy and shown in its own column.',
    '- The rules in `src/engine/cause/rules.ts` were written from Playwright and Node error text before the lab results were looked at, and were not changed to fit the lab. The numbers below are what they are.',
    '',
    '## Accuracy',
    '',
    `**${correct} of ${tests.length} tests (${pct(correct, tests.length)}).** Unknown: ${unknown.length} (${pct(unknown.length, tests.length)}), counted as wrong. Wrong cause: ${wrong.length} (${pct(wrong.length, tests.length)}).`,
    '',
    '## Confusion matrix',
    '',
    `Rows: the injected cause. Columns: what the classifier said (\`.\` is zero).`,
    '',
    `| Injected cause | Tests | ${COLUMNS.join(' | ')} | Accuracy |`,
    `| --- | --- | ${COLUMNS.map(() => '---').join(' | ')} | --- |`,
    ...matrix,
    '',
    '## Each test',
    '',
    '| Test | Injected cause | Classified as | Result | Votes (failures) |',
    '| --- | --- | --- | --- | --- |',
    ...detail,
    '',
    '## Failure groups (what the Groups screen would show)',
    '',
    'DEV-36 groups, classified by `classifyGroup` with the starting thresholds (sample of the latest 20 failures; high at 0.8 agreement with a high-weight rule, medium at 0.5; confidence capped at low when under 0.5 of the sampled failures matched a rule). Only failures where a rule fired vote: **agreement** is the share of those that voted for the winning cause, **matched share** is how many of the sampled failures matched at all (the rest carry no information).',
    '',
    '| Tests | Failures | Environment event | Injected cause | Classified as | Confidence | Agreement | Matched share |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...groupRows,
    '',
    '## Limits',
    '',
    `This is a synthetic lab with messages we injected ourselves, one test or a few per cause (${tests.length} tests are scored), 12 runs over 6 commits. The sample is small, so one test moves a category by a large share, and an accuracy figure here is not a real-world accuracy. The same people wrote the rules and the lab messages, so the lab text is close to the text the rules look for: **the numbers are probably optimistic for real suites** (overfitting risk). The causes that need context rather than text (order dependency, shared state, time and randomness, timing without a timeout message) have few or no rules that can fire on a bare assertion failure, so they show up as unknown here, and that is expected to stay true on real data. The check on public real-world failure logs (spec section 11.1, item 5) is a later step and needs the JUnit importer.`,
    '',
  ].join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest: ManifestEntry[] = JSON.parse(readFileSync('fixtures/lab/manifest.json', 'utf8'));
  const ds = loadLab(manifest, 'fixtures/lab');
  mkdirSync('docs/eval', { recursive: true });
  writeFileSync('docs/eval/lab-causes.md', buildReport(evaluateCauses(ds, readLabels())));
  process.stdout.write('wrote docs/eval/lab-causes.md\n');
}
