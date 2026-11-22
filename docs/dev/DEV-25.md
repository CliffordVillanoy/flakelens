# DEV-25: Dependabot: stop major bumps the toolchain cannot take

**Status:** Done locally (2026-11-22, commit `20d20ff` on `fix/dependabot-majors`; 287 unit tests pass; PR #1 closed). Not pushed or merged yet.

**Goal:** Dependabot's weekly pull requests only carry updates the project can actually install, so a red PR means a real problem.

**Objectives:**
- Close the first Dependabot PR (typescript 6.0.3 to 7.0.2) and stop Dependabot from proposing it again for now.
- Stop major bumps from riding inside the grouped weekly PR.

**Scope:** Enhancement (CI configuration, no app code).

**Acceptance Criteria:**
1. Cause recorded in the report: PR #1 fails at `npm ci` in both the `check` and `e2e` jobs with `ERESOLVE`, because `typescript-eslint@8.73.0` has the peer range `typescript >=4.8.4 <6.1.0` and cannot take TypeScript 7.
2. `.github/dependabot.yml` ignores `typescript` major updates (`ignore` with `dependency-name: "typescript"` and `update-types: ["version-update:semver-major"]`), with a comment saying why and when to remove it (when `typescript-eslint` supports TypeScript 7).
3. In the npm ecosystem the grouped PR carries only minor and patch updates (`groups.npm.update-types: ["minor", "patch"]`). Major updates come as their own single PRs, so one hard major cannot block the rest. The `github-actions` group follows the same rule.
4. PR #1 is closed with a short comment and no merge (`gh pr close 1 --comment "..."`). If the dev chat cannot close it (permissions), report that and the user closes it on GitHub.
5. `scripts/ci-config.test.ts` gains assertions for the ignore rule and the `update-types` lists (test first, seen failing), and the YAML keys are checked against the documented Dependabot v2 options as in DEV-22.
6. The main-branch `ci` run stays green; the doc-only path filters are unchanged.

**Details:**
- Found by the first Dependabot run after the 2026-11-22 push (PR #1, checks `check` and `e2e` both red). DEV-22 ruling 1 warned that a major bump could land in the same PR as minors.
- A TypeScript 7 migration is a separate piece of work: it needs a `typescript-eslint` release that supports it, then a ticket of its own. Not in this ticket.
- Files: `.github/dependabot.yml`, `scripts/ci-config.test.ts`.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Branch `fix/dependabot-majors` from `main`. Plain commit messages, no Claude attribution. The push needs the user's approval, asked directly in the dev chat, as before. No merge without the user's approval.
- No new dependencies, no app code changes.
- The CI cost settings from DEV-09 and the audit step from DEV-22 stay.

**Definition of Done:**
- Tests written first and seen failing, then passing; `npx vitest run`, `npm run typecheck`, `npm run lint` green.
- Committed on `fix/dependabot-majors`; development report sent to the planning chat.
- After the push: no new red Dependabot PR on the next weekly run (checked later by the planning chat).
