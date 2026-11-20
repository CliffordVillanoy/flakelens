# DEV-01: Canonical data model and Playwright JSON importer

**Status:** Done (2026-11-20, commits `290ec21`..`4f1f968` on `feat/v0-engine`)

**Goal:** Turn a Playwright JSON report into FlakeLens's own records, safely, for any input.

**Objectives:**
- Canonical records: Import, Run, Test, Attempt, Failure, Notice (spec section 9).
- Stable IDs from a synchronous hash (`hashString`, cyrb53).
- `parsePlaywrightReport(text, opts)` that never throws and follows every row of the spec 9.1 table.
- All thresholds in one file, `src/engine/config.ts`.

**Scope:** Backend.

**Acceptance Criteria:**
1. A valid report imports as `success`, with retries kept as separate attempts and failures holding the error message.
2. The same test in two Playwright projects gets two `testId`s and one `testKey`.
3. Every 9.1 case returns the right result and notice code: missing status, missing name, bad duration, duplicate IDs, wrong format, empty or cut-off file, more than half bad, too large or too deep.
4. A file starting with a UTF-8 BOM imports.
5. `imported + notImported === found` for every import.
6. Property tests: random strings, mutated valid files and random JSON never make the importer throw.
7. Imported text, including `<script>` tags, is stored exactly as given.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Tasks 2 to 4.
- Code: `src/engine/types.ts`, `config.ts`, `hash.ts`, `import/schema.ts`, `import/playwright.ts`. Fixtures: `fixtures/playwright/`.
- Notice codes equal the copy keys in `docs/ux/04-ux-copy.md`; the UI writes the words.
- Commit info comes only from the user's label in v0. With no label, each file is its own commit and an `import.noCommit` notice is added.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Engine code is pure TypeScript: no DOM, no network, no UI imports.
- Reading commit SHA from report metadata is not in v0.
- Suites, specs or tests that are not objects are skipped without counting their results (ledgered ruling).

**Definition of Done:**
- 22 tests pass; typecheck and lint clean.
- Committed on `feat/v0-engine` and recorded in the plan ledger.
