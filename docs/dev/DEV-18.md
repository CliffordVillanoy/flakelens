# DEV-18: End-to-end, accessibility, privacy and deploy

**Status:** Done (2026-11-21, commit `e86920f` on `feat/v0-ui`; 225 unit + 28 e2e tests pass, 30 axe scans clean)

**Goal:** Prove v0 works for a real user, stays private and accessible, and publish it on GitHub Pages.

**Objectives:**
- Playwright e2e flows (sample, import, partial, failure, keyboard, clear, reload).
- No-network test, axe scans in both themes, screenshots of each state.
- Large-suite check (5,000 tests × 50 runs) and bundle check (no test helpers shipped).
- CI e2e job (PRs and manual only) and a GitHub Pages deploy workflow.
- README demo link and screenshot.

**Scope:** Both (tests, CI, hosting).

**Acceptance Criteria:**
1. Sample flow reaches a ranked list and an open Flaky test in under 2 minutes of user steps.
2. In default mode no request leaves the app origin.
3. Axe finds no serious or critical issues on any screen in dark or light.
4. The large suite stays interactive while importing and scrolls smoothly.
5. `dist/` contains no `buildDataset`/testkit code.
6. The Pages workflow uses pinned SHAs and least-privilege permissions; e2e runs only on PRs and manual runs.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 8 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- The user enables GitHub Pages (Source: GitHub Actions) in repo settings before the first deploy. Deploy happens only after the v0 UI is merged to `main`.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, webapp-testing.

**Limitations/Restrictions:**
- Branch `feat/v0-ui` (create it from `main` in DEV-11). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge.
- Every visible string from `src/ui/copy.ts` (keys from `docs/ux/04-ux-copy.md`). No network calls outside the app origin.
- New dependencies only as named in the plan; report each one's version and licence.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` green.
- Compared against the named wireframe boards (launch config `wireframe-preview`) in dark and light; differences listed in the report.
- Committed on `feat/v0-ui`; ledger line added; development report sent to the planning chat.
