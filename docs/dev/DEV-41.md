# DEV-41: Full test page with log viewer

**Status:** Done locally (2026-11-28, 8 commits c7a5bf8..c6a4176 (incl. `27103b7` DEV-40 follow-up engine fix and `c6a4176` how-text) on `feat/dev-41-full-test-page` from origin/main 803a989, worktree `flakelens-dev41`; 1186 unit + 62 e2e pass, typecheck, lint, build clean, verified by planning). Not pushed or merged. Own windowing (no dependency), max 150 rows, 5 MB log opens under 0.5 s; redactSecrets on every shown or copied line and chip quote, cut after masking; verifyEvidence on raw text. Project card hidden when missing (one-project suites). Word budget: full page 90 (measured 77 and 78). Copy: log.range, corr.finding, corr.none, corr.notEnough shorter than the doc; many interim keys pending UI/UX. DEV-40 follow-up shipped in this branch (new optional result field `method`; interim key corr.how.best). Accepted: search runs on the raw log; wrapped line heights estimated.

**Goal:** A test's whole story on one page: run timeline, failure log with highlighted evidence, and correlations.

**Objectives:**
- Add `#/tests/:testId/full` and the log viewer.

**Scope:** Frontend.

**Acceptance Criteria:**
1. "Open full view" in the panel opens `#/tests/:testId/full`; back returns to the list with filters kept.
2. Log viewer: virtualised, line numbers, mono, wrap toggle, search in the log, copy line, evidence lines highlighted. An evidence chip jumps to its line and says "Quoted from the log" (verified: the line exists in the input).
3. A 5 MB log renders at most 150 DOM rows and stays responsive; lines over 2,000 characters are cut with "Show more".
4. Correlations section from DEV-40 in plain words with effect size; `not enough data` shows a calm explanation, never a finding.
5. Run timeline and score details reuse the panel parts. Phone layout works.
6. Keyboard operable; axe clean in both themes; hostile text renders as text.
7. e2e: open a test from the sample, full view, jump to evidence, back.
8. Rule 8 (`docs/ux/12-simplification-pass.md`, canvas v78): no grey helper line under a label; explanations go in a tooltip or a closed block; a helper stays only if it prevents a mistake. On the full test page: no lead sentences (`corr.lead` is retired), shorter correlation sentences as on board 13 at canvas v78, and the log footer follows the board (`log.range` wording). Explanations move into tooltips or the closed "How this was worked out" block.
9. Secrets in quoted evidence (security, from DEV-37): evidence text is an exact log line, so a line holding a token would be shown or exported as is. Every place that shows or exports evidence or log text passes it through `redactSecrets` from `src/engine/group/normalize.ts` (added in the DEV-37 follow-up; masks Bearer values, token or key assignments and long key-like runs, leaves the rest of the line readable). `verifyEvidence` keeps checking the raw text; only the display and the export are redacted. Test with the lab's fake token (`FAKE-TOKEN-NOT-A-SECRET-000000`): it never appears in the DOM or in the file.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-37, DEV-40 (the board is ready).
- **Board ready (2026-11-25):** board 13, `docs/ux/wireframes/FullTest.dc.html` and `FullTestLight.dc.html`; design rules in `DESIGN.md` "Full test page and log viewer"; confirmed copy in `docs/ux/04-ux-copy.md` section 15 (`full.*`, `log.*`, `evidence.*`, `corr.*`). Use that wording and those keys. Correlation wording rule: a link is a clue, never a cause ("fails more often on", never "is caused by"); strength is a word, never a bare p-value.
- Board details to build: one column (max 1232px) with a top bar (Back to tests keeps filters and scroll place, Copy test name), the test name in mono with the status pill, the path, the last-12 squares, three stat tiles (attempts failed, passed on retry, wasted time; confidence is already in the status note, simplification pass), the status note with the cause tip, then Run timeline (Run, Commit with a "label" tag when typed, When, Result as squares plus words, Time; "Show all N runs"), Failure log, and What it depends on. Log viewer: search with a live count ("No matches" at zero), previous and next, the Wrap lines switch, Copy line, muted non-selectable line numbers, evidence lines with a 3px accent bar and a dotted underline, a 2px focus ring on the jump target, "Show more" for lines over 2,000 characters, at most 150 rows drawn, a run picker, a region named by `log.region`. Evidence chip: "Quoted from the log · line N", or the amber "Not found in the log" hint that is not highlighted. Correlations: a finding box with the strength word, one plain sentence, rate bars (red only on the highlighted value) and a closed "How this was worked out" block; the quiet boxes for no clear link, not enough data (with the exact thresholds and the test's numbers) and a missing dimension. Phone layout stacks the timeline rows. Edge states: no log text, a test that never failed, a 5 MB log, a hostile or very long line.
- Simplification pass (`docs/ux/12-simplification-pass.md` section 4 and 6): the page shows three tiles; the plan also says correlation findings are closed except the strongest, and the log opens at the first evidence line. Check board 13 on the canvas (v77) for the final form before building, and follow the board where it differs. Board notes are in closed "Design note" blocks and are not UI.
- Engine inputs: `correlate` (DEV-40: per-value failed and attempts, adjusted p, odds ratio, strength, the not-enough-data reason), `classifyGroup` and `verifyEvidence` (DEV-37), and per-line numbers for the log text (split lazily so a 5 MB message stays responsive).
- Spec: section 13 (LogViewer, EvidenceChip), 6 (v1 row).

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
