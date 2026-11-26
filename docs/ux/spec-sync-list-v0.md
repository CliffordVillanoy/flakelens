# Spec sync list: v0 build, for the UI/UX chat

Written 2026-11-25 by the planning chat from the dev reports for DEV-11 to DEV-21 (see `docs/dev/README.md`, "Notes for later tickets"). v0 is built and live at https://cliffordvillanoy.github.io/flakelens/. The app has more copy keys than `docs/ux/04-ux-copy.md`. **Every text below is interim** (written by the dev chat or the planning chat while building). Please confirm, reword or reject each, and update `04-ux-copy.md` and the boards. The app reads the text from `src/ui/copy.ts`; the dev chat will apply your final wording.

Keys that `04-ux-copy.md` writes in shorthand ("a / b") are listed here again as separate keys, because the app needed one key per string.

## A. Decisions needed

| # | Question | Context |
| --- | --- | --- |
| 1 | Header link "Loaded data" (key `data.title`): placement and wording | Added in the v0 review so that Clear all data stays one click away when only your own data is loaded. |
| 2 | Tab counts follow the search, while the Test health box always counts all tests. Keep? | DEV-14 ruling 7. |
| 3 | Rank number shows for Flaky rows only (as board 3). Number every row instead? | DEV-14 ruling 4. |
| 4 | Compact density: board 8 shows the file path inline; `DESIGN.md` says hover only. The app follows `DESIGN.md`. | DEV-15. |
| 5 | Phone-width "Local only" privacy line has no copy key. Needs a key and a board state. | DEV-11. |
| 6 | `04-ux-copy.md` section 6 still shows an own-data `header.dataChip` that section 4 retired. The app has no chip. | DEV-11. |
| 7 | Panel width: the app uses 600px (its max) on desktop, the board 520px. Panel headings are 600 weight (DESIGN.md), the board 700. | DEV-16. |
| 8 | No board exists for the storage banners (storage off, storage failed, saved imports skipped). The app uses the flat warning style of the sample banner. | DEV-17, DEV-20. |
| 9 | Progress bar has no percent (the worker reports per file). Board 2 shows "64%". | DEV-13. |
| 10 | Every own file shows the "No commit info found" note, because v0 has no commit label input. A board for the label field comes with v1 (DEV-32). | DEV-13, spec 20.1. |
| 11 | The not-imported download holds only the "no status" and "no name" notices; the Notices list on screen shows the rest. Confirm. | DEV-17. |
| 12 | Clear all data keeps theme, density and the shortcuts switch (settings, not data). Confirm. | DEV-17. |
| 13 | The Markdown copy puts invisible zero-width spaces inside URLs and addresses (so they cannot become links). Mention in the export hint? | DEV-23. |
| 14 | Branch and Browser columns on Loaded data show "-" in v0. Fine until v1 (DEV-39). | DEV-17. |

## B. Contrast fixes (tokens were NOT changed)

Found by axe in DEV-18. The app uses workarounds; please decide the token values.

| Pair | Ratio | Proposal |
| --- | --- | --- |
| Light `--status-flaky` #bf8700 on #ffffff, as text | 3.14 | The app uses `--status-flaky-text` #7d4e00 for the link. Keep as the rule. |
| Light `--link` #0969da on `--surface-hover` #e6eaef | 4.29 | Link #0860ca, or a darker hover surface. |
| Dark `--muted-foreground` #9198a1 on `--selection` #1b3358 | 4.34 | Muted #a4abb4, or a lighter selection. |
| Light muted #59636e on #b6e3ff | 4.48 | Muted #4f5a65, or a lighter selection. |

## C. New boards needed for v1 (see `docs/superpowers/plans/2026-11-25-v1.md`)

