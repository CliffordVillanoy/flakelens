# DEV-37: Failure groups screen and cause tips

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
6. `#/groups?q=` filters by template text.
7. e2e: sample, Groups tab, open a card, open its test, see the cause tip.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-36; board from the UI/UX chat.
- Needs boards from the UI/UX chat: Failure groups screen, cause chips, cause tips in the panel.
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
