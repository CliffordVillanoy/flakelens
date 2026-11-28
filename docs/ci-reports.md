# CI e2e reports (DEV-49, DEV-50)

Every trusted CI run of the `e2e` job writes a Playwright JSON report, scrubs and checks it, and keeps it as a build artifact. FlakeLens can import these reports, so they are a small real history of the app's own test suite. They are the input for a later real-data check of the flaky detector (DEV-44).

## What a run does

- In CI only, `playwright.config.ts` retries a failing test once, adds the `json` reporter (`test-results/report.json`) next to `list`, and records the git commit in the report. Locally nothing changes.
- A test that fails and then passes on the retry is marked `flaky` in the report. The job still passes, and the job summary lists those tests under "Flaky e2e tests (passed on retry)", with one warning annotation per test, so a retry never hides a problem. A test that fails twice still fails the job.
- Three steps follow `npm run e2e`, in this order: `scripts/scrub-report.ts` rewrites the report keeping only an allowlist, `scripts/verify-report.ts` checks the result, and the upload runs only if both passed. If the scrub or the verify step fails, the job fails (visibly) and nothing is uploaded.
- The artifact is named `e2e-report-<run number>-<attempt>`.

## Trusted runs only

- A pull request from a fork gets no scrub, no verify and no upload: a fork can change the tests and so fake the report. Runs on pushes, on manual runs and on pull requests from branches of this repository upload.
- Use only artifacts from `main` or from the owner's own branches for any analysis. Never analyse a report from anywhere else.
- Dependabot runs (`github.actor` is `dependabot[bot]`) upload nothing.
- Never trust `gitCommit.branch` inside the file: whoever controls a branch name controls it. Before using any artifact, check where it came from, and take only `main` or the owner's branches:

  ```powershell
  gh run view <run-id> --json headBranch,event,headSha,conclusion
  ```
- No workflow uses `pull_request_target` or secrets, the workflows have `contents: read` and nothing wider (Pages deploy has its own job-level `pages` and `id-token` permissions), and every third-party action is pinned to a commit SHA. `scripts/ci-config.test.ts` checks these.

## Where, and for how long

- Actions tab, open a run, section "Artifacts" at the bottom of the run page.
- Kept for 30 days. This repository is public, so a shorter life means less exposure if a scrub ever misses something. After 30 days the artifact is gone, so archive the ones you want (see "Keeping them").
- The `e2e` job runs on pull requests and on "Run workflow" (manual) only, not on every push to `main`. To get a report for `main`: Actions tab, workflow `ci`, "Run workflow", branch `main` (or `gh workflow run ci --ref main`).

## Download one

Use `gh run download` with your own login, on your own machine only. The token stays in `gh`: never paste it into a chat, a file or a commit. Downloads go into `.cache/ci-reports/` (git-ignored), and nothing from there is committed.

```powershell
gh run list --workflow ci --limit 10
gh run download <run-id> --name e2e-report-<run number>-<attempt> --dir .cache/ci-reports/<run number>
```

Then drop `report.json` into FlakeLens (Start page, Browse files).

## What is in a report, and who can see it

This repository is public, so the artifacts are public: anyone with a GitHub account can download them. The scrub is an allowlist: the output holds only the test tree (titles, repository-relative file paths, project names, ids), per attempt the status, duration, retry index, start time and error text, the config fields FlakeLens reads, and the commit hash, short hash, subject and branch. Everything else is dropped, including fields a later Playwright version might add. Free text is also passed through a secrets filter (tokens, key assignments, URLs with credentials) and emails and absolute paths are removed.

What the raw Playwright report holds, and the scrub removes: commit author and committer (name and email), the commit message body, the full source diff of the change (`gitDiff`, repeated under every project), absolute runner paths and the rest of the config. On a pull request the commit is a merge commit, so the raw report would carry a contributor's name and email. Do not put anything private into an e2e test title or error message.

### Limits and what stays public

- Each free-text field (title, error message, stack, subject, branch) is cut at 50,000 characters by the scrub.
- The report may not exceed 2 MB. When the suite grows past it, the verify step fails the job: that is the signal to raise the cap in `scripts/verify-report.ts` on purpose, not to bypass the check.
- The verify step also fails on any key name outside the allowlist, at any depth, so a new field from a Playwright update stops the upload until someone looks at it.
- The Playwright list-reporter output in the public job log is not scrubbed. It holds test names and error text only, but the log is public too.
- The kept commit subject and branch name can show a GitHub handle (a merge commit subject is "Merge <sha> into <sha>", a branch name is whatever the author chose). A handle is already public in a public repository. Accepted.

### Playwright upgrades

A test on a real scrubbed report fixture fails when the shape of the scrubbed output or its top-level keys change, so a Playwright or Dependabot bump shows the change in a pull request instead of leaking silently. Every Playwright version bump therefore also needs one manual look at a fresh artifact from that pull request (download it as above and read it) before the merge.

## Keeping them

Artifacts expire after 30 days. Plan: every 2 to 3 weeks, download the new reports into `.cache/ci-reports/` on the D: drive (`.cache/` is git-ignored). Run numbers are unique, so the folder only grows by new numbers: list what is there, then download the runs that are missing. The detector check (DEV-44) needs about three weeks of data, which 30 days plus this archive covers. A scheduled workflow that commits reports into the repository is not planned: it would put history in git and bring the report data into every clone.
