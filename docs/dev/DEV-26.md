# DEV-26: Pages deploy: stop the artifact timing failure

**Status:** To do

**Goal:** The GitHub Pages deploy succeeds on the first try, so a normal push publishes without a manual re-run.

**Objectives:**
- Split `.github/workflows/pages.yml` into a `build` job and a `deploy` job.
- Prove the cause and the fix from the run logs.

**Scope:** Enhancement (CI, no app code).

**Acceptance Criteria:**
1. Cause recorded in the report: in `deploy-pages`, `Found 0 artifact(s)` appears about 2 seconds after `upload-pages-artifact` finishes, while the run's artifact list shows 1 artifact afterwards. Evidence: runs 45019832117 (b99dce4, first attempt) and 45020801439 (dbdfbcc) failed this way; the deploy of 1afaeb6 and the re-run of 45019832117 succeeded. Both failing runs deployed within the same second as the upload, in one job.
2. `pages.yml` has two jobs: `build` (checkout, setup-node with npm cache, `npm ci`, `npm run build`, `actions/upload-pages-artifact`, `permissions: contents: read`) and `deploy` (`needs: build`, `environment: github-pages` with the page URL output, `permissions: pages: write, id-token: write`, `actions/deploy-pages`). Least privilege stays: only `deploy` gets the write and token permissions.
3. All `uses:` stay pinned to the same commit SHAs with version comments; triggers, path filters (`docs/eval/**` rule included), `concurrency: pages` with `cancel-in-progress: false`, and timeouts stay as they are.
4. `scripts/ci-config.test.ts` gains assertions (test first, seen failing): the workflow has `build` and `deploy` jobs, `deploy` needs `build`, only `deploy` has `pages: write` and `id-token: write`, and every `uses:` is a 40-character SHA.
5. After the user pushes: the next `pages` run goes green without a re-run. The planning chat checks this. If it still fails the same way, the report must say so and propose a short retry step or a wait before `deploy-pages`.

**Details:**
- This is the pattern in GitHub's own Pages starter workflows. A job boundary adds a few seconds before the deploy starts, and the artifact becomes visible to the deploy step in that time.
- Files: `.github/workflows/pages.yml`, `scripts/ci-config.test.ts`. Do not touch `ci.yml` or any app code.
- The live site already serves the latest app code (the only commits after the last deployed build change Dependabot settings and docs), so there is no urgency and nothing to re-deploy by hand.

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Branch `fix/pages-two-jobs` from `main`. Plain commit messages, no Claude attribution. Ask the user directly in the dev chat before pushing, as before. No merge without the user's approval.
- No new dependencies.

**Definition of Done:**
- Tests written first and seen failing, then passing; `npx vitest run`, `npm run typecheck`, `npm run lint` green.
- The workflow file parses (YAML) and keeps every cost and security setting from DEV-09, DEV-18 and DEV-22.
- Committed on `fix/pages-two-jobs`; development report sent to the planning chat.
