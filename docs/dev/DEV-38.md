# DEV-38: Correlation by browser, shard, OS and time

**Status:** To do

**Goal:** Show whether a test's failures depend on the browser, shard, OS or hour, with an effect size and honest small-sample handling.

**Objectives:**
- Compute correlations with exact statistics.

**Scope:** Backend (engine).

**Acceptance Criteria:**
1. `correlate(ds, testId, config)` in `src/engine/correlate/` returns, for each dimension with at least two values (browser, shard, os, hour of day from run start times), the fail rate per value, the fail rate of the rest, an odds ratio (with a 0.5 correction) and the difference in fail rate.
2. Fisher's exact test for 2x2 tables (a value versus the rest), computed exactly with log factorials; chi-square only for larger tables and only when every expected count is at least 5, otherwise skipped.
3. Minimum evidence from config (`corrMinAttempts` 10, at least 3 failures, at least 3 attempts per group); below it the result is `not enough data` with a reason and never a finding. Bonferroni adjustment across the dimensions tested for the test; each result carries the adjusted p and a strength label.
4. Tests: known Fisher results (several tables, tolerance 1e-9); properties (p in 0..1, symmetric under swapping categories, invariant to row order); missing dimension data skips the dimension.
5. Lab: the lab test that fails only in one project (DEV-34) is flagged strongly; a uniformly flaky test is not.
6. Timing: 5,000 tests x 50 runs correlated in under 2 s, or computed lazily per test (report which).
7. No UI change, no new dependency.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-30, DEV-34.
- Spec: section 10 (contingency tables, Fisher, effect size, not just a flag).
- Wording belongs to DEV-39; this ticket returns data only.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; list every new interim copy key in the report (the UI/UX chat confirms them later).
- No new network calls, accounts or secrets. A new dependency only as named in the ticket; report its name, version and licence.
- Every regex or loop over untrusted text is bounded or linear and has a timing test (plan, Global constraints).
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` green; `npm run e2e` green when the app changes.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.
