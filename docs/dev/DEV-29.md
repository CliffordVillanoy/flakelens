# DEV-29: v0 deferred minors cleanup

**Status:** To do

**Goal:** Close the nine minor findings deferred from the v0 review, each with a test.

**Objectives:**
- Fix or consciously close each deferred minor listed in `docs/dev/README.md` (DEV-19 and DEV-21 notes).

**Scope:** Fix or refinement (frontend).

**Acceptance Criteria:**
1. Copy summary: every field written by `summaryText` goes through `cleanText`, so a newline in a test name cannot forge lines in the copied text (test with a newline and a leading `=`).
2. Failure text: `stripAnsi` removes all ANSI escape sequences (CSI and OSC forms), not only colour codes, with a bounded pattern and a timing test.
3. Verify the zod `Function()` finding is closed by DEV-20 (`jitless` in the worker): grep the built worker for `new Function`; if it is gone, mark closed in the report.
4. A failed sample load (network error, bad manifest, missing file) shows an inline error with a Retry button instead of an unhandled rejection (interim key `sample.fail`); test and e2e with a blocked `sample/manifest.json`.
5. `downloadFile` revokes the object URL after a short delay (not right after the click) so Safari downloads work; test with fake timers.
6. The result-count live region announces after typing settles (debounce about 500 ms), not on every keystroke; test.
7. `Tests.tsx` no longer runs the `route.query` effect on every render (stable dependency); test that it runs once per real change.
8. The address bar uses `?status=unproven` for the Unproven tab; an old `?status=suspect` link still works (test both).
9. Loaded data shows import progress and the result banner for files dropped there, as Start does.
10. Optional, only if small: parse one file per worker call so peak memory is bounded by one file, not the 200 MB total (DEV-21 residual). If not done, say so.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing.
- Source: `docs/dev/README.md`, deferred minors from DEV-19 and the DEV-21 re-review.
- Unit tests per item; one e2e for the sample-load error and the Loaded data drop.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion.

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
