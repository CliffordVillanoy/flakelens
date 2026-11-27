# DEV-40: Correlation by browser, shard, OS and time

**Status:** Done locally (2026-11-27, commits `b0afacc` stats, `bc14cc8` correlate and `1c843c9` (symmetry and Bonferroni tests, comment) on `feat/dev-40-correlation` from origin/main 951927a, worktree `flakelens-dev40`; 1115 unit, typecheck, lint, build clean, verified by planning). Not pushed or merged. Dimensions: browser, shard, os, hour (UTC), project (sibling tests sharing a testKey). Lab: only the two responsive tests flag Strong, highlighted chromium-mobile; 9 single-project flaky tests no finding. correlateAll 5,000 x 50 about 0.57 s (eager; lazy createCorrelator also). 2 values: Fisher; 3+ values: chi-square only when every expected >= 5, else none. comparisons count only tested dimensions. Risk: attempts treated as independent, p optimistic for heavy retriers. No UI change, no new copy keys.

**Goal:** Show whether a test's failures depend on the browser, shard, OS or hour, with an effect size and honest small-sample handling.

**Objectives:**
- Compute correlations with exact statistics.

**Scope:** Backend (engine).

**Acceptance Criteria:**
1. `correlate(ds, testId, config)` in `src/engine/correlate/` returns, for each dimension with at least two values (browser, shard, os, hour of day from run start times), the fail rate per value, the fail rate of the rest, an odds ratio (with a 0.5 correction) and the difference in fail rate.
2. Fisher's exact test for 2x2 tables (a value versus the rest), computed exactly with log factorials; chi-square only for larger tables and only when every expected count is at least 5, otherwise skipped.
3. Minimum evidence from config (`corrMinAttempts` 10, `corrMinFails` 3, `corrMinGroup` 3 attempts in each group); below it the result is `not enough data` and never a finding. The reason carries the numbers the screen prints: the thresholds, the test's attempts and failures, and the smallest group. A dimension the files do not have returns `missing` with the dimension name. Bonferroni adjustment across the dimensions tested for the test; each result carries the adjusted p, the number of comparisons, and a strength label `Strong`, `Moderate` or `Weak` (starting rule in config: Strong at adjusted p below 0.01 and a fail-rate difference of at least 0.3; Moderate at adjusted p below 0.05 and a difference of at least 0.2; Weak at adjusted p below 0.1; otherwise `no clear link`).
4. Result shape (board 13, `docs/ux/04-ux-copy.md` section 15): per dimension `{ dimension, status: 'finding' | 'none' | 'notEnough' | 'missing', strength?, highlightedValue?, values: { value, failed, attempts, rate }[], others: { failed, attempts, rate }, pointsHigher, oddsRatio, adjustedP, comparisons }`, so the screen can print "{a} of {b} attempts against {c} of {d} on the others, {points} points higher" and draw the rate bars without recomputing anything.
5. Tests: known Fisher results (several tables, tolerance 1e-9); properties (p in 0..1, symmetric under swapping categories, invariant to row order); missing dimension data skips the dimension.
6. Lab: the lab test that fails only in one project (DEV-35) is flagged strongly; a uniformly flaky test is not.
7. Timing: 5,000 tests x 50 runs correlated in under 2 s, or computed lazily per test (report which).
8. No UI change, no new dependency.
9. Project dimension (finding from DEV-39, 2026-11-27): real reports give browser only as `defaultBrowserType`, and both lab projects are "chromium", so browser cannot separate them. Add `project` (Playwright project name, per attempt from `tests[].projectName`) as a dimension next to browser, shard, os and hour, if the dataset can carry it per attempt; first check how the lab's one-project test is stored (one test per project, or one test with attempts in two projects) and report the choice. OS is always missing in real reports (not present in Playwright JSON): it returns `missing`, and the Lab check (criterion 6) must not depend on it. If `project` needs a type change in `src/engine/types.ts`, keep it optional and the stored schema at version 1.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-39, DEV-35.
- Spec: section 10 (contingency tables, Fisher, effect size, not just a flag).
- Wording belongs to DEV-41; this ticket returns data only.

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
