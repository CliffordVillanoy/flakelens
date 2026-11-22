# DEV-23: Security E: neutralise bare URLs in the Markdown export

**Status:** Done (commit `20139d5`), then reopened by the security re-review: quadratic regex in `breakAutolinks` (scheme length unbounded); fix in progress.

**Goal:** A test name or message from a hostile report cannot become a clickable link in a pasted triage summary.

**Objectives:**
- Add one shared helper in `src/ui/lib/safeText.ts` that breaks auto-linking, and call it from `escapeMd`.
- Prove it with a real GitHub-style Markdown renderer in tests.

**Scope:** Frontend (shared helper). Finding: S-7 (Info).

**Acceptance Criteria:**
1. `escapeMd` output rendered with a GFM renderer (`marked` with `gfm: true`) contains no `<a` element for inputs containing `http://x.test`, `HTTPS://X.TEST`, `ftp://x.test`, `www.x.test`, `mailto:a@x.test` and `a@x.test`.
2. The visible text stays readable: stripping the invisible joiner characters gives back the original text (tested).
3. Invisible characters are written as escapes in source (for example `\u200b`), never typed raw (the editing tool rewrites raw separators; see the DEV-17 note in `docs/dev/README.md`).
4. All existing `escapeMd` tests still pass, including leading `= + - @` and control-character handling.
5. `cleanText`, `csvCell` and the JSON export are unchanged (the risk is Markdown auto-linking only).

**Details:**
- Source: `docs/security/review-2026-11-22.md` finding S-7. Code: `src/ui/lib/safeText.ts` (`escapeMd`), used by `topFlakyMarkdown` in `src/ui/data/selectors.ts`.
- Suggested approach (your call if a test shows better): put a zero-width space after the scheme colon (`:\u200b//`), after `www`, and before the domain part of an email; then confirm with the renderer test.
- New dev dependency: `marked` (MIT), used only in tests. Report version and licence.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion, security-review.

**Limitations/Restrictions:**
- Branch `fix/security-hardening` (create it from `main` in DEV-20; DEV-21 to DEV-23 go on the same branch). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge: both need the user's approval.
- No new network calls, accounts or secrets (the app stays on GitHub Pages for now).
- Visible text only through `src/ui/copy.ts` (interim keys are listed in the ticket; they go to the UI/UX chat for confirmation).
- The security chat re-reviews each fix when asked; do not start the next ticket before the planning chat sends it.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` green; `npm run e2e` green where the ticket touches the app.
- Committed on `fix/security-hardening`; development report sent to the planning chat.
