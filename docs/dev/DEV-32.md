# DEV-32: Commit or label per imported file

**Status:** To do

**Goal:** A user can say which commit a file belongs to, so two runs of the same commit show same-commit evidence.

**Objectives:**
- Add an editable commit or label to every imported file on Loaded data.
- Recompute rankings when a label changes.

**Scope:** Frontend (+ pure engine helper).

**Acceptance Criteria:**
1. Each file row on Loaded data has an editable "Commit or label" field (empty shows the commit from metadata, or the existing no-commit note). Saving updates that import's runs, and Tests and the Evidence text recompute at once.
2. Files with the same label count as one commit: labelling `run-00.json` and `run-01.json` of the sample both `c0` produces the same mixed-commit counts the sample shows (e2e with the lab fixtures).
3. Pure engine function `setCommitLabel(ds, importId, label)` in `src/engine/dataset.ts` with tests; the label is stored with the import (optional `commitLabel` on the stored row, `schemaVersion` stays 1) and survives reload; Clear all data removes it.
4. Label is plain text: trimmed, at most 100 characters (typing stops at the limit and `files.commit.tooLong` shows), control characters cleaned; empty removes the label. The runs table shows a typed label in the Commit column with the `runs.commit.labelTag` tag.
5. The no-commit note offers the link `import.noCommit.link` ("Add a commit label") that moves focus to the first file without commit information. When storage blocks the save, the label stays in memory for the session, `files.commit.saveFailed` shows as an alert with Try again, and the text says the label would be lost on close.
6. In sample mode the field is read-only, with the lock icon, the "Read-only" tag and the text `files.commit.readonly`.
7. e2e: drop two lab files, label both with the same value, a cross-run test becomes Flaky, reload keeps it.
8. Second sub-label sweep (`docs/ux/12-simplification-pass.md` section 7b, canvas v79): the commit field has no grey helper sentences: remove "Leave empty to use the commit from the report...", the grey placeholder sentence, and the visible "Enter saves, Esc cancels" (Enter and Esc still work; keep them in the accessible description); the shared-label helper is "Also used by {count, plural, one {# other file} other {# other files}}."; the read-only helper is "Read-only in sample data."; the no-commit warning stays (it prevents a mistake). Follow board 9 on the canvas (v79) for the empty-field text. Retire or shorten these keys, and do not add them back: `files.commit.hint.report`, `files.commit.hint.editing`, `files.commit.placeholder.report`, `files.commit.placeholder.none` (the board decides what an empty field shows), `files.commit.hint.shared` (shortened), `files.commit.readonly` (shortened). `import.noCommit` stays unchanged.
9. Carry-over from DEV-31 (UI/UX, copy doc section 19): change `sample.retry` in `src/ui/copy.ts` from "Retry" to "Try again" (the same recovery verb as `files.commit.saveFailed`); `sample.fail` stays "The sample data couldn't be loaded.". The copy-sync test and the Start test follow the doc. Do this first, as a small separate commit.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing (the board is ready). DEV-39 adds the "From the report" source later; until then every file reads "No commit info".
- Spec section 20.1: "Each file is its own commit by default; the user can type a commit or label per file." v0 shipped without the input; this ticket closes that gap.
- **Board ready (2026-11-25):** board 9, `docs/ux/wireframes/CommitLabel.dc.html` and `CommitLabelLight.dc.html` (preview: launch config `wireframe-preview`), design rules in `DESIGN.md` "Commit or label field", and the confirmed copy in `docs/ux/04-ux-copy.md` section 11 (keys `files.commit.*`, `import.noCommit.link`, `runs.commit.labelTag`). Use that wording and those keys; do not invent copy.
- Board details to build: a persistent "Commit or label" label above a 36px field inside each file row on Loaded data, with a source tag (From the report, No commit info, Your label, Read-only); an editing state (2px accent ring, counter "n / 100", Save label and Cancel, Enter saves, Esc cancels, a 24px remove button named "Remove label"); the saved message "Label saved. Rankings updated." (role status) and the failure box with Try again (role alert); a typed label shows in the Commit column of the runs table with a small "label" tag; read-only with a lock icon in sample data; the 100-character limit stops typing and turns the counter to the error colour.
- Word budget: Loaded data stays within 60 visible words above the first file row (`docs/ux/12-simplification-pass.md`); the label field adds a persistent label and one hint, nothing more.
- Shared labels: the hint says "Files with the same label count as one commit" and adds "Also used by {count} other files" when another file has the same label.

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
