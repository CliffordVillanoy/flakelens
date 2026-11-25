# DEV-34: Flake lab: one test per cause

**Status:** To do

**Goal:** Ground truth for the cause classifier: one lab test per cause in the spec's list, with realistic failure text.

**Objectives:**
- Add lab tests for the missing causes and record each test's cause in `labels.json`.

**Scope:** Enhancement (flake lab).

**Acceptance Criteria:**
1. `flake-lab/labels.json` gets a `cause` next to `label`, using the spec 12 categories: timing and waits, order dependency, shared state or data, network or external service, environment or resources, concurrency, locator or UI, time and randomness, infrastructure. Existing tests keep their labels and pass and fail patterns (before and after diff).
2. New lab tests, at least one for each category not yet covered: order dependency, shared state or data, network or external service, environment or resources, concurrency (race), locator or UI, infrastructure. Each fails with realistic Playwright or Node error text (for example `strict mode violation`, `net::ERR_CONNECTION_REFUSED`, `ECONNRESET`, a 503, `expect(received).toBe(expected)` with stale data). The README lists each message. The lab injects causes with seeded outcomes and realistic text, so it validates the classifier's text rules, not real mechanisms; say so.
3. Each new flaky test shows at least one mixed commit in the generated files (as DEV-05 AC3).
4. An infrastructure event: in two runs, at least 4 tests fail with the same normalised message and recover afterwards.
5. Failures include multi-line stacks with project frames and library frames, and one log with an obviously fake secret-like token (for redaction tests).
6. A lab test that fails only in one of two Playwright projects (for example `chromium` and `chromium-mobile`, a different viewport), for DEV-38.
7. Regenerate fixtures, sample set and `docs/eval/lab-detection.md`; flaky precision and recall rows stay 1.00 or the change is explained. Report the lab runtime and the sample size (keep it under 1 MB).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-28.
- Spec: section 16 (the flake lab: one test per cause).
- Do not change engine code in this ticket; if the engine mislabels a new test, report it.

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
