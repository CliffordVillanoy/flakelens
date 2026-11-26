# DEV-34: Sample data: realistic lab durations

**Status:** Done locally (2026-11-26, commits `d370539` lab, `bc66a98` header and `5c04c59` panel trim (passedAfter and note.flaky.next shortened, panel budget back to 90, "flaky: timing" 89 words) on `feat/dev-34-lab-durations` from origin/main 27fa1b4, worktree `flakelens-dev34`; 434 unit (with the updated copy doc) + 51 e2e pass, axe 46 clean, verified by planning). Not pushed or merged. Top Flaky test 4.32 min, Flaky total 10.59 min (margin 0.59), full lab run 6 min 21 s (12 runs, 6 at a time), sample 479,134 bytes, patterns identical. Needs the docs bundle in the same PR (copy-sync reads the updated copy doc). Logo gutter already 24px/16px, nothing changed.

**Goal:** The demo's wasted-time numbers look like a real suite instead of 0.1 minutes.

**Objectives:**
- Give the flake lab tests realistic, deterministic durations.
- Regenerate the lab fixtures, the sample set and the detection report.

**Scope:** Enhancement (flake lab) + a small header change (item 7).

**Acceptance Criteria:**
1. Durations come from seeded waits inside the lab app (a slow-page simulation), not from editing the JSON: stable tests take 0.5 to 3 s, flaky and failing tests 3 to 40 s per attempt (a failing attempt may end at a 5 to 30 s timeout). The seeding uses the existing shared PRNG so reruns match.
2. In the regenerated sample the top Flaky test shows at least 1 minute of wasted time and the Wasted CI time (Flaky) total is at least 10 minutes. The totals are computed by the engine, never typed in.
3. All 9 lab labels and every pass and fail pattern are unchanged: compare the per-run attempt patterns before and after, as in DEV-08.
4. `docs/eval/lab-detection.md` regenerated with identical precision and recall rows; `flake-lab/README.md` says durations are simulated and lists the ranges.
5. The full lab run (12 runs) finishes in under 10 minutes on this machine; report the actual time. Sample size stays under 1 MB (report it).
6. No engine code changes. UI changes are limited to the two header items below.
7. Header, owner request 2026-11-26 (screenshot of the header): add a little space to the left of the FlakeLens logo (the logo mark touches the left edge; UI/UX value: header padding-inline 24px on desktop, 16px below 640px, as the boards use; check phone width and 1440px, both themes); remove the "Nothing leaves this browser" text and the green lock icon from the header. Retire `header.privacy` from `src/ui/copy.ts` and its tests (`src/ui/components/Header.test.tsx`, `src/ui/copy.test.ts`, `e2e/layout.spec.ts` line 40 area); the privacy statement stays on Start (do not remove it there). The copy-sync test follows `docs/ux/04-ux-copy.md` (UI/UX retires the row). Axe stays clean in both themes.

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
