# DEV-41: Settings screen and per-file remove

**Status:** To do

**Goal:** Users manage preferences in one place and can remove a single wrong file without clearing everything.

**Objectives:**
- Add `#/settings`.
- Add per-file remove with undo.

**Scope:** Frontend (+ pure engine helper).

**Acceptance Criteria:**
1. `#/settings` holds theme, row density, the shortcuts switch, a read-only view of the thresholds with a plain note that they are starting values and not calibrated, the Clear all data action (existing dialog) and an About block (app version from `package.json`, the privacy statement, links).
2. Per-file remove on Loaded data: a confirmation names the file, its runs and the tests affected. Removing deletes the import, its runs, attempts and commit label, and rankings recompute. Pure engine function `removeImport(ds, importId)` with tests; storage `deleteImport(importId)`.
3. Undo toast for 10 seconds restores the file from memory; closing the tab loses the undo, not the deletion. Works in storage-off mode (memory only).
4. Tests: duplicate runs across files, labelled files, the last file removed (back to Start), reload after remove, storage failure.
5. Keyboard operable; axe clean in both themes.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: board from the UI/UX chat.
- Needs boards from the UI/UX chat (Settings, per-file remove confirmation).
- IA decision Q3: per-file remove is v1.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md), interaction-design.

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
