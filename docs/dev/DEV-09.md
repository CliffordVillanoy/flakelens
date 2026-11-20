# DEV-09: CI cost settings

**Status:** To do

**Goal:** Spend as few GitHub Actions minutes as possible on a free GitHub account, without letting a broken change through.

**Objectives:**
- Stop the double run on pull-request commits.
- Skip CI for doc-only changes.
- Cap a hung job at 10 minutes.
- Catch failures locally before they reach CI, with a pre-push hook.

**Scope:** Enhancement (CI and tooling).

**Acceptance Criteria:**
1. `.github/workflows/ci.yml` triggers on `push` to `main` only, plus `pull_request`.
2. Commits that change only `docs/**`, `**/*.md`, `.impeccable/**`, `DESIGN.md` or `PRODUCT.md` do not trigger CI, on both triggers.
3. Exception: changes to `docs/eval/**` still trigger CI, because `scripts/eval-lab.test.ts` reads the committed `docs/eval/lab-detection.md`. Use a `paths` list with `!` negations (last match wins) if `paths-ignore` cannot express this.
4. The job has `timeout-minutes: 10`.
5. A committed pre-push hook runs `npm run typecheck && npm run lint && npm test` and blocks the push when any of them fails.
6. The hook is switched on by `npm install` (an npm `prepare` script that sets `git config core.hooksPath .githooks`), with no new dependency.
7. The pinned action SHAs, `permissions: contents: read`, `concurrency` and the npm cache stay as they are.

**Details:**
- Current file: `.github/workflows/ci.yml` (one job, `ubuntu-latest`, about 1 minute per run).
- Hook file: `.githooks/pre-push` (POSIX `sh`; Git for Windows runs it through Git Bash). It must be committed with LF line endings (`.gitattributes` already sets `eol=lf`).
- A single commit can still skip CI with `[skip ci]` in its message; mention this in a short comment in `ci.yml`.
- Validate the workflow file: YAML parses, and the trigger and paths blocks are correct (for example with `npx --yes @action-validator/cli .github/workflows/ci.yml` if it is free and works offline, otherwise a careful read plus a YAML parse).

**Skills/Plugins:** superpowers:verification-before-completion, ponytail (smallest change).

**Limitations/Restrictions:**
- No new npm dependencies (no husky, no lint-staged).
- No GitHub remote yet, so CI cannot run for real; check trigger behaviour by reading the docs-backed rules, and test the hook locally.
- Work on `feat/v0-engine` (not merged yet; DEV-07 merge approval is pending). Commit only the task files. No push, no merge.

**Definition of Done:**
- Hook proven both ways: a deliberate type error makes `git push --dry-run` (or running `.githooks/pre-push` directly) fail, and a clean tree passes. Revert the deliberate error.
- `npm run typecheck`, `npm run lint` and `npm test` green.
- Committed on `feat/v0-engine`; development report sent to the planning chat.
