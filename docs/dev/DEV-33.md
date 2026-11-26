# DEV-33: Settings screen and per-file remove

**Status:** Done locally (2026-11-26, commits `3541bb3`, `110c5f6`, `ff12738`, `0e30283` on `feat/dev-33-settings-remove` from origin/main 8b44712, worktree `flakelens-dev33`; 427 unit + 51 e2e pass, axe 46 scans clean, verified by planning). Not pushed or merged. Interim keys: `settings.theme.dark/light`, `settings.shortcuts.tip`, `settings.rules.note/show/failing/unproven/insufficient/rejected/rejected.name`, `settings.about.version/source/report/security/license` (doc has one joined `settings.about.links`). Settings and Loaded data are lazy chunks (main 493.7 kB). package.json still 0.0.0, so About shows "FlakeLens 0.0.0". Known: removing the earlier of two files that share runs also removes those runs; after an undo the file is last in stored order; Settings link not on Start; light theme checked by one screenshot.

**Goal:** Users manage preferences in one place and can remove a single wrong file without clearing everything.

**Objectives:**
- Add `#/settings`.
- Add per-file remove with undo.

**Scope:** Frontend (+ pure engine helper).

**Acceptance Criteria:**
1. `#/settings` holds theme, row density, the shortcuts switch, a read-only view of the thresholds with a plain note that they are starting values and not calibrated, the Clear all data action (existing dialog) and an About block ("FlakeLens {version}" read from `package.json`, and the links Source code, Report an issue, Security policy and MIT licence).
2. Per-file remove on Loaded data: a confirmation names the file, its runs and the tests affected. Removing deletes the import, its runs, attempts and commit label, and rankings recompute. Pure engine function `removeImport(ds, importId)` with tests; storage `deleteImport(importId)`.
3. Undo toast for 10 seconds restores the file from memory; closing the tab loses the undo, not the deletion. Works in storage-off mode (memory only).
4. Tests: duplicate runs across files, labelled files, the last file removed (back to Start), reload after remove, storage failure.
5. Keyboard operable; axe clean in both themes. The settings page, the remove dialog and the undo toast are covered by the a11y scans; the toast timer pauses on hover and focus (test with fake timers).
6. Simplification pass (`docs/ux/12-simplification-pass.md`): the row density control moves from the Tests toolbar to Settings only, so remove it from the toolbar in this ticket (the saved choice keeps working); the thresholds list is closed by default; each Settings row has at most one hint and the duplicate hint under Clear all data is gone; the old Loaded data footer "To remove a file, clear all data." is replaced by the per-file Remove button.
7. Rule 8 (`docs/ux/12-simplification-pass.md`, canvas v78): no grey helper line under a label; explanations go in a tooltip or a closed block; a helper stays only if it prevents a mistake. On Settings: no hints under Theme, Density or Shortcuts (the shortcut keys are in a tooltip); no caption lines; the thresholds list has no config-name column and stays closed by default (keep the one-line "starting values, not calibrated" note unless board 10 on the canvas v78 drops it, because it prevents a wrong reading); the remove dialog has no undo line; each file row has the sub-line "{runs} runs · {tests} tests". Do not add these keys, or retire them if present: `settings.density.hint`, the Theme hint, `settings.shortcuts.hint`, `settings.saved.hint`, `settings.data.hint`, `settings.about.privacy`, `file.remove.undoHint`. Tooltips keep the explanation text.
8. Second sub-label sweep (`docs/ux/12-simplification-pass.md` section 7b, canvas v79): the file row sub-line is "{runs} runs · {tests} tests" only: no added date and no not-imported count (the result pill already says it).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing (the board is ready); the About links need DEV-30 to land first or to point at the GitHub pages.
- **Board ready (2026-11-25):** board 10, `docs/ux/wireframes/Settings.dc.html` and `SettingsLight.dc.html` (preview: launch config `wireframe-preview`); design rules in `DESIGN.md` "Settings and per-file remove"; confirmed copy in `docs/ux/04-ux-copy.md` section 12 (keys `settings.*`, `file.remove.*`, `toast.fileRemoved`, `toast.fileRemoved.last`, `toast.fileRestored`, `toast.undo`). Use that wording and those keys.
- IA decision Q3: per-file remove is v1.
- **About block (rule 8, supersedes the earlier planning decision on the privacy line):** the About block shows only "FlakeLens {version}" and the links. The `settings.about.privacy` line is retired (the privacy statement stays on Start). The version is read from `package.json`, which says `0.0.0` today; the release version number is the Dev Ops chat's call, so show whatever `package.json` holds and tell the planning chat if it still says `0.0.0` when this ticket lands. The links are ordinary links the user clicks, opened in a new tab with `rel="noopener noreferrer"`.
- Board details: one 720px column of boxed sections (Appearance, How rankings are decided, Your data, About); theme and density as segmented groups (`aria-pressed`), the shortcuts switch (36x20, accessible name is the label); thresholds read-only with the config name in monospace; a Settings link in the header (`settings.title`); a "Remove" button with a trash icon on each file row; a confirmation that names the file in monospace and lists runs, tests affected and the commit label, with variants for runs that stay because another file also holds them (`file.remove.shared`) and for the last file (`file.remove.last`, returns to Start); default focus on "Keep file", filled danger button "Remove file"; a 10-second undo toast (480px max, status role, 3px timer bar, Undo and Dismiss, pauses on hover and focus, follows the app back to Start when the last file was removed).

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
