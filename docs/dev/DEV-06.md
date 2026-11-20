# DEV-06: Lab acceptance and detection report

**Status:** To do

**Goal:** Prove the engine labels every flake-lab test correctly, and publish how well it finds flaky tests.

**Objectives:**
- `loadLab(files, dir): Dataset` in `scripts/eval-lab.ts` (Node only).
- Acceptance test `scripts/eval-lab.test.ts`.
- `npm run eval:lab` writes `docs/eval/lab-detection.md`.

**Scope:** Backend (evaluation).

**Acceptance Criteria:**
1. Every lab test gets the label in `flake-lab/labels.json`.
2. The sample set in `public/sample/` imports with no failed file and at least one "not imported" count.
3. The report shows precision, recall and F1 for the Flaky label at 4, 8 and 12 runs of history.
4. The report compares against a baseline: "Playwright marked the test flaky in any loaded run".
5. The report has a Limits paragraph: synthetic lab, 8 tests, one browser, not a real-world benchmark.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Task 10.
- `vite.config.ts` test `include` adds `scripts/**/*.test.ts`. The lab test reads files with Node `fs`, so it stays out of `src/engine`.
- Spec: `docs/SPEC.md` sections 11.1 (definition of done, items 2 and 4) and 17.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- If a label is wrong, fix the engine, not the expected answer, unless `labels.json` itself is wrong. Say so in the commit message.
- The real-data check (definition of done item 5) is a v1 ticket, because the public dataset needs the JUnit importer.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `docs/eval/lab-detection.md` generated and committed.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; ledger line `Task 10: complete` added.
