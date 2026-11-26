# FlakeLens UX 04: UX Copy

Drafted 2026-11-19 in the UI/UX chat. Covers every string on the 6 MVP wireframe boards plus the import messages in spec section 9.1. Spec 13.2 asks for all status notes in one file. The catalog in section 4 is that file's draft. Its keys are ready to lift into code.

## 1. Voice and tone

**Voice (always):** plain, calm, exact. A senior SDET explaining over your shoulder.

| Rule | Do | Don't |
|---|---|---|
| Number first in evidence | "4 of 9 commits had both a pass and a fail" | "This test seems to be unstable" |
| Claim only what the data shows | "Likely cause", "points to" | "The cause is", "This test is broken" |
| Say what happened, then what to do | "This file isn't a Playwright JSON report. Choose the JSON report from your CI run." | "Invalid file." |
| Never blame the user | "3 results were not imported" | "You uploaded bad data" |
| Contractions are fine | "isn't", "can't" | "is not" in short UI strings |
| Buttons are a verb plus an object | "Clear all data", "Copy summary" | "OK", "Submit", "Yes" |
| British spelling (as in the spec) | "analyse", "analysed" | "analyze" |
| Sentence case everywhere | "Copy error message" | "Copy Error Message" |
| No exclamation marks, emoji or jokes | "Good news." | "Woohoo!" |

**Tone by moment:**

| Moment | Tone | Example |
|---|---|---|
| First visit | Inviting, short | "Find your flaky tests" |
| Evidence | Neutral, factual | "Passed on retry in 3 of 12 runs" |
| Partial import | Calm, specific | "211 tests imported. 3 results were not imported." |
| Failure | Helpful, no alarm, red only for real failures | "This file couldn't be read. It may be cut off." |
| Destructive | Serious, exact scope | "This deletes 3 files and 12 runs from this browser. You can't undo this." |
| Empty result | Reassuring | "Good news. More runs make this more certain." |

## 2. Glossary (one term per thing)

| Term | Means | Never call it |
|---|---|---|
| **Run** | One CI run: one execution of the test suite | build, job, session |
| **Attempt** | One try of one test inside a run. Retries are extra attempts | run, execution |
| **Retry** | A second or later attempt in the same run | rerun (that means a new run) |
| **Commit** | The code version a run tested | version, build |
| **Mixed commit** | A commit where the test both passed and failed | flaky commit |
| **Flaky** | Different results on the same commit | unstable, broken |
| **Unproven** | Mixed results, but never on the same commit. Could be a real bug | maybe flaky, unknown |
| **Failing** | Fails almost every run (95% or more). Likely a real bug | broken, red |
| **Stable** | No sign of flakiness in the loaded runs | passing, green |
| **Not enough data** | Too little history to judge | No data, unknown |
| **Wasted time** | Minutes of failed attempts on commits where the test also passed | lost time, cost |
| **Flakiness score** | 0 to 100. How strongly the evidence points to flakiness | score (alone), confidence |
| **Flip rate** | How often the result switched between pass and fail from one attempt to the next | flip ratio |
| **Not imported** | A result in a file that was left out because it was unclear | skipped |
| **Skipped** | Only the test status set by the test runner (shown as a hollow circle) | anything about imports |
| **Sample data** | The built-in demo runs. Never stored, never mixed with your files | demo, test data |
| **Your files** | Reports the user added | uploads (nothing is uploaded) |

**Two changes the spec needs (send to the planning chat):**
1. Spec 9.1 says "skipped" for records left out of an import. That clashes with Playwright's own "skipped" test status. This doc uses **"not imported"**.
2. Spec 13 labels the gray status "No data", and spec 13.2 says "Not enough data". This doc uses **"Not enough data"**.

## 3. Message rules

- **Plurals:** use ICU plural forms, never "test(s)". For example: `{count, plural, one {# test} other {# tests}}`.
- **Variables:** keep numbers and names as variables in whole sentences, so translators can reorder them. Never glue fragments together.
- **Test names and file names:** render as plain text. Long names truncate with an ellipsis in tables and show in full in the panel and on hover.
- **Accessible names:** must match the visible label. An icon-only button gets the action as its name ("Close panel").

## 4. String catalog

### Global header

| Key | Copy |
|---|---|
| `app.name` | FlakeLens |
| `header.sampleTag` | Sample data |
| `header.dataChip` | Retired 2026-11-20. Now `health.subtitle`: "{tests} tests · {runs} runs" plus the link `health.notImported`: "{n} results not imported" (Tests), and the Loaded data lead |
| `header.privacy` | Nothing leaves this browser |
| `header.privacy.hint` | FlakeLens makes 0 network requests unless you turn on a cloud provider. |
| `header.addFiles.sample` | Add your files |
| `header.addFiles` | Add files |
| `header.leaveSample` | Retired 2026-11-20. Now `tests.banner.exitSample`: "Exit sample" link at the end of the sample banner |
| `header.clearAll` | Clear all data |
| `header.theme.toLight` / `toDark` | Icon only: sun on dark, moon on light (accessible name and tooltip: "Switch to light theme" / "Switch to dark theme") |
| `header.help` | ? (accessible name: "Keyboard shortcuts and help") |

### Start (no data)

| Key | Copy |
|---|---|
| `start.title` | Find your flaky tests |
| `start.lead` | A flaky test passes and fails on the same code. Drop your test reports to rank them. | Updated 2026-11-26 (simplification pass) |
| `start.drop.title` | Drop Playwright JSON reports here |
| `start.drop.hint` | More runs give better results. | Updated 2026-11-26 (simplification pass) |
| `start.browse` | Browse files |
| `start.sample` | Try sample data |
| `start.privacy` | Your files stay in this browser. Nothing is uploaded. |
| `start.help.title` | How do I get a Playwright JSON report? |
| `start.help.step1` | In CI, run your tests with the JSON reporter and save the file as an artifact: |
| `start.help.command` | `npx playwright test --reporter=json > results.json` |
| `start.help.step2` | Then download that file from your last 5 to 10 CI runs and drop them all here at once. |
| `start.help.oneRun` | Only one run? Turn on retries, or add `--repeat-each=5` once, so a single run already shows flakiness. |

### Import progress and results (spec 9.1, every case)

