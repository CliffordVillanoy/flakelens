# DEV-02: Dataset and run de-duplication

**Status:** Done (2026-11-20, commit `cb31a64` on `feat/v0-engine`; 27 tests pass)

**Goal:** Collect many imports into one dataset without ever counting the same run twice.

**Objectives:**
- `emptyDataset(): Dataset` and `addImport(ds: Dataset, res: ImportResult): Dataset` in `src/engine/dataset.ts`.
- Drop a run whose `runId` already exists, with its attempts and failures, and tell the user.
- Keep failed imports as records for the Loaded data screen.

**Scope:** Backend.

**Acceptance Criteria:**
1. Adding one valid import gives 1 import record, 1 run and all its attempts.
2. Importing the same file again, even under a different commit label, keeps 1 run and the same attempt count. The second import record carries an `import.dupeRun` notice (severity `info`) and an empty `runIds`.
3. A failed import is kept in `imports` but adds no runs, tests, attempts or failures.
4. Tests are unioned by `testId` across imports.
5. `addImport` does not change its input dataset.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Task 5 (test code is in the plan).
- Consumes `ImportResult` and `Dataset` from `src/engine/types.ts` (DEV-01).
- Run IDs are content-based (hash of start time plus file text), which is what makes re-imports detectable.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Pure function in `src/engine/`. No storage; IndexedDB comes with the UI tickets.
- No new dependencies.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; ledger line `Task 5: complete` added.
