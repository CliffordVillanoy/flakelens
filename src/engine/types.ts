// Canonical records (spec section 9). Analysis code only ever sees these, never a vendor format.

export type AttemptStatus = 'pass' | 'fail' | 'skip';
export type ImportOutcome = 'success' | 'partial' | 'failed';

// Codes equal the copy keys in docs/ux/04-ux-copy.md; the UI owns the wording.
export type NoticeCode =
  | 'import.partial.noStatus'
  | 'import.partial.noName'
  | 'import.partial.badDuration'
  | 'import.partial.badDate'
  | 'import.dupeIds'
  | 'import.dupeRun'
  | 'import.noCommit'
  | 'import.fail.format'
  | 'import.fail.unsafe'
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
  commitLabel?: string; // typed by the person; stands in for the commit of every run in this import
}

export interface Run {
  runId: string;
  importId: string;
  commit: string | null;
  reportCommit?: string | null; // set only while a label replaces the commit from the report
  // DEV-39: read from the report when it holds them, else null. Optional so a run saved before they existed still loads.
  branch?: string | null;
  browser?: string | null;
  shard?: { current: number; total: number } | null;
  os?: string | null;
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

// Cause ids (DEV-37). The UI reads the name and tip from the copy keys cause.<id> and cause.<id>.tip (copy doc section 14).
export type CauseId = 'timing' | 'order' | 'sharedState' | 'network' | 'environment' | 'concurrency' | 'locator' | 'time' | 'infrastructure' | 'unknown';
export type CauseConfidence = 'low' | 'medium' | 'high';
/** A quoted line of a failure text: the 1-based line number and text that is an exact substring of that line. */
export interface EvidenceLine {
  line: number;
  text: string;
}

// One kind of failure (DEV-36): messages with the same fingerprint, plus near-duplicates merged by shingle similarity.
export interface FailureGroup {
  fingerprint: string;
  template: string; // the first 300 characters of the normalised message, for display
  normalized: string; // the full normalised message (board 12 shows it on request)
  count: number; // failed attempts in the group
  testIds: string[];
  runIds: string[]; // oldest first
  attemptIds: string[]; // every failed attempt in the group, in the order they were read
  firstRunId: string;
  lastRunId: string;
  environmentEvent: boolean; // enough distinct tests failed this way in one run to point at the environment
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
