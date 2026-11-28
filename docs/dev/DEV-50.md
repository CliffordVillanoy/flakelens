# DEV-50: Harden the CI report scrub (allowlist, secrets, trusted runs)

**Status:** In progress (owner priority; branch `ci/dev-50-scrub-allowlist`; security review of the working tree done 2026-11-28 with merge conditions below; owner decides on the merge)

**Goal:** The report that CI uploads on every run (DEV-49) can never again leak private data, and only trusted runs feed any later analysis.

**Objectives:**
- Replace the blacklist scrub with an allowlist.
- Scan error text for secrets.
- Prove the artifacts are clean, and keep them clean when Playwright changes.

**Scope:** CI/CD and scripts (Dev Ops owns it; the dev chat reviews the scrub code and tests).

**Background:** The first DEV-49 artifact (`e2e-report-51-1`) was public with the commit author and committer name and email and a 20 KB source diff. The first scrub removed known fields one by one and missed Playwright's repeated copies. Dev Ops deleted that artifact and fixed the scrub (28 tests), but a blacklist can miss the next field. Risk list from the planning chat, 2026-11-28.

**Acceptance Criteria:**
1. Allowlist: `scripts/scrub-report.ts` builds the output from only these parts of the report, and drops everything else by default: the test tree (suite and spec titles, file paths made repo-relative, project names, test ids), per test and attempt: status, duration, retry index, start time, error message and stack text; the config fields FlakeLens reads (`config.shard`, project names, `defaultBrowserType`); and the commit hash, short hash, subject and branch. Unknown fields, new Playwright fields, `config.metadata.gitDiff`, author, committer, body, environment, `rootDir`, `configFile` and any absolute path never pass. The report must still import into FlakeLens with the commit shown.
2. Secrets in text: every kept free-text value (titles, error message, stack, subject, branch) goes through a secrets pass equivalent to `redactSecrets` in `src/engine/group/normalize.ts` (Bearer values, token or key assignments, long key-like runs, URLs with credentials), plus emails and absolute paths. Reuse the engine function if it can run in the script without a new dependency; otherwise share the patterns and test both. Every pattern is bounded or linear and has a timing test.
3. Fail closed: the upload step runs only if the scrub succeeded AND a verification step on the scrubbed file passes: no `@` that looks like an email (noreply addresses too), no `/home/`, `/Users/`, `C:\` or `runner` path prefix, no `gitDiff`, `author`, `committer`, no unknown top-level keys, size under a cap (for example 2 MB). A failed check fails the job (real, visible) and uploads nothing. Add tests with a deliberately dirty fixture (author, diff, absolute paths, fake token `FAKE-TOKEN-NOT-A-SECRET-000000`) that must be cleaned or must stop the upload.
4. Playwright upgrades: a test with a REAL Playwright report fixture (committed, itself scrubbed) fails if the allowlist output changes shape or a new top-level field shows up, so a Playwright or Dependabot update shows the change in a PR instead of silently leaking. Note in `docs/ci-reports.md` that every Playwright version bump needs this test and one manual look at a fresh artifact.
5. Existing artifacts: list every `e2e-report-*` artifact in the repository now, download and check each with the verification step, and delete any that fail. Report the count and the result. Retention is 30 days (owner decision 2026-11-28, down from 90): less public exposure, and DEV-44 needs about 3 weeks of data, so the owner archives the verified reports into `.cache/ci-reports/` on the D: drive every 2 to 3 weeks (the schedule goes in `docs/ci-reports.md`).
6. Trusted runs only: the upload step runs on pushes and on pull requests from branches in this repository; fork PRs get no upload (fork PRs can change the tests and so fake the report). `docs/ci-reports.md` says: only artifacts from `main` or the owner's own branches may be used for any analysis. Confirm no workflow uses `pull_request_target`, and PR runs get no secrets; list the workflow permissions (least privilege: `contents: read`, nothing wider) and confirm third-party actions are pinned to a commit SHA.
7. Credentials: `docs/ci-reports.md` says the download uses `gh run download` with the owner's own login, on the owner's machine only; the token is never pasted into a chat or committed; downloads go to `.cache/ci-reports/` (git-ignored; confirm the ignore rule exists); nothing from them is committed.
8. Retention and run on main: e2e does not run on push to `main`; add a manual `workflow_dispatch` path (or document the command) so the owner can create a report from `main` for DEV-44.
9. Security chat review: Dev Ops asks the security chat to review `scripts/scrub-report.ts`, the verification step and the workflow before merge (also point them at `xml.ts` from DEV-43, which is still unreviewed). Report their findings to the planning chat.
10. Verify checks nested keys (security review, 2026-11-28): `verify-report.ts` holds the set of allowed key names (the keys the scrub emits: version, shard, metadata, gitCommit, hash, shortHash, subject, branch, os, projects, filteredProjects, id, name, use, defaultBrowserType, suites, title, file, line, column, specs, tests, tags, ok, projectId, projectName, expectedStatus, status, results, duration, retry, startTime, error, errors, message, stack, stats, expected, skipped, unexpected, flaky, current, total) and fails on any other key at ANY depth. Test with `config.metadata.gitCommit.committerName = "Jane Doe"` and `config.metadata.actor = "janedoe"`: both must fail verify (a bare name has no `@`, so the email check cannot see it).
11. Provenance: `gitCommit.branch` inside the file is attacker-controlled, never trust it. Before using any artifact: `gh run view <id> --json headBranch,event,headSha,conclusion` and take only `main` or the owner's branches. Write this in `docs/ci-reports.md`. Skip the upload when `github.actor` is `dependabot[bot]`.
12. `ci-config.test.ts` asserts that the upload step's `if` contains `steps.verify.outcome == 'success'`, that the verify step requires scrub success, and that `retention-days` is 30.
13. The 2 MB cap fails the job when the suite grows: document that this is the signal to raise the cap deliberately.
14. Document in `docs/ci-reports.md` that the Playwright list-reporter output in the public job log is not scrubbed (test names and error text only, but public), and that the kept commit subject and branch name (for merge-commit runs "Merge sha into sha" or a branch name) can show a GitHub handle, which is already public in a public repo (accepted).
15. The real-report fixture test must contain the incident shape: `gitCommit.author` and `committer` and `gitDiff` under `config.metadata`, `projects[]` and `filteredProjects[]`; add it if the fixture is only synthetic.

**Merge conditions (security chat, 2026-11-28):** (a) commit exactly what was reviewed: `scripts/scrub-report.ts` (allowlist), `tsconfig.json` and `scripts/verify-report.ts` were uncommitted or untracked at HEAD 602d2ab while the committed `ci.yml` already calls `verify-report.ts`; the reviewed files are `scrub-report.ts` sha256 starting ca56d5e5d208915f and `verify-report.ts` starting e13914da79e75276 (tell the security chat if either changes materially); (b) the PR's own CI run must be green, which runs scrub, verify and upload once; nobody downloads that artifact until the security chat has looked at it; (c) criterion 15; (d) after the merge the owner downloads the first main artifact with `gh` on their own machine and the security chat reads it; until then analyse nothing from other runs.

**Details:**
- Needs first: DEV-49 (merged, PR #24). Priority over DEV-45 and DEV-44.
- Files: `scripts/scrub-report.ts` and its tests, `scripts/verify-report.ts` (or part of the scrub), `.github/workflows/ci.yml`, `docs/ci-reports.md`, a committed real scrubbed report fixture.
- The scrub and the workflow are CI changes (Dev Ops). The dev chat may be asked for the pieces that are code, on the branch Dev Ops names.

**Limitations/Restrictions:**
- Version control and every CI/CD change belong to the Project Dev Ops chat. Owner approval in the Dev Ops chat before push and merge.
- No new dependency, no new network calls from the app, no secrets.
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- PR merged with green `check` and `e2e`; the first run after the merge uploads an artifact that passes the verification step; the existing artifacts were checked; the security review result is reported to the planning chat.
