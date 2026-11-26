# DEV-46: v1 review and release hand-off

**Status:** To do

**Goal:** An independent review of the whole v1 change set and a clear hand-off to the Dev Ops chat for versioning and release.

**Objectives:**
- Review, fix serious findings, check accessibility and browsers, and prepare release notes.

**Scope:** Fix or refinement (review).

**Acceptance Criteria:**
1. One whole-change review by a fresh reviewer on the most capable model, using the plan's Review Focus (5 items) with one line of evidence each, plus checks for security, privacy, data integrity (a v0 stored row still loads), accessibility, copy and the engine boundary.
2. The security chat re-reviews JUnit, fingerprints, classifier, exports and PWA; its findings are fixed or ruled.
3. Accessibility: axe on every new screen and dialog in both themes, a keyboard-only walkthrough, and one screen reader pass (NVDA on Windows) with notes.
4. Browsers: the e2e smoke flow runs on Chromium, Firefox and WebKit (install the extra browsers under the D: drive cache); list differences; check downloads, dialogs and IndexedDB behaviour for Safari risks.
5. Gate 3 checklist (spec 18): v1 done-when (works offline, accessibility pass done) and the real-data check published; list anything not met.
6. Critical and Important findings are fixed with tests that failed first; Minor findings are listed as deferred.
7. Release notes draft and the list of spec changes needed, handed to the Dev Ops chat. Version number, tag, merge and deploy are the Dev Ops chat's call.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-28 to DEV-45.
- Same process as DEV-07 and DEV-19: one fix pass, rulings and deferred minors reported to the planning chat.
- Not covered by earlier tests: Firefox and Safari.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, superpowers:requesting-code-review, security-review.

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