| Board | For ticket |
| --- | --- |
| Import: commit or label per file (field on Loaded data file rows, link from the no-commit note) | DEV-32 |
| Failure groups screen, cause chips with confidence and quoted evidence, environment-event card, cause tips in the detail panel | DEV-38 |
| Full test page: run timeline, log viewer (line numbers, highlighted evidence, search), evidence chips, correlations with "not enough data" state | DEV-41 |
| Report preview (`#/report`) and export options (scope, formats) | DEV-42 |
| Settings screen; per-file remove confirmation with undo toast | DEV-33 |
| Update-available toast, offline-ready toast, install prompt | DEV-45 |

Copy needed for v1 (no text yet): cause names and tips for the nine causes plus "unknown", confidence wording, environment-event wording, correlation wording ("fails mostly on browser X", "not enough data to tell"), export and report text, settings text, commit label text, PWA toasts. Tone rules from `04-ux-copy.md` apply: always "likely", never a cause stated as fact.

## D. Interim copy keys in the app but not in `04-ux-copy.md` (139)

### `banner.*` (1)

| Key | Current text in the app |
| --- | --- |
| `banner.dismiss` | Dismiss |

### `cell.*` (1)

| Key | Current text in the app |
| --- | --- |
| `cell.fraction` | {a} of {b} |

### `data.*` (13)