| Key | Case | Copy |
|---|---|---|
| `import.reading` | Parsing | Reading {count, plural, one {# file} other {# files}}… |
| `import.file.done` / `waiting` | Per file | Done / Waiting |
| `import.cancel` | Over 1 s | Cancel import |
| `import.success` | Valid file | Imported {tests} tests from {runs} runs. |
| `import.added` | Adding to existing data | Added {newRuns} runs. Now {tests} tests from {runs} runs. |
| `import.rankChange` | Ranking changed | {count, plural, one {# new Flaky test} other {# new Flaky tests}} since your last import. |
| `import.partial` | Some records bad | Imported {tests} tests from {runs} runs. {count, plural, one {# result was} other {# results were}} not imported. |
| `import.partial.noStatus` | Missing status | {count, plural, one {# result had} other {# results had}} no status: "{test}" (run {run}) |
| `import.partial.noName` | Missing name | {count, plural, one {# test had} other {# tests had}} no name (run {run}, position {pos}) |
| `import.partial.badDuration` | Unreadable duration | {count} results had an unreadable duration. They were kept without it. |
| `import.dupeIds` | Duplicate IDs | {count} tests shared a name. They were told apart by project name and position. |
| `import.dupeRun` | Same run twice | This run was already loaded, so it wasn't counted twice. |
| `import.noCommit` | Missing metadata | No commit info found in {file}. Evidence across commits will be limited. |
| `import.fail.format` | Wrong format | {file} wasn't imported. It isn't a Playwright JSON report. JUnit XML support is planned for a later version. |
| `import.fail.unreadable` | Empty or truncated | {file} couldn't be read. It may be cut off. Try downloading it again. |
| `import.fail.tooBad` | More than half bad | {file} wasn't imported. Too much of it was unclear to rank tests reliably. |
| `import.fail.tooLarge` | Too large or deep | {file} is larger than the {limit} limit. Try a file with fewer runs. |
| `import.others` | Mixed result | {count, plural, one {# other file} other {# other files}} imported. You can drop another file here. |
| `import.viewNotices` | Link | View all notices |
| `import.downloadList` | Button | Download not-imported list |
| `import.formatHelp` | Link | Which format do I need? |

Hostile content needs no message. It is imported as plain text (spec 9.1).

### Leave sample dialog

| Key | Copy |
|---|---|
| `leaveSample.title` | Leave sample data? |
| `leaveSample.body` | Your {count, plural, one {file is} other {# files are}} analysed on {count, plural, one {its} other {their}} own. | Updated 2026-11-26 (simplification pass) |
| `leaveSample.stay` | Stay in sample |
| `leaveSample.confirm` | Analyse my files |

### Tests (ranked list)

| Key | Copy |
|---|---|
| `tests.h1` (visually hidden) | Tests ranked by fix priority |
| `tests.banner.sample` | Sample data. Start with the top 3 Flaky tests. | Updated 2026-11-26 (simplification pass) |
| `tests.filter.label` | Filter by status |
| `tests.filter.all` / `flaky` / `suspect` / `failing` | All / Flaky / Unproven / Failing |
| `tests.wasted.title` | Wasted CI time | Updated 2026-11-26 (simplification pass) |
| `tests.wasted.estimate` | + ~{min} min possible | Updated 2026-11-26 (simplification pass) |
| `tests.search.placeholder` | Search tests and files |
| `tests.moreColumns` | More columns |
| `tests.count` (live region) | Showing {count, plural, one {# test} other {# tests}}, most urgent first |
| `tests.col.rank` / `test` / `status` / `why` / `wasted` | # (accessible name: "Rank") / Test / Status / Why / Wasted time |
| `tests.group.show` | Show {count} {group} tests |
| `tests.keys` | j k move · Enter open · / search · ? all shortcuts |

**Group headers** (`tests.group.<status>`):

| Status | Header line |
|---|---|
| Flaky | Flaky · {n} · Different results on the same commit |
| Unproven | Unproven · {n} · Mixed results, never on the same commit. Could be flaky or a real bug |
| Failing | Failing · {n} · Fails almost every run. Likely a real bug |
| Stable | Stable · {n} · No sign of flakiness |
| Not enough data | Not enough data · {n} · Too little history to judge |

**Why sentences** (`why.<case>`). The number always comes first:

| Case | Template | Example |
|---|---|---|
| Mixed commits | {m} of {g} commits had both a pass and a fail | 4 of 9 commits had both a pass and a fail |
| Retry only (single run or no commit info) | Passed on retry in {r} of {n} runs | Passed on retry in 3 of 12 runs |
| Unproven | Switched between pass and fail {f} times in {n} runs | Switched between pass and fail 5 times in 12 runs |
| Failing | Failed {x} of {n} runs | Failed 12 of 12 runs |
| Failing, was flaky | Failed {x} of {x} runs since {sha}. Flaky before that | Failed 4 of 4 runs since a41f2c9. Flaky before that |
| Stable | Passed {n} of {n} runs | Passed 12 of 12 runs |
| Not enough data | Only {count, plural, one {# attempt} other {# attempts}} loaded | Only 1 attempt loaded |

**Wasted time cell:** `{min} min` (measured), `~{min} min (est.)` (Unproven), `—` (none).

### Test detail panel

| Key | Copy |
|---|---|
| `panel.prev` / `next` | Previous test / Next test (icon buttons, keys k and j) |
| `panel.position` | {i} of {count} shown |
| `panel.copySummary` | Copy summary |
| `panel.copySummary.done` (toast) | Summary copied |
| `panel.close` | Close panel (Esc) |
| `panel.wasted` | Wasted CI time {min} min |
| `panel.history.title` | Run history · {runs} runs on {commits} commits |
| `panel.history.filter` | Show: All attempts / Failures only |
| `panel.history.legend` | Retired 2026-11-26 (doc 12: say it once, no helper lines) |
| `panel.history.hint` | Retired 2026-11-26 (doc 12: say it once, no helper lines) |
| `panel.history.runLabel` (accessible name) | Run {n}, commit {sha}[, mixed commit]: {attempts} |
| `panel.note.title` | What this means |
| `panel.note.next` | What to check next |
| `panel.failure.title` | Latest failure |
| `panel.failure.meta` | Run {n} · commit {sha} · attempt {a} of {total} · {date} |
| `panel.failure.passedAfter` | Attempt {a} passed in {s} s on the same commit. |
| `panel.failure.prev` | Show previous failure |
| `panel.failure.copy` | Copy error message |
| `panel.score.title` | How the score is built |
| `panel.score.score` | Flakiness score {s} of 100: how strongly the evidence points to flakiness. Higher means more certain. |
| `panel.score.mixed` | Mixed commits {m} of {g}: commits where this test both passed and failed. |
| `panel.score.flip` | Flip rate {f}: how often the result switched between pass and fail from one attempt to the next. |
| `panel.score.seen` | First seen {date} · last failed {date} |

**Copy summary** (clipboard, plain text, ready for a ticket):
```
checkout › applies coupon code (tests/checkout.spec.ts)
Status: Flaky. 4 of 9 commits had both a pass and a fail.
Wasted CI time: 14 min across 12 runs.
Latest failure: run 12, commit 7c2e01d: TimeoutError: locator.click: Timeout 5000ms exceeded.
Analysed locally with FlakeLens. Likely cause, not proof.
```

**Status notes** (`note.<status>`), the spec 13.2 notes reworded to these rules:

| Status | What this means | What to check next |
|---|---|---|
| Flaky | This test gave different results on the same code. The likely cause is in the test or its environment, not in a code change. | Waits and timing · Data or state shared between tests · Test order · Slow or unavailable services the test needs. Tip: while you investigate, quarantine it in CI so it can't block merges. |
| Unproven | Results are mixed, but never on the same commit. This could be a real bug, not flakiness. | Code changes near the first failure · Run it again several times on one commit to confirm. |
| Failing | It fails almost every run. This is likely a real bug or a broken test, not flakiness. | The first commit where it started failing · Recent changes to the feature or the test. |
| Failing, was flaky | It fails almost every run now. It was flaky before {sha}. | What changed at {sha} · Whether the flaky behaviour hid a real bug. |
| Stable | No sign of flakiness in the loaded runs. | Nothing needed. With only {n} runs loaded, confidence is low. (Shown below 5 runs.) |
| Not enough data | There is too little history to judge this test. | Load more runs, ideally several on the same commit · Or turn on retries in CI. |

### Loaded data

| Key | Copy |
|---|---|
| `data.back` | Back to tests |
| `data.title` | Loaded data |
| `data.lead` | Retired 2026-11-26 (doc 12: say it once, no helper lines) |
| `data.files` | Files · {count} |
| `data.file.meta` | {runs, plural, one {# run} other {# runs}} · {tests, plural, one {# test} other {# tests}} | Updated 2026-11-26 (simplification pass) |
| `data.file.ok` / `partial` | Imported / Partly imported |
| `data.notices` | Notices · {count} |
| `data.download` | Download not-imported list: CSV / JSON |
| `data.runs` | Runs · {count} |
| `data.runs.cols` | Run / Commit / Branch / Browser / Time / Tests |
| `data.runs.showAll` | Show all {count} runs |
| `data.remove.title` | Remove data |
| `data.remove.body` | To remove a file, clear all data. | Updated 2026-11-26 (simplification pass). Replaced by per-file Remove in v1 (board 10) |
| `data.remove.action` | Clear all data |

### Empty and edge states

| Key | Copy |
|---|---|
| `empty.filter.title` | No {status} tests in these {runs} runs |
| `empty.filter.body` | More runs make this more certain. | Updated 2026-11-26 (simplification pass) (Flaky filter) |
| `empty.filter.action` | Show all tests |
| `empty.search.title` | No test matches "{query}" |
| `empty.search.body` | Search covers test names and file names. |
| `empty.search.suggest` | Search for "{suggestion}" instead |
| `empty.search.clear` | Clear search |
| `missing.test.title` | This test isn't in the loaded data |
| `missing.test.body` | It may have been renamed, or its files were cleared. |
| `missing.test.action` | Back to tests |
| `storage.fail` | Your saved data couldn't be read. Reload to try again. If it keeps happening, clear all data and re-import. | Shortened to 19 words (banner budget 20), 2026-11-26 |
| `storage.off` | This browser won't keep your data after you close the tab. Results are still shown for now. |

### Clear all data dialog

| Key | Copy |
|---|---|
| `clear.title` | Clear all data? |
| `clear.body` | This deletes {files} files, {runs} runs and all results from this browser. You can't undo this. |
| `clear.keep` (focus starts here) | Keep my data |
| `clear.confirm` | Clear all data |
| `clear.done` (toast) | All local data cleared |

### Shortcuts sheet

| Key | Copy |
|---|---|
| `keys.title` | Keyboard shortcuts |
| `keys.toggle` | Single-key shortcuts |
| `keys.toggle.hint` | Retired 2026-11-26 (doc 12: say it once, no helper lines) |
| `keys.list` | j / k: Next / previous test · Enter: Open details · Esc: Close details · /: Search · ?: This sheet |

## 5. Localization notes

- Leave room for about 30% expansion in buttons and tile labels. Tiles wrap, and buttons must not truncate.
- The `›` separator in test names comes from the user's own suite path. Never translate or replace it.
- Commit SHAs, file names, commands and error messages stay verbatim in every language.
- "Flaky" is the industry term. In a translation, keep it untranslated next to the translated word the first time it appears.

## 6. Changes from the cognitive walkthrough (2026-11-20)

| Key | New copy |
|---|---|
| `start.lead` | A flaky test passes and fails on the same code. Drop your test reports to rank them. | Updated 2026-11-26 (simplification pass) |
| `tests.legend` | Retired 2026-11-26 (doc 12: say it once, no helper lines) |
| `tests.col.wasted.hint` | CI minutes spent on failed attempts of commits where this test also passed. Sorts inside each group. |
| `tests.count` | Showing {all }{count} {status }tests{ matching "{query}"}, grouped by status, {sort}. Example: "Showing 1 Flaky test matching 'coupon', grouped by status, sorted by wasted time" |
| `tests.export` | Export (menu): "Copy top Flaky tests" (hint: Markdown list: rank, name, evidence, wasted minutes) · "Download CSV" and "Download JSON" (hint: Coming in v1) |
| `import.rankChange.link` | Show the {count} new Flaky tests |
| `status.new` | New (teal label on rows that turned Flaky since the last import) |
| `panel.diffstat` | {passed} passed · {failed} failed attempts |
| `panel.failure.hunk` | Run {n} · attempt {a} failed, attempt {b} passed · same commit |
| `panel.failure.sign` | fail / pass (replaces − / +) |
| `header.dataChip` (own data) | Retired. The summary is in `data.summary` on Loaded data |

## 7. Rename (2026-11-20)

| Old | New | Why |
|---|---|---|
| Suspect (then Unproven) | **Unproven** | Neutral and short (8 letters). It says the flakiness is not proven yet, rather than implying guilt, and fits the next step: prove it by rerunning on one commit. The group meaning now reads "Mixed results, never on the same commit. Could be flaky or a real bug" |

**For the planning chat:** spec sections 11, 13 and 13.2 still say "Suspect". The engine label value can stay `suspect` internally; only the user-facing string changes.


## 8. Column rename (2026-11-20)

| Old | New | Why |
|---|---|---|
| Why | **Evidence** | The column holds the fact behind the status, not a user note. This matches the product principle "evidence before claims". The keys `why.<case>` keep their names; only the header text changes |

## 9. Keys added by the v0 build, confirmed 2026-11-25

The planning chat listed 139 keys that the app has and this file did not (`docs/ux/spec-sync-list-v0.md`, part D). Each one is confirmed (✓) or reworded (✎). The dev chat applies this wording in `src/ui/copy.ts`.

Rule for the build: the visible text is exactly what is in the Text column. Words such as `'…'` quotes and code comments that appear in the source list are not part of the text. Where a key name still says `suspect`, keep the key and show "Unproven".


### `banner.*`

| Key | Text | |
|---|---|---|
| `banner.dismiss` | Dismiss | ✓ |

### `cell.*`

| Key | Text | |
|---|---|---|
| `cell.fraction` | {a} of {b} | ✓ |

### `data.*`

| Key | Text | |
|---|---|---|
| `data.summary` | {files, plural, one {# file} other {# files}} · {runs, plural, one {# run} other {# runs}} · last added {date} | ✓ |
| `data.file.partial` | Partly imported | ✓ |
| `data.file.failed` | Couldn't import | ✓ |
| `data.download.csv` | CSV | ✓ |
| `data.download.json` | JSON | ✓ |
| `data.runs.label` | Runs | ✓ |
| `data.runs.col.run` | Run | ✓ |
| `data.runs.col.commit` | Commit | ✓ |
| `data.runs.col.branch` | Branch | ✓ |
| `data.runs.col.browser` | Browser | ✓ |
| `data.runs.col.time` | Time | ✓ |
| `data.runs.col.tests` | Tests | ✓ |

### `glossary.*`

| Key | Text | |
|---|---|---|
| `glossary.suspect` | Mixed results, but never on the same commit. Could be flaky or a real bug | ✎ Matches the Unproven group line |
| `glossary.mixedCommit` | A commit where the test both passed and failed | ✓ |
| `glossary.wasted` | Minutes of failed attempts on commits where the test also passed | ✓ |

### `header.*`

| Key | Text | |
|---|---|---|
| `header.theme.toDark` | Switch to dark theme | ✓ |

### `health.*`

| Key | Text | |
|---|---|---|
| `health.title` | Test health | ✓ |

### `import.*`

| Key | Text | |
|---|---|---|
| `import.file.waiting` | Waiting | ✓ |
| `import.partial.badDate` | {file}: the run start time couldn't be read, so this run keeps its import order. | ✓ |
| `import.fail.timeout` | {file} took too long to read and wasn't imported. Try a smaller file or fewer runs. | ✓ |
| `import.fail.tooMany` | That's more than {limit} files at once. Drop fewer files, or split them into batches. | ✓ |
| `import.fail.tooBig` | These files add up to more than {limit}. Drop fewer files at a time. | ✓ |
| `import.fail.crash` | FlakeLens couldn't finish reading your files, and nothing was changed. Try again, or try fewer files. | ✎ Names what failed and what to do, no vague "something went wrong" |
| `import.region` | Import reports | ✓ |
| `import.result` | Import result | ✓ |

### `keys.*`

| Key | Text | |
|---|---|---|
| `keys.close` | Close | ✓ |

### `note.*`

| Key | Text | |
|---|---|---|
| `note.flaky.means` | This test gave different results on the same code. | ✓ |
| `note.flaky.next` | Waits and timing · Data or state shared between tests · Test order · Slow or unavailable services the test needs. Tip: while you investigate, quarantine it in CI so it can't block merges. | ✓ |
| `note.suspect.means` | Results are mixed but never on the same commit, so it could be flaky or a real bug. | ✓ One sentence (doc 12) |
| `note.suspect.next` | Code changes near the first failure · Run it again several times on one commit to confirm. | ✓ |
| `note.failing.means` | It fails almost every run, so it is likely a real bug or a broken test. | ✓ |
| `note.failing.next` | The first commit where it started failing · Recent changes to the feature or the test. | ✓ |
| `note.failingWasFlaky.means` | It fails almost every run now. It was flaky before {sha}. | ✓ |
| `note.failingWasFlaky.next` | What changed at {sha} · Whether the flaky behaviour hid a real bug. | ✓ |
| `note.stable.means` | No sign of flakiness in the loaded runs. | ✓ |
| `note.stable.next` | Nothing needed. | ✓ |
| `note.stable.nextLow` | Nothing needed. With only {n} runs loaded, confidence is low. | ✓ |
| `note.insufficient.means` | There is too little history to judge this test. | ✓ |
| `note.insufficient.next` | Load more runs, ideally several on the same commit · Or turn on retries in CI. | ✓ |

### `panel.*`

| Key | Text | |
|---|---|---|
| `panel.next` | Next test | ✓ |
| `panel.history.legend.mixed` | Mixed commit | ✓ |
| `panel.failure.metaNoDate` | Run {n} · commit {sha} · attempt {a} of {total} | ✓ |
| `panel.wasted.label` | Wasted CI time | ✓ |
| `panel.close.hint` | Close panel (Esc) | ✓ |
| `panel.history.filter.all` | All attempts | ✓ |
| `panel.history.filter.failures` | Failures only | ✓ |
| `panel.history.runLabel.mixed` | Run {n}, commit {sha}, mixed commit: {attempts} | ✓ |
| `panel.fileBar` | {file} · project {project} | ✓ |
| `panel.history.list` | Runs grouped by commit, oldest first | ✓ |
| `panel.history.show` | Show | ✓ |
| `panel.failure.diff` | Latest failure as a diff: failed attempt, then the retry that passed | ✓ |
| `panel.failure.sign.fail` | fail | ✓ |
| `panel.failure.sign.pass` | pass | ✓ |

### `run.*`

| Key | Text | |
|---|---|---|
| `run.pass` | Passed | ✓ |
| `run.retryPass` | Passed on retry | ✓ |
| `run.fail` | Failed | ✓ |
| `run.skip` | Skipped | ✓ |
| `run.attempt.pass` | pass | ✓ |
| `run.attempt.fail` | fail | ✓ |
| `run.attempt.retry` | passed on retry | ✎ Same words as run.retryPass |
| `run.attempt.skip` | skipped | ✓ |

### `runs.*`

| Key | Text | |
|---|---|---|
| `runs.label` | Last {count} runs, oldest first: {list} | ✓ |

### `skip.*`

| Key | Text | |
|---|---|---|
| `skip.results` | Skip to results | ✓ |

### `sort.*`

| Key | Text | |
|---|---|---|
| `sort.rank` | most urgent first | ✓ |
| `sort.wasted` | sorted by wasted time | ✓ |
| `sort.test` | sorted by test name | ✓ |

### `status.*`

| Key | Text | |
|---|---|---|
| `status.flaky` | Flaky | ✓ |
| `status.suspect` | Unproven | ✓ |
| `status.failing` | Failing | ✓ |
| `status.stable` | Stable | ✓ |
| `status.insufficient` | Not enough data | ✓ |

### `storage.*`

| Key | Text | |
|---|---|---|
| `storage.reload` | Reload page | ✓ |
| `storage.skipped` | {count, plural, one {# saved import} other {# saved imports}} couldn't be read and {count, plural, one {was} other {were}} skipped. Clear all data to remove {count, plural, one {it} other {them}}. | ✓ |

### `summary.*`

| Key | Text | |
|---|---|---|
| `summary.title` | {name} ({file}) | ✓ |
| `summary.status` | Status: {status}. {evidence}. | ✓ |
| `summary.wasted` | Wasted CI time: {min} min across {runs, plural, one {# run} other {# runs}}. | ✓ |
| `summary.failure` | Latest failure: run {n}, commit {sha}: {message} | ✓ |
| `summary.footer` | Analysed locally with FlakeLens. Likely cause, not proof. | ✓ |

### `tests.*`

| Key | Text | |
|---|---|---|
| `tests.filter.flaky` | Flaky | ✓ |
| `tests.filter.suspect` | Unproven | ✓ |
| `tests.filter.failing` | Failing | ✓ |
| `tests.col.rank.label` | Rank | ✓ |
| `tests.col.test` | Test | ✓ |
| `tests.col.status` | Status | ✓ |
| `tests.col.runs` | Last 12 runs | ✓ |
| `tests.col.why` | Evidence | ✓ |
| `tests.col.wasted` | Wasted time | ✓ |
| `tests.export.copyTop` | Copy top Flaky tests | ✓ |
| `tests.export.copyTop.hint` | Markdown list: rank, name, evidence, wasted minutes | ✓ |
| `tests.export.csv` | Download CSV | ✓ |
| `tests.export.json` | Download JSON | ✓ |
| `tests.export.later` | Coming in v1 | ✓ |
| `tests.count.all` | Showing all {count, plural, one {# test} other {# tests}}, grouped by status, {sort} | ✓ |
| `tests.count.status` | Showing {count, plural, one {# {status} test} other {# {status} tests}}, grouped by status, {sort} | ✓ |
| `tests.count.search` | Showing {count, plural, one {# test} other {# tests}} matching "{query}", grouped by status, {sort} | ✓ |
| `tests.count.statusSearch` | Showing {count, plural, one {# {status} test} other {# {status} tests}} matching "{query}", grouped by status, {sort} | ✓ |
| `tests.columns` | Columns | ✓ |
| `tests.columns.title` | Choose columns | ✓ |
| `tests.columns.locked` | (always shown) | ✓ |
| `tests.columns.reset` | Reset to default | ✓ |
| `tests.columns.saved` | Saved in this browser | ✓ |
| `tests.col.score` | Flakiness score | ✓ |
| `tests.col.mixed` | Mixed commits | ✓ |
| `tests.col.flip` | Flip rate | ✓ |
| `tests.col.lastFailed` | Last failed | ✓ |
| `tests.col.project` | Project | ✓ |
| `tests.density` | Row density | ✓ |
| `tests.density.compact` | Compact | ✓ |
| `tests.density.comfortable` | Comfortable | ✓ |
| `tests.filters` | Active filters | ✓ |
| `tests.filters.status` | Status: {status} | ✓ |
| `tests.filters.search` | Search: "{query}" | ✓ |
| `tests.filters.remove` | Remove filter {filter} | ✓ |
| `tests.filters.clear` | Clear filters | ✓ |
| `tests.why` | Retired 2026-11-26 | The row is already the link; the sample banner says where to start |
| `tests.rows` | Rows {a} to {b} of {n} | ✓ |
| `tests.health.label` | Status of {tests, plural, one {# test} other {# tests}}: {list} | ✓ |
| `tests.group.flaky` | Flaky · {n} · Different results on the same commit | ✓ |
| `tests.group.suspect` | Unproven · {n} · Mixed results, never on the same commit. Could be flaky or a real bug | ✓ |
| `tests.group.failing` | Failing · {n} · Fails almost every run. Likely a real bug | ✓ |
| `tests.group.stable` | Stable · {n} · No sign of flakiness | ✓ |
| `tests.group.insufficient` | Not enough data · {n} · Too little history to judge | ✓ |

### `tip.*`

| Key | Text | |
|---|---|---|

### `toast.*`

| Key | Text | |
|---|---|---|
| `toast.copyFailed` | Couldn't copy. Your browser blocked clipboard access. Select the text and copy it yourself. | ✎ Adds the recovery step |

### `wasted.*`

| Key | Text | |
|---|---|---|
| `wasted.measured` | {min} min | ✓ |
| `wasted.estimate` | ~{min} min (est.) | ✓ |
| `wasted.none` | — | ✓ |

### `why.*`

| Key | Text | |
|---|---|---|
| `why.mixed` | {m} of {g} commits had mixed results | ✎ Shorter, so Evidence fits one line (2026-11-26) |
| `why.retry` | Passed on retry in {r} of {n} runs | ✓ |
| `why.suspect` | Switched pass and fail {f} times in {n} runs | ✎ Shorter (2026-11-26) |
| `why.failing` | Failed {x} of {n} runs | ✓ |
| `why.failingWasFlaky` | Failed {x} of {x} runs since {sha} | ✎ Shorter. "Flaky before" is said in the panel note (2026-11-26) |
| `why.stable` | Passed {n} of {n} runs | ✓ |
| `why.insufficient` | Only {count, plural, one {# attempt} other {# attempts}} loaded | ✓ |

**133 confirmed, 6 reworded.**

## 10. Answers to the v0 review questions (2026-11-25)

New and changed keys from `docs/ux/11-v0-review-decisions.md`:

| Key | Text | Note |
|---|---|---|
| `header.privacy.short` | Local only | Phone width. The full line `header.privacy` shows as the tooltip and as the accessible name |
| `header.data` (link text; the app uses `data.title`) | Loaded data | Ghost button with a data icon, before "Add your files" |
| `import.noCommit.many` | No commit info found in {count} files. Evidence across commits will be limited. | One note per import, not one per file, until v1 has the commit label field |
| `import.progress.reading` | Reading… | Replaces the percent. Progress is per file |
| `clear.body` (addition) | …You can't undo this. Your theme and display choices are kept. | Decision 12 |
| `tests.health.scope` | All {n} tests | Small caption in the Test health box, because the tabs follow the search and this box does not (decision 2) |

## 11. v1 copy: commit or label per file (board 9, DEV-32, 2026-11-25)

| Key | Text | Note |
|---|---|---|
| `files.commit.label` | Commit or label | Persistent label above the field |
| `files.commit.placeholder.report` | Commit from the report: {sha} | Shown when the field is empty and the report has a commit |
| `files.commit.placeholder.none` | Add a commit or label | Shown when there is no commit info |
| `files.commit.source.report` | From the report | Tag at the right of the label |
| `files.commit.source.none` | No commit info | Same tag, in the warning colour |
| `files.commit.source.user` | Your label | Same tag |
| `files.commit.source.readonly` | Read-only | Sample data |
| `files.commit.hint.report` | Leave empty to use the commit from the report. A label you type replaces it. | |
| `files.commit.hint.none` | No commit info found. This file counts as its own commit. | Warning colour, with the warning icon |
| `files.commit.hint.shared` | Files with the same label count as one commit. | Add " Also used by {count, plural, one {# other file} other {# other files}}." when shared |
| `files.commit.hint.editing` | Files with the same label count as one commit. Enter saves, Esc cancels. | |
| `files.commit.counter` | {n} / 100 | Shown while editing |
| `files.commit.tooLong` | Labels can be up to 100 characters. Typing stops at the limit. | Error colour at 100 / 100 |
| `files.commit.save` / `cancel` | Save label / Cancel | Only while editing |
| `files.commit.remove` | Remove label | Accessible name of the x button |
| `files.commit.saved` | Label saved. Rankings updated. | role status |
| `files.commit.removed` | Label removed. Rankings updated. | role status |
| `files.commit.saveFailed` | Couldn't save the label. Your browser blocked storage, so the label would be lost when you close the tab. | role alert, with the action "Try again" |
| `files.commit.readonly` | Read-only in sample data. Add your own files to label them. | |
| `import.noCommit.link` | Add a commit label | Link in the no-commit note. It moves focus to the first file without commit info |
| `runs.commit.labelTag` | label | Small tag after a typed label in the Commit column of the runs table |

## 12. Settings and per-file remove (board 10, DEV-33)

| Key | Text | Note |
|---|---|---|
| `settings.title` | Settings | Page heading and header link |
| `settings.back` | Back to tests | |
| `settings.appearance` | Appearance | |
| `settings.theme` | Theme | Choices: Dark, Light. Hint: "Dark is the default." |
| `settings.density` | Row density | Choices: Compact, Comfortable |
| `settings.density.hint` | Comfortable shows the file path under each test name. Compact fits more rows. | |
| `settings.shortcuts` | Single-key shortcuts | Switch, accessible name is the label |
| `settings.shortcuts.hint` | j, k, /, ? and Enter work when you are not typing in a field. | |
| `settings.saved.hint` | Saved in this browser. Clear all data keeps these choices. | |
| `settings.rules.title` | How rankings are decided | |
| `settings.rules.note` | These are starting values and are not calibrated yet. They cannot be changed in this version. | Read-only list. Right column shows the config name in monospace |
| `settings.data.title` | Your data | |
| `settings.data.summary` | {files} files · {runs} runs · last added {date} | |
| `settings.data.hint` | Everything stays in this browser. Nothing is uploaded. | |
| `settings.about.title` | About | |
| `settings.about.privacy` | Your files stay in this browser. FlakeLens makes no network requests. | Confirmed by the planning chat 2026-11-25. Add a cloud clause only when a provider exists (v2) |
| `settings.about.links` | Source code · Report an issue · Security policy · MIT licence | External links, new tab, icon plus word |
| `file.remove` | Remove | Button on each file row, trash icon |
| `file.remove.title` | Remove {file}? | |
| `file.remove.body` | This removes the file and everything that came only from it. Rankings are recalculated. | |
| `file.remove.runs` | {count, plural, one {# run and its attempts} other {# runs and their attempts}} | List item |
| `file.remove.tests` | {count, plural, one {# test changes status or evidence} other {# tests change status or evidence}} | List item |
| `file.remove.label` | the commit label "{label}" | List item, only when a label exists |
| `file.remove.shared` | This removes {removed, plural, one {1 run} other {# runs}}. {kept, plural, one {1 run in this file is} other {# runs in this file are}} also in {other}, so {kept, plural, one {it stays} other {they stay}}. | When runs overlap another file |
| `file.remove.last` | This is your last file. Removing it clears all results and takes you back to the start screen. | |
| `file.remove.undoHint` | You can undo this for 10 seconds. | |
| `file.remove.keep` | Keep file | Default focus |
| `file.remove.confirm` | Remove file | Filled danger button |
| `toast.fileRemoved` | {file} removed. Rankings updated. | role status, action "Undo", dismiss "Dismiss" |
| `toast.fileRemoved.last` | {file} removed. All results cleared. | |
| `toast.fileRestored` | {file} restored. Rankings updated. | |
| `toast.undo` | Undo | |

## 13. System banners and toasts (board 11, DEV-17, DEV-20, DEV-45)

Existing keys confirmed as they are: `storage.off`, `storage.fail`, `storage.skipped`, `storage.reload`, `banner.dismiss`.

| Key | Text | Note |
|---|---|---|
| `storage.skipped.action` | Clear all data | Button in the skipped banner. Opens the usual confirmation |
| `pwa.update` | A new version of FlakeLens is ready. Reload to use it. | Toast, status role, no timer |
| `pwa.updateAction` | Reload | Primary button in the toast |
| `pwa.update.storageOff` | A new version is ready. Reloading clears your results because this browser isn't saving them. | Shown instead of `pwa.update` when storage is off and data is loaded |
| `pwa.updateAction.anyway` | Reload anyway | Secondary button, only with `pwa.update.storageOff` |
| `pwa.offlineReady` | FlakeLens now works offline. | Toast, closes itself after 8 s, shown once per install |
| `pwa.install.title` | Install FlakeLens | Row in Settings, About |
| `pwa.install.hint` | Opens in its own window and works offline. Your data stays in this browser. | |
| `pwa.install.action` | Install app | Button, download icon |
| `pwa.installed.title` | FlakeLens is installed | |
| `pwa.installed.hint` | Open it from your apps or desktop. | |
| `pwa.installed.badge` | Installed | Status pill |
| `pwa.install.ios.title` | Install on iPhone or iPad | |
| `pwa.install.ios.hint` | In Safari, choose Share, then Add to Home Screen. | No button |

## 14. Failure groups, cause chips and cause tips (board 12, DEV-38)

Wording rule: a cause is always "likely" or "probably", never a fact. Tips are two short sentences (what probably happened, then one thing to do). Unknown adds no tip.

| Key | Text | Note |
|---|---|---|
| `groups.tab` | Groups | Tab beside Tests, with the group count |
| `groups.title` | Failure groups | |
| `groups.lead` | {groups, plural, one {# group} other {# groups}} from {failures, plural, one {# failure} other {# failures}}. Failures that read the same once numbers and ids are masked are joined. | |
| `groups.search` | Search failure text | Placeholder. `#/groups?q=` |
| `groups.sort.failures` | Most failures | Also: `groups.sort.tests` "Most tests", `groups.sort.latest` "Latest" |
| `groups.meta` | {failures, plural, one {# failure} other {# failures}} · {tests, plural, one {# test} other {# tests}} · {runs, plural, one {# run} other {# runs}} · first seen {first}, last seen {last} | |
| `groups.meta.env` | {tests, plural, one {# test} other {# tests}} · 1 run · {when} | Environment event card |
| `groups.env.title` | {count, plural, one {# test} other {# tests}} failed the same way in run {run} | Environment event card heading |
| `groups.evidence` | Evidence from the logs | |
| `groups.showTests` | {count, plural, one {Show the test} other {Show all # tests}} | Button, expands in place |
| `groups.showing` | Showing {shown} of {total} groups. | |
| `groups.chip` | Likely cause: {cause} | |
| `groups.chip.confidence` | {level} confidence | level = High, Medium or Low |
| `groups.chip.unknown` | Cause unknown | |
| `groups.unknown.note` | The log has no sign of a known cause, so no tip is shown. | |
| `groups.empty.title` | No failures to group | |
| `groups.empty.body` | Every test passed in the loaded runs. Groups appear when a test fails. | |
| `groups.noMatch.title` | No groups match "{q}" | |
| `groups.noMatch.body` | Try a shorter word from the error message. | Action: `groups.noMatch.clear` "Clear search" |
| `groups.long.note` | Long messages are cut at 300 characters. The full text stays one click away. | Action: `groups.long.show` "Show full message" |
| `groups.virtual.note` | Only the cards on screen are drawn, so scrolling stays smooth. | Dev note, not shown to users. The visible line is `groups.showing` |
| `panel.cause.title` | Likely cause: {cause} | Bold, then " · {level} confidence" muted |
| `panel.cause.group` | See the group of {count, plural, one {# failure} other {# failures}} | Link to the card on #/groups |
| `panel.latest` | Latest failure · run {run} | Caption over the highlighted log hunk |

### Cause names and tips

| Key | Name | Tip |
|---|---|---|
| `cause.timing` / `cause.timing.tip` | Timing and waits | A wait is probably too short. Wait for something you can see on the page, not a fixed delay. |
| `cause.order` / `cause.order.tip` | Order dependency | It probably needs another test to run first. Run it alone to check, and let it set up its own state. |
| `cause.sharedState` / `cause.sharedState.tip` | Shared state or data | It probably shares data with another test. Give each test its own data and clean up after it. |
| `cause.network` / `cause.network.tip` | Network or external service | A service it calls was probably slow or out of reach. Mock the call, or retry only that call. |
| `cause.environment` / `cause.environment.tip` | Environment or resources | The machine probably ran short of memory, disk or CPU. Check the runner during the failing run. |
| `cause.concurrency` / `cause.concurrency.tip` | Concurrency | Two things probably ran at once and raced. Wait for the first to finish before you check. |
| `cause.locator` / `cause.locator.tip` | Locator or UI | The element probably changed or was not ready. Use a steady locator, such as a role or a test id. |
| `cause.time` / `cause.time.tip` | Time and randomness | It probably depends on the clock or on random data. Fix the time and seed the random values. |
| `cause.infrastructure` / `cause.infrastructure.tip` | Infrastructure | The CI service probably failed, not the test. Check the runner, then run it again. |
| `cause.unknown` | Cause unknown | (no tip) |

## 15. Full test page, log viewer and correlations (board 13, DEV-41)

Wording rule for correlations: a link is a clue, never a cause. Say "fails more often on", never "is caused by". Strength is a word (Strong, Moderate, Weak), never a bare p-value.

| Key | Text | Note |
|---|---|---|
| `full.open` | Open full view | Link in the panel |
| `full.back` | Back to tests | Keeps filters and scroll place |
| `full.copyName` | Copy test name | |
| `full.stat.failed` | {failed} of {total} | Value. Label: `full.stat.failed.label` "attempts failed" |
| `full.stat.retry.label` | passed on retry | Value is the count |
| `full.stat.wasted.label` | wasted time | |
| `full.stat.confidence.label` | confidence | Value: High, Medium or Low |
| `full.timeline` | Run timeline | Columns: Run, Commit, When, Result, Time |
| `full.timeline.showAll` | Show all {count} runs | |
| `full.result.failedRetry` | Failed, then passed on retry | Also: "Failed twice", "Passed" |
| `log.title` | Failure log | |
| `log.run` | Run {run}, attempt {n} | Run picker button |
| `log.search` | Search the log | Placeholder |
| `log.matches` | {current} of {total} | role status. Zero: "No matches" |
| `log.prev` / `log.next` | Previous match / Next match | Accessible names for the icon buttons |
| `log.wrap` | Wrap lines | Switch |
| `log.copyLine` | Copy line | |
| `log.range` | Lines {from} to {to} of {total}. Only the rows you can see are drawn. | |
| `log.showMore` | Show more ({count} more characters) | Lines over 2,000 characters |
| `log.region` | Log for {test}, {run} | Accessible name of the scroll region |
| `log.none.title` | This run has no log text | |
| `log.none.body` | The report has no error message for this attempt, so there is nothing to show. Pick another run above. | |
| `log.noFailures.title` | No failures in the loaded runs | |
| `log.noFailures.body` | The failure log and its evidence appear when this test fails. | |
| `log.large` | Lines {from} to {to} of {total}. Only the rows you can see are drawn, so scrolling stays smooth. Search covers the whole log. | Large logs |
| `evidence.ok` | Quoted from the log · line {n} | Chip label |
| `evidence.bad` | Not found in the log · line {n} | Chip label. Hint only, not highlighted |
| `corr.title` | What it depends on | |
| `corr.lead` | Compares failures across browsers, shards, operating systems and hours. A link is a clue, not proof. | |
| `corr.strength.strong` / `.moderate` / `.weak` | Strong / Moderate / Weak | Pill after the dimension name |
| `corr.finding` | It fails more often on {value}: {a} of {b} attempts, against {c} of {d} on the {others}. That is {points} points higher. This shows a link, not the cause. | Dimension labels: Browser, Shard, Operating system, Time of day |
| `corr.none` | No clear link. It fails about as often on {a} ({x} of {y}) as on {b} ({u} of {v}). | |
| `corr.notEnough` | Not enough data to compare yet. This needs at least {minAttempts} attempts, {minFails} failures, and {minGroup} attempts in each group. You have {attempts} attempts and {fails} failures. Load more runs to see it. | Calm note, never a finding |
| `corr.missing` | Your files have no {dimension}, so this is not compared. | e.g. "start times" |
| `corr.how` | How this was worked out | Closed details |
| `corr.how.body` | Compared {value} with the rest using Fisher's exact test. Odds ratio {or}, adjusted p {p} (corrected for {n} comparisons). Strength: {strength}. | |

## 16. Export menu and report (board 14, DEV-42)

Existing keys kept: `tests.export` "Export", `tests.export.copyTop`, `tests.export.copyTop.hint`, `tests.export.csv` "Download CSV", `tests.export.json` "Download JSON". Retire `tests.export.later` ("Coming in v1") when DEV-42 lands.

| Key | Text | Note |
|---|---|---|
| `export.scope` | What to export | Group label, radiogroup |
| `export.scope.view` | Current view ({count, plural, one {# test} other {# tests}}) | Hint: `export.scope.view.hint` "{tab} tab, search \"{q}\"" or "{tab} tab" when no search |
| `export.scope.all` | All tests ({count}) | Hint: "Ignores the tab and the search" |
| `export.csv.hint` | One row per test, opens in a spreadsheet | |
| `export.json.hint` | All fields, for scripts and other tools | |
| `export.report` | Open report | Hint: "Preview a Markdown report to paste into a ticket" |
| `export.empty.title` | Nothing to export in this view | |
| `export.empty.body` | No tests match the search "{q}". Choose All tests, or clear the search. | Action: `export.empty.all` "Export all tests". File actions are disabled, the reason is written beside them |
| `report.title` | Report | |
| `report.lead` | A Markdown summary you can paste into a ticket or a pull request. Nothing is uploaded. | |
| `report.copy` | Copy Markdown | Primary |
| `report.download` | Download .md | |
| `report.view` | View | Group label. Choices: `report.view.preview` "Preview", `report.view.source` "Markdown" |
| `report.scope` | Scope: {scope} ({count}). Change it from the Export menu. | scope = "all tests" or "current view" |
| `report.sample` | This report uses sample data. It says so inside the file. | status role |
| `report.noData.title` | No results to report yet | |
| `report.noData.body` | Add your files, or try the sample data, and the report appears here. | Action: "Add your files" |
| `report.noFlaky` | No Flaky tests in this scope. The report lists the summary only. | |
| `report.md.title` | FlakeLens report | First line of the file |
| `report.md.meta` | {date} · {files} files · {runs} runs · {tests} tests · Scope: {scope} | |
| `report.md.summary` | Summary | Lines: "{flaky} Flaky, {unproven} Unproven, {failing} Failing, {stable} Stable, {nodata} Not enough data" and "Wasted CI time: {flakyTime} from Flaky tests, up to {unprovenTime} more if the Unproven tests are flaky" |
| `report.md.top` | Top Flaky tests | |
| `report.md.item` | Failed {failed} of {total} attempts, mixed results on {commits, plural, one {# commit} other {# commits}} · {minutes} min wasted | Then "Likely cause: {cause} ({level} confidence)" when the classifier has one |
| `report.md.footer` | Generated by FlakeLens {version}. Rankings are starting values and are not calibrated. Causes are likely, not certain. | |
| `toast.export.csv` | Downloaded flakelens-tests.csv. {count, plural, one {# test} other {# tests}}. | role status. Same pattern for JSON and `flakelens-report.md` |
| `toast.export.copied` | Copied the report. Paste it into your ticket. | |
| `toast.export.copyFailed` | Couldn't copy. Your browser blocked clipboard access. Download the .md file instead. | role alert, action "Download .md". Replaces `toast.copyFailed` on the report page |


## 17. Keys confirmed or removed after DEV-29 (2026-11-26)

| Key | Text | Note |
|---|---|---|
| `health.subtitle` | {tests} tests · {runs} runs | Confirmed. Files and commits live on Loaded data |
| `panel.note.more` | More to check | Confirmed. Summary of the closed block with the extra checks and the quarantine tip |
| `tests.wasted.estimate.hint` | An estimate, from Unproven tests. | Confirmed. Tooltip on "+ ~{min} min possible" |
| `tip.export` | Removed | The Export menu says what it does; no tip is shown |
| `note.*.means` | One sentence each | flaky, suspect (Unproven), failing, stable, insufficient are one sentence now. `failingWasFlaky` stays two short sentences |
| `storage.fail` | Your saved data couldn't be read. Reload to try again. If it keeps happening, clear all data and re-import. | 19 words |

Word budgets (doc 12 rule 3) count explanatory text and data text up to the first data row. Control names (buttons, tabs, field labels), screen-reader-only text and closed blocks are not counted. The measured counts (Start 40 of 40, Tests 52 of 60, Loaded data 15 of 60, panel 82 of 90) pass under that rule.

## 18. Evidence on one line (2026-11-26)

Decision (row height follow-up): shorten the Evidence sentences so Comfortable rows stay 64px at the 1232px container. Longest string is now 44 characters.

| Key | Text | Longest example |
|---|---|---|
| `why.mixed` | {m} of {g} commits had mixed results | 4 of 9 commits had mixed results (32) |
| `why.retry` | Passed on retry in {r} of {n} runs | 34 |
| `why.suspect` | Switched pass and fail {f} times in {n} runs | Switched pass and fail 5 times in 12 runs (41) |
| `why.failing` | Failed {x} of {n} runs | 22 |
| `why.failingWasFlaky` | Failed {x} of {x} runs since {sha} | 34 |
| `tests.why` | Retired | The " see evidence" text is gone from the row |

Safety net: the Evidence cell is `white-space: nowrap` with an ellipsis and the full sentence in a `title`, so a long locale or number never changes the row height.

## 19. Sample data failure (DEV-31, 2026-11-26)

| Key | Text | Note |
|---|---|---|
| `sample.fail` | The sample data couldn't be loaded. | Confirmed. Inline alert on Start (role alert), under the sample link |
| `sample.retry` | Try again | Reworded from "Retry". Same verb as `files.commit.saveFailed` and the other failure actions, so one recovery word is used everywhere |
