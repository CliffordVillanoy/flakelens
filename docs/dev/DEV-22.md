# DEV-22: Security C: Dependabot and a CI audit step

**Status:** To do

**Goal:** Pinned GitHub Actions and npm packages stay current, and a known-vulnerable runtime dependency fails CI.

**Objectives:**
- Add `.github/dependabot.yml` for `npm` and `github-actions`, weekly, grouped.
- Add an `npm audit` step to the CI check job.

**Scope:** Enhancement (CI, no app code). Finding: S-6 (Info).

**Acceptance Criteria:**
1. `.github/dependabot.yml` is valid and covers `package-ecosystem: npm` and `github-actions` at `/`, `schedule.interval: weekly`, grouped updates (one PR per ecosystem per week), a small `open-pull-requests-limit`, and a plain commit-message prefix such as `chore(deps)` (no Claude attribution).
2. Dependabot keeps SHA pins in workflow files (it updates the SHA and the version comment); say in the report how you checked the config format.
3. `ci.yml` gets one step `npm audit --omit=dev --audit-level=high` after `npm ci`, with `timeout-minutes` unchanged. It exits 0 on the current tree (run it and paste the result).
4. The cost rules from DEV-09 stay: path filters, concurrency, pinned SHAs, `permissions: contents: read`.

**Details:**
- Source: `docs/security/review-2026-11-22.md` finding S-6.
- Dependabot PRs trigger CI like any pull request; weekly and grouped keeps that to about two runs a week. Dependabot only starts after this file reaches GitHub, so the first PR cannot be checked until after the push; note it in the report.
- Spec: section 16 (CI on a $0 budget). No new dependency.

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
