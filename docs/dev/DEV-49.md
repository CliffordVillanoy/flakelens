# DEV-49: CI collects the e2e JSON report on every run

**Status:** Merged (2026-11-28, PR #24 squashed, main 01fe386; check and e2e green; commits `f50c921` config, scrub, summary and upload workflow, flaky warnings). Result of criterion 4: the raw report holds the commit author and committer name and email, the commit body, the full source diff (`config.metadata.gitDiff`, about 20 KB, repeated per project) and absolute runner paths; Playwright repeats `gitCommit` under `config.projects[]` and `config.filteredProjects[]`. No secrets or environment variables. The first scrub missed the repeated copies and the diff, so the first real artifact (`e2e-report-51-1`) leaked them; Dev Ops did not merge that version, deleted that artifact and fixed the scrub to walk the whole report (28 script tests). Clean artifact `e2e-report-52-1` (run 46141209813, 45 KB): hash, short hash, subject, branch (shows HEAD on PR runs), public URLs, titles, durations only. Import check: 1 run, commit 93bffc9, browser chromium, no notices. e2e job 1m43 and 1m40 against 1m29 to 2m23 before (not a controlled A/B). Retries 1 doubles the time a failing e2e test takes to fail. e2e does not run on push to main: run the workflow manually or open a PR to get the next artifact.

**Goal:** FlakeLens's own CI starts recording per-test results (with retries on), so later versions have a small real history of the app's own e2e suite to check the detector on and to dogfood.

**Objectives:**
- Write the Playwright JSON report on every CI run and keep it as a build artifact.
- Turn retries on in CI so a flaky pass is recorded as flaky, not hidden or failed.

**Scope:** CI/CD (Dev Ops chat owns it; the dev chat advises on the Playwright config).

**Acceptance Criteria:**
1. In CI (not locally unless the dev chat prefers) the e2e job uses the reporters `list` plus `json` (output to a fixed file such as `test-results/report.json`), and `retries` of 1 in CI. Playwright's `captureGitInfo` (commit) is on in CI so the commit is in the report. The local `npm run e2e` stays as fast and strict as today.
2. The JSON report is uploaded with an artifact action on every run, success or failure (`if: always()`), named with the run number, with the longest retention GitHub allows for the plan. Pin the action to a commit SHA like the other actions.
3. A passing run that needed a retry must be visible: add the list of flaky tests (Playwright marks them `flaky`) to the job summary, so a retry never hides a problem silently. Real failures still fail the job. `check` and `e2e` stay the required checks, with the same names.
4. No secrets, tokens or personal data in the report: confirm it holds only test titles, paths in the repo, durations, error text and the commit. Artifacts of this public repository are public; say so in the report back.
5. The runtime of `e2e` grows by no more than 10 seconds.
6. Short note in `docs/` (Dev Ops decides the file, for example the CI notes) saying where the reports are, how long they are kept, how to download one, and that they are the input for a later real-data check. Because artifacts expire, record the plan to archive them (for example the owner downloads the reports from time to time into `.cache/` on the D: drive), or propose a better way.
7. The importer must read one of the reports: the dev chat (or Dev Ops) drops a downloaded report into FlakeLens and confirms it imports, with the commit shown. Report the result.

**Details:**
- Owner decision, 2026-11-28: start collecting now; it is cheap and gives real data later. This is not the DEV-44 real-data check by itself: a few dozen mostly green runs have no flaky labels, so it proves nothing about the detector yet. Known real flakes in the suite to watch: the "corrupt stored row" test in `e2e/import.spec.ts` and runs that overlapped on the preview port.
- Needs first: nothing.
- Playwright config is `playwright.config.ts` at the repo root (the lab has its own). Any change to it is a small code change: the dev chat prepares it on the branch Dev Ops names.

**Limitations/Restrictions:**
- Version control and every CI/CD change belong to the Project Dev Ops chat.
- No new network calls from the app, no accounts or secrets, no new dependency.
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- The workflow change is merged through a PR with green `check` and `e2e`; the first run on main shows the artifact; the report back names the run and the artifact.
