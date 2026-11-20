# DEV-05: Flake lab and generated fixtures

**Status:** Done (2026-11-20, commit `57049d7` on `feat/v0-engine`; 56 tests pass, all 8 lab labels match)

**Goal:** Real Playwright run files with known answers, for the engine's tests and for the "Try sample data" button.

**Objectives:**
- A tiny static HTML app in `flake-lab/app/` and 8 Playwright tests with known labels in `flake-lab/tests/lab.spec.ts`.
- `npm run lab` runs the lab 12 times across 6 commits and saves the reports.
- Ground truth in `flake-lab/labels.json`.
- Sample data in `public/sample/`, including one file with deliberately broken entries.

**Scope:** Backend (test tooling and fixtures).

**Acceptance Criteria:**
1. `npm run lab` writes `fixtures/lab/run-00.json` to `run-11.json` plus `manifest.json` (file and commit for each run).
2. `public/sample/` holds the 12 runs, `run-bad.json` (two results without a status and one spec without a title) and `manifest.json`.
3. Each of the two flaky tests has at least one commit with both a pass and a fail in the generated files.
4. Running the lab twice gives the same pass and fail pattern (seeded randomness).
5. The lab makes no network calls: the app opens from a local `file://` path.
6. `flake-lab/README.md` explains each injected cause in one line and how to rerun the lab.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Task 9 (test table and run design are in the plan).
- Tests: 3 stable, `flaky: timing`, `flaky: random data`, `failing: wrong heading`, `unproven: regression` (fails on odd commits), `new: added last run` (only in run 11).
- Settings: `retries: 1`, `workers: 1`, Chromium only, JSON reporter. Commit = `c` + floor(run / 2).
- Randomness: seed from `hashString(run:title:retry)` into a mulberry32 generator.
- Spec: `docs/SPEC.md` sections 6.1 (step 2a), 13.2 (sample data) and 16 (flake lab).

**Skills/Plugins:** superpowers:executing-plans, superpowers:verification-before-completion, webapp-testing (Playwright).

**Limitations/Restrictions:**
- Install the browser with `npx playwright install chromium`; it goes to `.cache\ms-playwright` on D: via `PLAYWRIGHT_BROWSERS_PATH`. Open a new terminal first so the variable is set.
- Commit the generated files, so CI never needs a browser for engine tests.
- If a flaky test shows no mixed commit, tune the delay or the share of taken names, rerun, and record the final values in the README.

**Definition of Done:**
- Every acceptance criterion checked against the generated files.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; ledger line `Task 9: complete` added.
