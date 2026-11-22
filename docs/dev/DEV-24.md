# DEV-24: Security D: frame guard and referrer policy (optional)

**Status:** Optional (accepted risk for now; start only if the user asks)

**Goal:** Reduce clickjacking risk on GitHub Pages, which cannot set response headers. Optional: the owner accepted S-1 and S-8 while hosting stays on Pages.

**Objectives:**
- Add a no-referrer policy and a frame guard.
- Record the full header set for when hosting moves.

**Scope:** Frontend (hardening, optional). Finding: S-1 (Low), S-8 (Info).

**Acceptance Criteria:**
1. `index.html` has `<meta name="referrer" content="no-referrer">` (the built page too).
2. When the page runs inside another page's frame, it hides itself (`window.top !== window.self` hides the document) and shows nothing clickable. Unit test with a stubbed `window.top`; e2e: load the built app inside an iframe served from another local origin and assert nothing is visible or clickable.
3. Top-level use is unchanged: the whole unit and e2e suites stay green.
4. `docs/security/hosting-headers.md` (or a section in the security report) lists the headers to set when hosting moves to a platform that supports them: CSP as a real header with `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and the shared-origin note (S-8).

**Details:**
- Source: `docs/security/review-2026-11-22.md` findings S-1 and S-8, and the owner decision of 2026-11-22 (GitHub Pages only for now, hosting move planned). Do not start this ticket until the user asks for it; it is listed so the work is ready.
- The CSP stays a meta tag on Pages; `frame-ancestors` cannot be set that way.
- No new dependency.

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
