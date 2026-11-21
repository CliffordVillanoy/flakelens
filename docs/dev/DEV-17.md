# DEV-17: Loaded data, clear data, edge states, shortcuts sheet

**Status:** To do

**Goal:** Users can see exactly what is loaded, why something was not imported, and remove everything in one step.

**Objectives:**
- Loaded data page: lead, files, notices, not-imported download (CSV and JSON), runs table.
- Clear all data dialog and toast.
- Empty, no-match, storage failed and storage off states.
- Shortcuts sheet with on/off switch.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Clear all data removes everything from IndexedDB and returns to Start with the toast.
2. Downloaded CSV is formula-safe and both downloads list every not-imported result.
3. Storage off shows the warning; storage failure shows Reload, never a blank page.
4. The shortcuts switch persists and disables single-key shortcuts.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 7 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Boards: 5 Loaded data, 6 Edge states. Per-file remove stays v1.

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
