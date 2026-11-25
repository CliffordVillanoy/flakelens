# DEV-28: Sample data: realistic lab durations

**Status:** To do

**Goal:** The demo's wasted-time numbers look like a real suite instead of 0.1 minutes.

**Objectives:**
- Give the flake lab tests realistic, deterministic durations.
- Regenerate the lab fixtures, the sample set and the detection report.

**Scope:** Enhancement (flake lab).

**Acceptance Criteria:**
1. Durations come from seeded waits inside the lab app (a slow-page simulation), not from editing the JSON: stable tests take 0.5 to 3 s, flaky and failing tests 3 to 40 s per attempt (a failing attempt may end at a 5 to 30 s timeout). The seeding uses the existing shared PRNG so reruns match.
2. In the regenerated sample the top Flaky test shows at least 1 minute of wasted time and the Wasted CI time (Flaky) total is at least 10 minutes. The totals are computed by the engine, never typed in.
3. All 9 lab labels and every pass and fail pattern are unchanged: compare the per-run attempt patterns before and after, as in DEV-08.
4. `docs/eval/lab-detection.md` regenerated with identical precision and recall rows; `flake-lab/README.md` says durations are simulated and lists the ranges.
5. The full lab run (12 runs) finishes in under 10 minutes on this machine; report the actual time. Sample size stays under 1 MB (report it).
6. No engine or UI code changes.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing.
- Why: DEV-14 found the sample shows 0.1 to 0.3 min of wasted time, which makes the demo look unconvincing.
- Files: `flake-lab/app/index.html`, `flake-lab/tests/lab.spec.ts`, `flake-lab/README.md`, regenerated `fixtures/lab/*`, `public/sample/*`, `docs/eval/lab-detection.md`.
- Honest labelling: simulated durations are said so in the README and in the lab report limits.

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
