# CI e2e reports (DEV-49)

Every CI run of the `e2e` job writes a Playwright JSON report and keeps it as a build artifact. FlakeLens can import these reports, so they are a small real history of the app's own test suite. They are the input for a later real-data check of the flaky detector (DEV-44).

## What a run does

- In CI only, `playwright.config.ts` retries a failing test once, adds the `json` reporter (`test-results/report.json`) next to `list`, and records the git commit in the report. Locally nothing changes.
- A test that fails and then passes on the retry is marked `flaky` in the report. The job still passes, and the job summary lists those tests under "Flaky e2e tests (passed on retry)", so a retry never hides a problem. A test that fails twice still fails the job.
- The report is uploaded on every run, passed or failed, as the artifact `e2e-report-<run number>-<attempt>`.

## Where, and for how long

- Actions tab, open a run, section "Artifacts" at the bottom of the run page.
- Kept for 90 days, which is the longest GitHub allows. After that the artifact is gone.
- The `e2e` job runs on pull requests and on "Run workflow" (manual) only, not on every push to `main`. To get a report for `main`, run the `ci` workflow by hand on `main`.

## Download one

```powershell
gh run list --workflow ci --limit 10
gh run download <run-id> --name e2e-report-<run number>-<attempt> --dir .cache/ci-reports/<run number>
```

Then drop `report.json` into FlakeLens (Start page, Browse files).

## What is in a report, and who can see it

This repository is public, so the artifacts are public: anyone with a GitHub account can download them. A report holds test titles, file paths inside the repository, durations, error text and the git commit (hash, short hash, subject and branch). It holds no secrets, tokens or environment values. Do not put anything private into an e2e test title or error message.

Playwright also writes the commit author and committer (name and email), the full commit message body, the full source diff of the change (`gitDiff`, repeated under every project) and absolute runner paths into the raw report. On a pull request the commit is a merge commit, so that would be a contributor's name and email in a public file. `scripts/scrub-report.ts` therefore removes author, committer, body and the diff everywhere in the report, and turns absolute paths into repository-relative ones, before the upload. If the scrub fails, nothing is uploaded. FlakeLens needs only the hash, so it still shows the commit.

## Keeping them

Artifacts expire after 90 days. Plan: every few weeks, download the new reports into `.cache/ci-reports/` on the D: drive (`.cache/` is git-ignored). Run numbers are unique, so the folder only grows by new numbers: list what is there, then download the runs that are missing. A scheduled workflow that commits reports into the repository is not planned: it would put history in git and bring the report data into every clone.
