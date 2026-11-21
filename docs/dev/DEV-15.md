# DEV-15: Table controls and export

**Status:** Done (2026-11-21, commit `4128b43` on `feat/v0-ui`; 173 tests pass)

**Goal:** Let users shape the table and take a summary to their team.

**Objectives:**
- Filter chips with Clear filters.
- Columns popover (Test and Status locked) saved per browser.
- Density switch (Comfortable default, Compact option) saved.
- Export menu: Copy top Flaky tests (Markdown) with toast; CSV and JSON shown as Coming in v1.
- First-run "why?" links on the top 3 Flaky rows and a dismissible Export tip.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Column, density and tip choices survive a reload.
2. Copied Markdown escapes `|`, backticks and leading `= + - @`.
3. Disabled export items cannot be activated by mouse or keyboard.
4. Removing a chip updates the table and the URL.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 5 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Board: 8 Table controls.

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
