// Canonical records (spec section 9). Analysis code only ever sees these, never a vendor format.

export type AttemptStatus = 'pass' | 'fail' | 'skip';
export type ImportOutcome = 'success' | 'partial' | 'failed';

// Codes equal the copy keys in docs/ux/04-ux-copy.md; the UI owns the wording.
export type NoticeCode =
  | 'import.partial.noStatus'
  | 'import.partial.noName'
  | 'import.partial.badDuration'
  | 'import.dupeIds'
  | 'import.dupeRun'
  | 'import.noCommit'
  | 'import.fail.format'
  | 'import.fail.unreadable'
  | 'import.fail.tooBad'
  | 'import.fail.tooLarge';

export interface Notice {
  code: NoticeCode;
  severity: 'info' | 'warning' | 'error';
  params: Record<string, string | number>;
  location?: { test?: string; run?: string; position?: number };
}

export interface ImportRecord {
  importId: string;
  fileName: string;
  importedAt: string; // ISO
  result: ImportOutcome;
  counts: { found: number; imported: number; notImported: number };
  notices: Notice[];
  runIds: string[];
}

export interface Run {
  runId: string;
  importId: string;
  commit: string | null;
  startedAt: string | null;
  order: number;
}

export interface Test {
  testId: string;
  testKey: string;
  file: string;
  suitePath: string[];
  title: string;
  project: string;
}

export interface Attempt {
  attemptId: string;
  runId: string;
  testId: string;
  repeatIndex: number; // --repeat-each copy within the run, 0 when not repeated
  retryIndex: number;
  status: AttemptStatus;
  durationMs: number | null;
}

export interface Failure {
  attemptId: string;
  message: string;
  stack: string;
}

export interface ImportResult {
  record: ImportRecord;
  runs: Run[];
  tests: Test[];
  attempts: Attempt[];
  failures: Failure[];
}

export interface Dataset {
  imports: ImportRecord[];
  runs: Run[];
  tests: Test[];
  attempts: Attempt[];
  failures: Failure[];
}

// Internal values; display names (Flaky, Unproven, Failing, Stable, Not enough data) live in the UI.
export type Label = 'flaky' | 'suspect' | 'failing' | 'stable' | 'insufficient';

export interface TestScore {
  testId: string;
  label: Label;
  wasFlakyEarlier: boolean;
  isNew: boolean;
  score: number;
  priority: number;
  mixedCommits: number;
  repeatedCommits: number;
  flipRate: number;
  recentFailRate: number;
  attempts: number;
  runs: number;
  retries: number;
  wastedMs: number;
  possibleWastedMs: number;
  durationUnknown: boolean;
  firstSeenRunId: string;
  lastFailedRunId: string | null;
}
