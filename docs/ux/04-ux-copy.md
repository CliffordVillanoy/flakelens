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
| `header.dataChip` | Retired 2026-11-20. Now `health.subtitle`: "{tests} tests from {files} files · {runs} runs · {commits} commits" plus the link `health.notImported`: "{n} results not imported" (Tests), and the Loaded data lead |
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
| `start.lead` | Drop test reports from a few CI runs. You get a ranked list of flaky tests and why each one was flagged. |
| `start.drop.title` | Drop Playwright JSON reports here |
| `start.drop.hint` | Each file can hold one or more CI runs. More runs give better results. |
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
| `leaveSample.body` | Your {count, plural, one {file} other {# files}} will be analysed on their own. Sample data is never mixed with your runs. |
| `leaveSample.stay` | Stay in sample |
| `leaveSample.confirm` | Analyse my files |

### Tests (ranked list)

| Key | Copy |
|---|---|
| `tests.h1` (visually hidden) | Tests ranked by fix priority |
| `tests.banner.sample` | Sample data: {tests} tests from {runs} runs. {count} results were not imported (see why). Start with the top 3 Flaky tests. They gave different results on the same code. |
| `tests.filter.label` | Filter by status |
| `tests.filter.all` / `flaky` / `suspect` / `failing` | All / Flaky / Unproven / Failing |
| `tests.wasted.title` | Wasted CI time (Flaky) |
| `tests.wasted.estimate` | + ~{min} min possible (Unproven, estimate) |
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
| `panel.history.legend` | Pass · Fail · Pass after retry · Skipped · Mixed commit: passed and failed on the same code |
| `panel.history.hint` | Oldest on the left. Each column is one run. Stacked shapes are retries in that run. |
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
| `data.lead` | Rankings use only these files. Everything stays in this browser. |
| `data.files` | Files · {count} |
| `data.file.meta` | Added {date} · {runs} runs, {tests} tests[, {n} not imported] |
| `data.file.ok` / `partial` | Imported / Partly imported |
| `data.notices` | Notices · {count} |
| `data.download` | Download not-imported list: CSV / JSON |
| `data.runs` | Runs · {count} |
| `data.runs.cols` | Run / Commit / Branch / Browser / Time / Tests |
| `data.runs.showAll` | Show all {count} runs |
| `data.remove.title` | Remove data |
| `data.remove.body` | Removing a single file comes in a later version. For now you can clear everything. |
| `data.remove.action` | Clear all data |

### Empty and edge states

| Key | Copy |
|---|---|
| `empty.filter.title` | No {status} tests in these {runs} runs |
| `empty.filter.body` (Flaky) | Good news. More runs make this more certain. |
| `empty.filter.action` | Show all tests |
| `empty.search.title` | No test matches "{query}" |
| `empty.search.body` | Search covers test names and file names. |
| `empty.search.suggest` | Search for "{suggestion}" instead |
| `empty.search.clear` | Clear search |
| `missing.test.title` | This test isn't in the loaded data |
| `missing.test.body` | It may have been renamed, or its files were cleared. |
| `missing.test.action` | Back to tests |
| `storage.fail` | Your saved data couldn't be read. Reload the page to try again. If it keeps happening, clear all data and import your files again. |
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
| `keys.toggle.hint` | They never fire while you type in a text field. |
| `keys.list` | j / k: Next / previous test · Enter: Open details · Esc: Close details · /: Search · ?: This sheet |

## 5. Localization notes

- Leave room for about 30% expansion in buttons and tile labels. Tiles wrap, and buttons must not truncate.
- The `›` separator in test names comes from the user's own suite path. Never translate or replace it.
- Commit SHAs, file names, commands and error messages stay verbatim in every language.
- "Flaky" is the industry term. In a translation, keep it untranslated next to the translated word the first time it appears.

## 6. Changes from the cognitive walkthrough (2026-11-20)

| Key | New copy |
|---|---|
| `start.lead` | A flaky test passes and fails on the same code. Drop test reports from a few CI runs. You get a ranked list of flaky tests and why each one was flagged. |
| `tests.legend` | Last 12 runs, oldest first: Passed · Passed on retry · Failed · Skipped (each square's tooltip shows its result) |
| `tests.col.wasted.hint` | CI minutes spent on failed attempts of commits where this test also passed. Sorts inside each group. |
| `tests.count` | Showing {all }{count} {status }tests{ matching "{query}"}, grouped by status, {sort}. Example: "Showing 1 Flaky test matching 'coupon', grouped by status, sorted by wasted time" |
| `tests.export` | Export (menu): "Copy top Flaky tests" (hint: Markdown list: rank, name, evidence, wasted minutes) · "Download CSV" and "Download JSON" (hint: Coming in v1) |
| `import.rankChange.link` | Show the {count} new Flaky tests |
| `status.new` | New (teal label on rows that turned Flaky since the last import) |
| `panel.diffstat` | {passed} passed · {failed} failed attempts |
| `panel.failure.hunk` | Run {n} · attempt {a} failed, attempt {b} passed · same commit |
| `panel.failure.sign` | fail / pass (replaces − / +) |
| `header.dataChip` (own data) | {files} files · {runs} runs · last added {date} |

## 7. Rename (2026-11-20)

| Old | New | Why |
|---|---|---|
| Suspect (then Unproven) | **Unproven** | Neutral and short (8 letters). It says the flakiness is not proven yet, rather than implying guilt, and fits the next step: prove it by rerunning on one commit. The group meaning now reads "Mixed results, never on the same commit. Could be flaky or a real bug" |

**For the planning chat:** spec sections 11, 13 and 13.2 still say "Suspect". The engine label value can stay `suspect` internally; only the user-facing string changes.


## 8. Column rename (2026-11-20)

| Old | New | Why |
|---|---|---|
| Why | **Evidence** | The column holds the fact behind the status, not a user note. This matches the product principle "evidence before claims". The keys `why.<case>` keep their names; only the header text changes |
