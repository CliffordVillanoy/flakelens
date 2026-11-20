# DEV-03: Flakiness score and labels

**Status:** To do

**Goal:** Give every test a 0 to 100 flakiness score and one label: Flaky, Unproven, Failing, Stable or Not enough data.

**Objectives:**
- Scoring building blocks: bit-packed flip count, Wilson 95% lower bound, moving average (`src/engine/score/flips.ts`, `stats.ts`).
- `scoreTests(ds: Dataset, config?: EngineConfig): TestScore[]` in `src/engine/score/score.ts`.
- Wasted time and the Unproven "possible wasted time" estimate.
- Test helper `buildDataset(...)` in `src/engine/score/testkit.ts`.

**Scope:** Backend.

**Acceptance Criteria:**
1. `countFlips` equals the naive loop for any list of up to 200 outcomes (property test), including across 32-bit word boundaries.
2. `wilsonLower` stays in 0..1, returns 0 when there are no trials, and 8 of 20 beats 1 of 2.
3. Score: `S = 100 × (0.60·W(m, g) + 0.25·f + 0.15·4r(1−r))`, always within 0..100 (property test).
4. Labels follow this order, first match wins:
   - Not enough data: fewer than 3 attempts, or a single run with no retries. Skipped when a commit has both a pass and a fail.
   - Failing: 95% or more failures in the last 10 attempts. Shows "was flaky earlier" when it was flaky before.
   - Flaky: at least one commit with both a pass and a fail. A pass after a retry counts, even in one run.
   - Unproven (internal `suspect`): at least 5 attempts and a flip rate of 0.2 or more.
   - Stable: everything else.
5. A test whose attempts are all skipped is Not enough data, never Stable, and its score is a finite number.
6. Wasted time counts only failed attempts on commits that also passed. Possible wasted time counts all failed attempts. Missing durations count as 0 and set `durationUnknown`.
7. Shuffling run order does not change labels or scores when runs have timestamps.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, Tasks 6 and 7 (definitions and test code are in the plan).
- Spec: `docs/SPEC.md` sections 10 and 11.
- Commit key: the user's commit label, else the run ID (each file is its own commit).
- Attempt order: run start time, then import order, then retry number. Skipped attempts are left out of scoring.
- `priority` is set to 0 here; DEV-04 fills it in.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:executing-plans, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Thresholds come only from `DEFAULT_CONFIG`; no hard-coded numbers in scoring code.
- Display names belong to the UI; the engine uses `flaky`, `suspect`, `failing`, `stable`, `insufficient`.
- No new dependencies.

**Definition of Done:**
- Every test written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; ledger lines for Tasks 6 and 7 added.
