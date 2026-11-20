# DEV-04: Default ranking

**Status:** To do

**Goal:** Put the tests worth fixing first at the top of the list.

**Objectives:**
- `rankTests(scores: TestScore[], tests: Test[]): TestScore[]` in `src/engine/score/rank.ts`.
- Fix priority = `(score / 100) × wasted minutes`.

**Scope:** Backend.

**Acceptance Criteria:**
1. Groups appear in this order: Flaky, Unproven, Failing, Stable, Not enough data.
2. Inside Flaky, higher priority comes first: a score-50 test wasting 10 minutes beats a score-90 test wasting 1 minute.
3. Inside the other groups, higher score comes first.
4. Ties break by file name, then test title.
5. The input array is not changed.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Task 8 (test code is in the plan).
- Spec: `docs/SPEC.md` sections 11 (priority, default sort) and 13.2 (table order), decision 20.1.
- Consumes `TestScore` from DEV-03 and `Test` from DEV-01.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- A plain sort is enough at v0 sizes; the spec's min-heap for top K is not needed yet.
- No new dependencies.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; ledger line `Task 8: complete` added.
