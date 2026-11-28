import * as z from 'zod/mini';
import type { AttemptStatus, ImportOutcome, ImportResult, NoticeCode } from '@/engine/types';

// Shape of one stored import (an ImportResult), checked when rows are read back from IndexedDB. The
// `satisfies z.ZodMiniType<ImportResult>` at the end makes the compiler fail if the engine type and this schema drift
// apart; the Records below fail to compile when a code or status is added to the engine and not listed here.
const NOTICE_CODES = {
  'import.partial.noStatus': 1,
  'import.partial.noName': 1,
  'import.partial.badDuration': 1,
  'import.partial.badDate': 1,
  'import.dupeIds': 1,
  'import.dupeRun': 1,
  'import.noCommit': 1,
  'import.fail.format': 1,
  'import.fail.unsafe': 1,
  'import.fail.unreadable': 1,
  'import.fail.tooBad': 1,
  'import.fail.tooLarge': 1,
} satisfies Record<NoticeCode, 1>;
const STATUSES = { pass: 1, fail: 1, skip: 1 } satisfies Record<AttemptStatus, 1>;
const OUTCOMES = { success: 1, partial: 1, failed: 1 } satisfies Record<ImportOutcome, 1>;
const keys = <T extends object>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

const notice = z.object({
  code: z.enum(keys(NOTICE_CODES)),
  severity: z.enum(['info', 'warning', 'error']),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  location: z.optional(z.object({ test: z.optional(z.string()), run: z.optional(z.string()), position: z.optional(z.number()) })),
});

export const importResultSchema = z.object({
  record: z.object({
    importId: z.string(),
    fileName: z.string(),
    importedAt: z.string(),
    result: z.enum(keys(OUTCOMES)),
    counts: z.object({ found: z.number(), imported: z.number(), notImported: z.number() }),
    notices: z.array(notice),
    runIds: z.array(z.string()),
  }),
  runs: z.array(
    z.object({
      runId: z.string(),
      importId: z.string(),
      commit: z.nullable(z.string()),
      reportCommit: z.optional(z.nullable(z.string())),
      // DEV-39: optional, so a run saved before they existed still loads
      branch: z.optional(z.nullable(z.string())),
      browser: z.optional(z.nullable(z.string())),
      shard: z.optional(z.nullable(z.object({ current: z.int().check(z.minimum(1)), total: z.int().check(z.minimum(1)) }))),
      os: z.optional(z.nullable(z.string())),
      startedAt: z.nullable(z.string()),
      order: z.number(),
    }),
  ),
  tests: z.array(
    z.object({ testId: z.string(), testKey: z.string(), file: z.string(), suitePath: z.array(z.string()), title: z.string(), project: z.string() }),
  ),
  attempts: z.array(
    z.object({
      attemptId: z.string(),
      runId: z.string(),
      testId: z.string(),
      repeatIndex: z.number(),
      retryIndex: z.number(),
      status: z.enum(keys(STATUSES)),
      durationMs: z.nullable(z.number()),
    }),
  ),
  failures: z.array(z.object({ attemptId: z.string(), message: z.string(), stack: z.string() })),
}) satisfies z.ZodMiniType<ImportResult>;
