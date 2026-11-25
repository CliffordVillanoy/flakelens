# DEV-40: Export CSV and JSON, report preview

**Status:** To do

**Goal:** Take results to a ticket or a spreadsheet: CSV, JSON and a Markdown report.

**Objectives:**
- Enable the two disabled Export items.
- Add the report preview.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Export menu: "Download CSV" and "Download JSON" work. CSV has one row per test in the table order: rank, test, file, project, status, score, mixed commits, flip rate, attempts, wasted minutes, evidence, first seen, last failed. Cells use the shared formula-safe helper (`csvCell`); the file starts with a byte-order mark. JSON is the canonical export `{ app, version, exportedAt, scope, tests }`.
2. Scope choice, as in board 14: the Export menu opens with a radiogroup "What to export" (`export.scope`): "Current view (n tests)" with the hint `export.scope.view.hint` (tab and search) or "All tests (n)" (ignores the tab and the search). The default is Current view and the choice is remembered while the user stays on the page. The menu order is: scope group, Copy top Flaky tests (kept from v0), Download CSV, Download JSON, Open report (`export.report`). Rule 8 (canvas v78): the Export menu shows no hints at all; `export.csv.hint`, `export.json.hint`, `export.scope.view.hint`, `export.scope.all.hint` and the Copy top Flaky tests and Open report hints are not shown (the item names carry the meaning; keep the explanation text as tooltips where useful). With zero tests in view the file items are disabled, the reason is written beside them, and `export.empty.title`, `export.empty.body` and the action `export.empty.all` ("Export all tests") appear. Retire the key `tests.export.later` ("Coming in v1").
3. `#/report` (board 14): a top bar with Back to tests, the title, the lead line `report.lead`, the primary button "Copy Markdown" and the secondary "Download .md"; a Preview or Markdown segmented group (`aria-pressed`); the scope shown as text with a note to change it from the Export menu (`report.scope`); a sample-data status line (`report.sample`). The Markdown follows `report.md.*`: title, a meta line (date, files, runs, tests, scope), a Summary with the five status counts and the wasted CI time (measured Flaky time, and the Unproven estimate worded "up to ... more if the Unproven tests are flaky"), the Top Flaky tests ("Failed {failed} of {total} attempts, mixed results on {commits} commits, {minutes} min wasted", plus "Likely cause: {cause} ({level} confidence)" when the classifier has one) and the footer (version, rankings not calibrated, causes likely not certain). All text from the report goes through the shared `escapeMd`. The preview is a surface box; the Markdown view is a monospace block that scrolls sideways and never wraps. Edge states: `report.noData.*` (with the action Add your files) and `report.noFlaky` (summary only).
4. File names are constants (`flakelens-tests.csv`, `flakelens-tests.json`, `flakelens-report.md`). Sample-data exports say "sample data" inside the file (CSV: a first comment-free marker column or row as the dev chat decides and reports; JSON: a `sample: true` field; Markdown: the `report.sample` sentence). Toasts name the file and the count: `toast.export.csv` (same pattern for JSON and the report), `toast.export.copied`; a blocked clipboard shows `toast.export.copyFailed` as an alert with the action "Download .md", replacing `toast.copyFailed` on the report page.
5. Tests: names with a newline, leading `=`, commas and quotes; 5,000 tests export in under 1 s; e2e downloads and reads the files.
6. No network; downloads use `downloadFile` (with the revoke delay from DEV-29).
7. Rule 8 (`docs/ux/12-simplification-pass.md`, canvas v78): no grey helper line under a label; explanations go in a tooltip or a closed block; a helper stays only if it prevents a mistake. The report page has no lead sentence (`report.lead` is retired) and no scope hint line beyond the scope text itself. Do not add the retired keys.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-36 for the "Likely cause" lines (without it the report simply omits them); the board is ready.
- **Board ready (2026-11-25):** board 14, `docs/ux/wireframes/Report.dc.html` and `ReportLight.dc.html`; design rules in `DESIGN.md` "Export menu and report"; confirmed copy in `docs/ux/04-ux-copy.md` section 16 (`export.*`, `report.*`, `toast.export.*`). Use that wording and those keys. The Export menu is a 340px popover; keyboard focus is a 2px inset ring on the item; the menu keeps its v0 first item.
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