| Key | Current text in the app |
| --- | --- |
| `data.summary` | {files, plural, one {# file} other {# files}} · {runs, plural, one {# run} other {# runs}} · last added {date}. |
| `data.file.meta.notImported` | Added {date} · {runs, plural, one {# run} other {# runs}}, {tests, plural, one {# test} other {# tests}}, {n} not imported |
| `data.file.partial` | 'Partly imported', // Interim copy (DEV-17): a file that could not be imported at all still has a row. |
| `data.file.failed` | Couldn't import |
| `data.download.csv` | CSV |
| `data.download.json` | JSON |
| `data.runs.label` | Runs |
| `data.runs.col.run` | Run |
| `data.runs.col.commit` | Commit |
| `data.runs.col.branch` | Branch |
| `data.runs.col.browser` | Browser |
| `data.runs.col.time` | Time |
| `data.runs.col.tests` | Tests |

### `glossary.*` (3)

| Key | Current text in the app |
| --- | --- |
| `glossary.suspect` | Mixed results, but never on the same commit. Could be a real bug |
| `glossary.mixedCommit` | A commit where the test both passed and failed |
| `glossary.wasted` | Minutes of failed attempts on commits where the test also passed |

### `header.*` (1)

| Key | Current text in the app |
| --- | --- |
| `header.theme.toDark` | Switch to dark theme |

### `health.*` (1)

| Key | Current text in the app |
| --- | --- |
| `health.title` | Test health |

### `import.*` (8)

| Key | Current text in the app |
| --- | --- |
| `import.file.waiting` | Waiting |
| `import.partial.badDate` | {file}: the run start time couldn't be read, so this run keeps its import order. |
| `import.fail.timeout` | "{file} took too long to read and wasn't imported. Try a smaller file or fewer runs.", // Interim keys (DEV-21), to be confirmed by the UI/UX chat. |
| `import.fail.tooMany` | That's more than {limit} files at once. Drop fewer files, or split them into batches. |
| `import.fail.tooBig` | These files add up to more than {limit}. Drop fewer files at a time. |
| `import.fail.crash` | Something went wrong while reading your files. Nothing was changed. Try again. |
| `import.region` | Import reports |
| `import.result` | Import result |

### `keys.*` (1)

| Key | Current text in the app |
| --- | --- |
| `keys.close` | 'Close', // Interim copy (DEV-18), pending UI/UX confirmation. |

### `note.*` (13)

| Key | Current text in the app |
| --- | --- |
| `note.flaky.means` | This test gave different results on the same code. The likely cause is in the test or its environment, not in a code change. |
| `note.flaky.next` | Waits and timing · Data or state shared between tests · Test order · Slow or unavailable services the test needs. Tip: while you investigate, quarant... |
| `note.suspect.means` | Results are mixed, but never on the same commit. This could be a real bug, not flakiness. |
| `note.suspect.next` | Code changes near the first failure · Run it again several times on one commit to confirm. |
| `note.failing.means` | It fails almost every run. This is likely a real bug or a broken test, not flakiness. |
| `note.failing.next` | The first commit where it started failing · Recent changes to the feature or the test. |
| `note.failingWasFlaky.means` | It fails almost every run now. It was flaky before {sha}. |
| `note.failingWasFlaky.next` | What changed at {sha} · Whether the flaky behaviour hid a real bug. |
| `note.stable.means` | No sign of flakiness in the loaded runs. |
| `note.stable.next` | Nothing needed. |
| `note.stable.nextLow` | Nothing needed. With only {n} runs loaded, confidence is low. |
| `note.insufficient.means` | There is too little history to judge this test. |
| `note.insufficient.next` | 'Load more runs, ideally several on the same commit · Or turn on retries in CI.', // Loaded data |

### `panel.*` (14)

| Key | Current text in the app |
| --- | --- |
| `panel.next` | Next test |
| `panel.history.legend.mixed` | Mixed commit: passed and failed on the same code |
| `panel.failure.metaNoDate` | Run {n} · commit {sha} · attempt {a} of {total} |
| `panel.wasted.label` | Wasted CI time |
| `panel.close.hint` | Close panel (Esc) |
| `panel.history.filter.all` | All attempts |
| `panel.history.filter.failures` | Failures only |
| `panel.history.runLabel.mixed` | Run {n}, commit {sha}, mixed commit: {attempts} |
| `panel.fileBar` | {file} · project {project} |
| `panel.history.list` | Runs grouped by commit, oldest first |
| `panel.history.show` | Show |
| `panel.failure.diff` | Latest failure as a diff: failed attempt, then the retry that passed |
| `panel.failure.sign.fail` | fail |
| `panel.failure.sign.pass` | pass |

### `run.*` (8)

| Key | Current text in the app |
| --- | --- |
| `run.pass` | Passed |
| `run.retryPass` | Passed on retry |
| `run.fail` | Failed |
| `run.skip` | Skipped |
| `run.attempt.pass` | pass |
| `run.attempt.fail` | fail |
| `run.attempt.retry` | pass after retry |
| `run.attempt.skip` | 'skipped', // Copy summary (04-ux-copy "Copy summary"), one key per line. |

### `runs.*` (1)

| Key | Current text in the app |
| --- | --- |
| `runs.label` | Last {count} runs, oldest first: {list} |

### `skip.*` (1)

| Key | Current text in the app |
| --- | --- |
| `skip.results` | Skip to results |

### `sort.*` (3)

| Key | Current text in the app |
| --- | --- |
| `sort.rank` | most urgent first |
| `sort.wasted` | sorted by wasted time |
| `sort.test` | 'sorted by test name', // Table controls (board 8). Interim copy where 04-ux-copy has no key yet; flagged for the UI/UX chat. |

### `status.*` (5)

| Key | Current text in the app |
| --- | --- |
| `status.flaky` | Flaky |
| `status.suspect` | Unproven |
| `status.failing` | Failing |
| `status.stable` | Stable |
| `status.insufficient` | Not enough data |

### `storage.*` (2)

| Key | Current text in the app |
| --- | --- |
| `storage.reload` | 'Reload page', // Interim key (DEV-20), to be confirmed by the UI/UX chat. |
| `storage.skipped` | {count, plural, one {# saved import} other {# saved imports}} couldn't be read and {count, plural, one {was} other {were}} skipped. Clear all data to... |

### `summary.*` (5)

| Key | Current text in the app |
| --- | --- |
| `summary.title` | {name} ({file}) |
| `summary.status` | Status: {status}. {evidence}. |
| `summary.wasted` | Wasted CI time: {min} min across {runs, plural, one {# run} other {# runs}}. |
| `summary.failure` | Latest failure: run {n}, commit {sha}: {message} |
| `summary.footer` | 'Analysed locally with FlakeLens. Likely cause, not proof.', // Interim copy from the planning chat (DEV-16), pending UI/UX confirmation. |

### `tests.*` (46)

| Key | Current text in the app |
| --- | --- |
| `tests.filter.flaky` | Flaky |
| `tests.filter.suspect` | Unproven |
| `tests.filter.failing` | Failing |
| `tests.col.rank.label` | Rank |
| `tests.col.test` | Test |
| `tests.col.status` | Status |
| `tests.col.runs` | Last 12 runs |
| `tests.col.why` | Evidence |
| `tests.col.wasted` | Wasted time |
| `tests.export.copyTop` | Copy top Flaky tests |
| `tests.export.copyTop.hint` | Markdown list: rank, name, evidence, wasted minutes |
| `tests.export.csv` | Download CSV |
| `tests.export.json` | Download JSON |
| `tests.export.later` | Coming in v1 |
| `tests.count.all` | Showing all {count, plural, one {# test} other {# tests}}, grouped by status, {sort} |
| `tests.count.status` | Showing {count, plural, one {# {status} test} other {# {status} tests}}, grouped by status, {sort} |
| `tests.count.search` | Showing {count, plural, one {# test} other {# tests}} matching "{query}", grouped by status, {sort} |
| `tests.count.statusSearch` | Showing {count, plural, one {# {status} test} other {# {status} tests}} matching "{query}", grouped by status, {sort} |
| `tests.columns` | Columns |
| `tests.columns.title` | Choose columns |
| `tests.columns.locked` | (always shown) |
| `tests.columns.reset` | Reset to default |
| `tests.columns.saved` | Saved in this browser |
| `tests.col.score` | Flakiness score |
| `tests.col.mixed` | Mixed commits |
| `tests.col.flip` | Flip rate |
| `tests.col.lastFailed` | Last failed |
| `tests.col.project` | Project |
| `tests.density` | Row density |
| `tests.density.compact` | Compact |
| `tests.density.comfortable` | Comfortable |
| `tests.filters` | Active filters |
| `tests.filters.status` | Status: {status} |
| `tests.filters.search` | Search: "{query}" |
| `tests.filters.remove` | Remove filter {filter} |
| `tests.filters.clear` | Clear filters |
| `tests.why` | why? |
| `tests.banner.sample.seeWhy` | see why |
| `tests.legend.title` | Last 12 runs, oldest first: |
| `tests.rows` | Rows {a} to {b} of {n} |
| `tests.health.label` | Status of {tests, plural, one {# test} other {# tests}}: {list} |
| `tests.group.flaky` | Flaky · {n} · Different results on the same commit |
| `tests.group.suspect` | Unproven · {n} · Mixed results, never on the same commit. Could be flaky or a real bug |
| `tests.group.failing` | Failing · {n} · Fails almost every run. Likely a real bug |
| `tests.group.stable` | Stable · {n} · No sign of flakiness |
| `tests.group.insufficient` | 'Not enough data · {n} · Too little history to judge', // Evidence sentences (number first) |

### `tip.*` (1)

| Key | Current text in the app |
| --- | --- |
| `tip.export` | Tip: share the top Flaky tests with your team. Use Export to copy them as a Markdown list. |

### `toast.*` (1)

| Key | Current text in the app |
| --- | --- |
| `toast.copyFailed` | Couldn't copy. Your browser blocked the clipboard. |

### `wasted.*` (3)

| Key | Current text in the app |
| --- | --- |
| `wasted.measured` | {min} min |
| `wasted.estimate` | ~{min} min (est.) |
| `wasted.none` | '—', // Test detail panel |

### `why.*` (7)

| Key | Current text in the app |
| --- | --- |
| `why.mixed` | {m} of {g} commits had both a pass and a fail |
| `why.retry` | Passed on retry in {r} of {n} runs |
| `why.suspect` | Switched between pass and fail {f} times in {n} runs |
| `why.failing` | Failed {x} of {n} runs |
| `why.failingWasFlaky` | Failed {x} of {x} runs since {sha}. Flaky before that |
| `why.stable` | Passed {n} of {n} runs |
| `why.insufficient` | 'Only {count, plural, one {# attempt} other {# attempts}} loaded', // Wasted time cell |

