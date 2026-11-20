# DEV-08: Flake lab, cross-run flaky test

**Status:** To do (runs before DEV-07)

**Goal:** Show, with the lab, the case FlakeLens exists for: a test that is flaky across runs of the same commit, which Playwright's own retry flag cannot see.

**Objectives:**
- Add one lab test, `flaky: cross-run only`, that fails both attempts in one run and passes in the other run of the same commit.
- Regenerate the lab fixtures, the sample data and the detection report.
- The report shows the engine beating the Playwright baseline on recall.

**Scope:** Enhancement (test tooling and evaluation).

**Acceptance Criteria:**
1. `flaky: cross-run only` fails on both attempts when `LAB_RUN` is even and passes when it is odd. It is deterministic, and every commit (two runs each) has one failing and one passing run.
2. In the regenerated reports, Playwright never marks it `flaky` (status `unexpected` in even runs, `expected` in odd runs).
3. `flake-lab/labels.json` lists it as `flaky`, and the engine labels it `flaky` (lab acceptance test passes with 9 tests).
4. `docs/eval/lab-detection.md` shows engine recall 1.00 and baseline recall 0.67 (2 of 3) at 4, 8 and 12 runs, and the tie note no longer appears.
5. The other 8 lab tests keep the same pass and fail pattern as before. Their seeds are per title, so adding a test must not change them.
6. The sample set still imports with no failed file and the not-imported notice. `run-bad.json` is regenerated from the new run 0.
7. `flake-lab/README.md` lists the new cause in one line: "flaky across runs, never within a run (what retries cannot see)".

**Details:**
- Found in the DEV-06 report: every flaky lab test also failed then passed on a retry in one run, so Playwright's own flag matched the engine (both 1.00). The spec's evaluation (section 17) names the Playwright label as the baseline to beat.
- Files: `flake-lab/tests/lab.spec.ts`, `flake-lab/labels.json`, `flake-lab/README.md`, regenerated `fixtures/lab/*`, `public/sample/*`, `docs/eval/lab-detection.md`. Update any test that counts lab tests (8 → 9).
- Commands: `npm run lab`, then `npm run eval:lab`, then `npx vitest run`.
- Spec: `docs/SPEC.md` sections 2 (flakiness across separate runs is invisible in one report), 16 and 17.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development (update the count and label expectations first and watch them fail), superpowers:verification-before-completion.

**Limitations/Restrictions:**
- No engine changes. If the engine misses this test, stop and report it as Blocked; that is an engine bug for DEV-07.
- Chromium only, `file://` app, no network, browser stays in `.cache\ms-playwright` on D:.
- Commit only the task files on `feat/v0-engine`. No push, no merge.
- No ledger task for this ticket in the plan: add a ledger line `DEV-08: complete (commits …, tests: …)` by hand.

**Definition of Done:**
- All acceptance criteria checked against the regenerated files.
- `npx vitest run`, `npx tsc --noEmit` and `npx eslint .` green.
- Committed on `feat/v0-engine`; development report sent to the planning chat.
