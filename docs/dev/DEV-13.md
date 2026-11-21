# DEV-13: Start screen and import states

**Status:** Done (2026-11-21, commit `870a26d` on `feat/v0-ui`; 131 tests pass)

**Goal:** A first-time user can load sample data or their own files and always sees what was imported and what was not.

**Objectives:**
- Start empty state: drop zone, Browse files, Try sample data, privacy line, report help.
- Per-file progress with Cancel after 1 s.
- Success, added, partial, rank-change and failed-file messages from the `import.*` copy.
- Sample banner with Exit sample; Leave-sample dialog before importing in sample mode.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Every row of spec 9.1 shows its message (component tests with engine fixtures).
2. A failed file shows inline, file name first, while other files in the same drop import.
3. The drop zone stays active after every error.
4. Leave-sample dialog opens before an import in sample mode, with focus on "Stay".
5. Exit sample returns to the user's data, or to Start when there is none.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 3 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Boards: 1 Start, 2 Import states. IA flows F1, F2.

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
