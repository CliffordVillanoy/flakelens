# DEV-38: Failure groups screen and cause tips

**Status:** To do

**Goal:** Users see failures as groups with a likely cause, and each test's note gives cause-specific tips.

**Objectives:**
- Add the Groups tab and cards.
- Add cause tips and evidence lines to the detail panel.

**Scope:** Frontend.

**Acceptance Criteria:**
1. `#/groups` is a second tab beside Tests (IA section 3). Each failure group card shows the template in mono, count, first and last seen, a "Likely cause" chip with confidence and the quoted evidence lines, and links to its tests. Environment events collapse into one card ("N tests failed the same way in run X").
2. The detail panel adds the cause tip to the status note when confidence is medium or high, in "likely" wording; `unknown` adds nothing. Evidence lines are highlighted in the latest-failure hunk.
3. All text from the copy module with ICU plurals; new keys are interim and listed.
4. Hostile and very long messages render as text; 5,000 groups stay responsive (virtualised).
5. Keyboard operable; axe finds no serious or critical issue on the screen in both themes.
6. `#/groups?q=` filters by template text; sort and search state live in the URL.
7. Rule 8 (`docs/ux/12-simplification-pass.md`, canvas v78): no grey helper line under a label; explanations go in a tooltip or a closed block; a helper stays only if it prevents a mistake. On Groups: no lead sentence, the card meta reads "{failures} failures · {tests} tests · last seen {date}", no "Showing n of N groups" line and no unknown-cause note. Do not add these keys, or retire them: `groups.lead`, `groups.showing`, `groups.unknown.note`; `groups.meta` takes the shorter form. Tooltips keep the explanation text.
8. e2e: sample, Groups tab, open a card, open its test, see the cause tip.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-37 (the board is ready).
- **Board ready (2026-11-25):** board 12, `docs/ux/wireframes/Groups.dc.html` and `GroupsLight.dc.html`; design rules in `DESIGN.md` "Failure groups and cause chips"; confirmed copy in `docs/ux/04-ux-copy.md` section 14 (`groups.*`, `panel.cause.*`, `panel.latest`, `cause.<id>` names and `cause.<id>.tip` tips for the nine causes and Unknown). Use that wording and those keys; the wording rule is "likely" or "probably", never a fact.
- Board details to build: `#/groups` as the second tab with a count pill, search (`?q=`), sort (Most failures, Most tests, Latest) and "Showing n of N groups"; list order is environment events first, then the chosen sort. A group card has the masked template in mono with the grey tags (`‹n›`, `‹id›`, `‹path›`, `‹time›`), counts, first and last seen, an outlined (never filled) chip "Likely cause: {name}" with confidence in words (High, Medium, Low) or `groups.chip.unknown`, an evidence block (canvas fill, muted line numbers, matched text on the selection fill with a dotted underline), test links and "Show all N tests" expanding in place. The environment-event card sits on top on the info band with the heading "N tests failed the same way in run X". Cause tip in the detail panel: inside the status note box below a divider, bold "Likely cause", muted confidence, the two-sentence tip and the link "See the group of N failures"; added only at medium or high confidence, with the highlighted hunk; Low and Unknown add nothing. Edge states: no failures, no match with Clear search, a message over 300 characters cut with "Show full message", and 5,000 groups virtualised.
- Simplification pass (`docs/ux/12-simplification-pass.md` section 4): the plan collapses each card's evidence to 2 lines with "Show all" and drops "Likely cause:" from the chip when a heading already says it. Check board 12 on the canvas (v77) for the final form and follow the board where it differs.
- Engine inputs this ticket reads: `groupFailures` (DEV-36: template, counts, test ids, run ids, first and last run, environment event) and `classifyGroup` (DEV-37: category, confidence, evidence lines with numbers, representative attempt).
- IA: `docs/ux/02-information-architecture.md` section 8 (v1 additions).

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
