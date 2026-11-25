# DEV-40: Export CSV and JSON, report preview

**Status:** To do

**Goal:** Take results to a ticket or a spreadsheet: CSV, JSON and a Markdown report.

**Objectives:**
- Enable the two disabled Export items.
- Add the report preview.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Export menu: "Download CSV" and "Download JSON" work. CSV has one row per test in the table order: rank, test, file, project, status, score, mixed commits, flip rate, attempts, wasted minutes, evidence, first seen, last failed. Cells use the shared formula-safe helper (`csvCell`); the file starts with a byte-order mark. JSON is the canonical export `{ app, version, exportedAt, scope, tests }`.
2. Scope choice: current filter or all tests.
3. `#/report` previews the Markdown report (summary, top Flaky tests with evidence and likely cause when available), with Copy and Download .md. Markdown uses the shared `escapeMd`.
4. File names are constants (`flakelens-tests.csv`, `flakelens-tests.json`, `flakelens-report.md`). Sample-data exports say "sample data" inside the file.
5. Tests: names with a newline, leading `=`, commas and quotes; 5,000 tests export in under 1 s; e2e downloads and reads the files.
6. No network; downloads use `downloadFile` (with the revoke delay from DEV-29).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-35; board from the UI/UX chat.
- Needs a board from the UI/UX chat (Report preview and export options).
- Spec: sections 3 (goal 5), 6, 13 (Report screen). Security chat re-review: yes (exports are an output boundary).

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, security-review, frontend-design / impeccable (match DESIGN.md).

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
