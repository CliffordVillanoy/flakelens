# DEV-16: Test detail panel and keyboard navigation

**Status:** To do

**Goal:** Show the evidence behind a label and let users move through tests by keyboard.

**Objectives:**
- Panel header with prev/next, position, Copy summary, close.
- File-header bar with attempt diffstat; run history by commit with stacked retries and mixed-commit outline.
- Status note (What this means / What to check next), latest failure as a diff hunk, score details.
- Shortcuts: j, k, Enter, Esc, /, ?; focus rules; old-link state.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Run-history columns and their spoken labels come from `runHistory`.
2. Each label shows its note, including Failing-was-flaky with its SHA and the Stable low-confidence line under 5 runs.
3. Opening moves focus to the panel title; closing returns it to the row.
4. Shortcuts never fire in text fields or when switched off.
5. An unknown `#/tests/<id>` shows the missing-test state with Back to tests.
6. The panel opens scrolled to the latest failure.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 6 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Board: 4 Test detail. IA section 5 (navigation) and F3, F4.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md), interaction-design.

**Limitations/Restrictions:**
- Branch `feat/v0-ui` (create it from `main` in DEV-11). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge.
- Every visible string from `src/ui/copy.ts` (keys from `docs/ux/04-ux-copy.md`). No network calls outside the app origin.
- New dependencies only as named in the plan; report each one's version and licence.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` green.
- Compared against the named wireframe boards (launch config `wireframe-preview`) in dark and light; differences listed in the report.
- Committed on `feat/v0-ui`; ledger line added; development report sent to the planning chat.
