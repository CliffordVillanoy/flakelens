# DEV-39: Full test page with log viewer

**Status:** To do

**Goal:** A test's whole story on one page: run timeline, failure log with highlighted evidence, and correlations.

**Objectives:**
- Add `#/tests/:testId/full` and the log viewer.

**Scope:** Frontend.

**Acceptance Criteria:**
1. "Open full view" in the panel opens `#/tests/:testId/full`; back returns to the list with filters kept.
2. Log viewer: virtualised, line numbers, mono, wrap toggle, search in the log, copy line, evidence lines highlighted. An evidence chip jumps to its line and says "Quoted from the log" (verified: the line exists in the input).
3. A 5 MB log renders at most 150 DOM rows and stays responsive; lines over 2,000 characters are cut with "Show more".
4. Correlations section from DEV-38 in plain words with effect size; `not enough data` shows a calm explanation, never a finding.
5. Run timeline and score details reuse the panel parts. Phone layout works.
6. Keyboard operable; axe clean in both themes; hostile text renders as text.
7. e2e: open a test from the sample, full view, jump to evidence, back.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-36, DEV-38; board from the UI/UX chat.
- Needs a board from the UI/UX chat (Full test page).
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
