# DEV-31: Commit or label per imported file

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
4. Label is plain text: trimmed, at most 100 characters, control characters cleaned; empty removes the label.
5. The `import.noCommit` notice offers a link "Add a commit label" that focuses the field.
6. In sample mode the field is read-only.
7. e2e: drop two lab files, label both with the same value, a cross-run test becomes Flaky, reload keeps it.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-30; board from the UI/UX chat.
- Spec section 20.1: "Each file is its own commit by default; the user can type a commit or label per file." v0 shipped without the input; this ticket closes that gap.
- Needs a board from the UI/UX chat (plan, Design dependencies). Interim copy keys are listed in the report.

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
