# DEV-29: Simplification pass on the v0 screens

**Status:** To do

**Goal:** The live v0 screens follow the owner's less-text rules: fewer words, no grey helper lines, word budgets.

**Objectives:**
- Apply `docs/ux/12-simplification-pass.md` (rules, Tests audit, roll-out, both sub-label sweeps) to the Tests, Start, detail panel, Loaded data, edge and import screens.
- Retire the copy keys that no longer show and prove the word budgets with tests.

**Scope:** Frontend (copy and screen changes).

**Acceptance Criteria:**
1. Where the boards or `docs/ux/12-simplification-pass.md` give shorter text than `docs/ux/04-ux-copy.md` section 9 or 10 for a key, the board wins; report each such key so the UI/UX chat updates the copy doc. Keys that become unused (for example the toolbar density keys and long banner text) are retired from `src/ui/copy.ts`, and the copy-sync test in item 2 is adjusted to match.
2. Simplification pass, Tests screen (source: `docs/ux/12-simplification-pass.md` section 3 and 6, `DESIGN.md` "Less text, fewer decisions", boards at canvas v77): the sample banner reads "Sample data. Start with the top 3 Flaky tests." plus Exit sample; the health line reads "{tests} tests · {runs} runs" (files and commits live on Loaded data); the status legend row is removed (the tabs carry the dot and count); the Unproven estimate reads "+ ~{min} min possible" with the reason as a tooltip; the "Showing n tests..." line stays for screen readers only (live region, not shown); the run-square key drops the prefix "Last 12 runs, oldest first:". **The density toggle stays in the toolbar until DEV-33 puts it in Settings; DEV-33 removes it from the toolbar** (so nobody loses the control in between).
3. Simplification pass, other screens: Start lead is "A flaky test passes and fails on the same code. Drop your test reports to rank them." and the drop-zone line is "More runs give better results."; the detail panel shows a one-sentence status note and two checks, with "More to check" closed (two more checks and the quarantine tip), and the duplicate run and commit line above the diff is removed; Loaded data lead is "{files} files · {runs} runs · last added {date}" and its footer reads "To remove a file, clear all data." (DEV-33 replaces it with per-file Remove); one sentence is cut from each of the Edge states and Import states texts the pass names (the good-news line, the sample-mode note).
4. Word budgets (rule 3 of the pass): visible UI text above the first data row, excluding row content, is at most 40 words on Start, 60 on Tests, 60 on Loaded data, 90 in the detail panel, 45 in any dialog and 20 in any banner or toast. A unit test per screen renders it in its main states and asserts the budget; the counting rule (visible text only, tooltips and screen-reader-only text excluded) is stated in the test and in the report.
5. Rule 8 (`docs/ux/12-simplification-pass.md`, canvas v78): no grey helper line under a label; explanations go in a tooltip or a closed block; a helper stays only if it prevents a mistake. On the v0 screens: the group meaning line on Tests becomes a tooltip on the group name; the detail panel caption is removed. Keys that no longer show are retired.
6. Second sub-label sweep (`docs/ux/12-simplification-pass.md` section 7b, canvas v79): on Loaded data the file sub-line is "{runs} runs · {tests} tests" only (no added date, no "3 not imported"; the result pill says it); the shortcuts sheet drops the line "They never fire while you type in a text field." (the behaviour stays). Kept on purpose, do not remove: the file path under the test name, the SHA and branch cells, the no-commit warning, and the not-imported detail. Retire the keys that no longer show (`data.file.meta` is shortened; the typing note in `keys.*`).
7. Unit and e2e tests updated or added for every item above; full suites green.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-28.
- Sources: `docs/ux/12-simplification-pass.md` sections 2, 3, 6, 7 and 7b, `DESIGN.md` "Less text, fewer decisions", and the boards at canvas v79 in `docs/ux/wireframes/` (launch config `wireframe-preview`).
- This ticket carries the acceptance criteria that were split out of DEV-28; DEV-28 (tokens, copy sync, banners) lands first so the copy-sync test in DEV-28 can be adjusted here when keys are retired.
- The UI/UX chat is available for wording and board questions; where a board and a doc differ, the board wins and the key is reported.

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
