# FlakeLens UX 12: Simplification pass (less text, less to decide)

2026-11-25, UI/UX chat. Trigger: the product owner found too many labels and words in the designs. Goal: a person at any skill level can use each screen without reading it first.

## 1. Laws and methods applied

| Law or method | What it means here | Rule we apply |
|---|---|---|
| Hick's law | More choices, slower decisions | At most 4 visible controls in a toolbar. Rare choices move to Settings or a menu |
| Miller and cognitive load | Short-term memory holds about 4 chunks | A screen shows at most 4 groups of information above the first table row |
| Progressive disclosure | Show the essentials, reveal detail on request | Explanations, methods and legends go behind a "?" tip, a hover title, or a closed details block |
| Occam / doherty | The simplest design that does the job; feedback is quick | Delete any element whose job another element already does |
| Tesler's law | Complexity cannot vanish, only move | The app does the work (grouping, ranking, wording); the person is not asked to configure it |
| Von Restorff | The one different thing is remembered | One filled primary button per screen; status pills are the only coloured fills |
| Recognition over recall, plain language | Show the thing, do not make people decode it | Counts and colours appear once; words are short and exact |
| Content audit (method) | Count words per screen, find repeats | Done on the Tests screen first (below) |

## 2. Rules from now on

1. **Say it once.** A number, a status or a hint appears in one place on a screen. If the tabs carry the counts, the legend does not.
2. **One line of lead text at most**, and only when it says what to do next. No second sentence that repeats the heading.
3. **Word budgets** (visible UI text above the first data row, excluding row content): Start 40, Tests 60, Loaded data 60, Test detail panel 90, any dialog 45, any banner or toast 20.
4. **Tooltips and "?" tips** hold explanations. Visible text holds names and numbers.
5. **Settings hold rarely changed choices** (density, theme, shortcuts). They do not sit in the toolbar.
6. **Board notes are not UI.** Design explanations on a board are labelled "Design note" and are not counted. UI text on a board is counted.
7. **Every new board is checked against these rules before publishing.**

## 3. Audit: Tests screen (v0, board 2)

Visible words before the pass: 341. After: 294. First viewport before the first table row went from 13 text elements to 8.

| Found | Why it hurts | Change |
|---|---|---|
| Sample banner held 4 facts, 2 sentences and 2 links | Reads like a paragraph, duplicates the health box | "Sample data. Start with the top 3 Flaky tests." plus Exit sample |
| Health meta said files, runs and commits | Three numbers where one matters | "211 tests · 12 runs". Files and commits live on Loaded data |
| Status legend row repeated the counts shown by the tabs, and the bar uses the same colours | Same information three times (legend, tabs, group headers) | Legend row removed. The tabs carry the dot colour and count |
| "+ ~7 min possible (Unproven, est.)" | Jargon in the line people read first | "+ ~7 min possible", with the reason as a hover title |
| Density toggle (Compact, Comfortable) in the toolbar | Rare choice, always visible, adds a decision (Hick) | Removed from the toolbar. It is a Settings choice (board 10) |
| "Showing all 211 tests, grouped by status, most urgent first" | Restates what is on the screen | Kept for screen readers only (live region), not shown |
| Square legend started with "Last 12 runs, oldest first:" | The column header already says it | Prefix removed. The four square names stay |

## 4. Findings for the other screens (to do, in this order)

| Screen | Main findings | Planned change |
|---|---|---|
| Start | Three trust lines plus the how-to in one block | Keep one headline, one primary button, one sample link, one privacy line |
| Test detail panel | Status note, what-to-check list, glossary line and run key all show at once | Show the one-line status and the first check. Put the rest behind "More about this status" |
| Loaded data | Lead, notices, not-imported lists and the runs table compete | Summary line, then files. Notices and the runs table closed by default |
| Failure groups (v1) | Each card shows meta, chip, evidence and tests | Collapse evidence to 2 lines with "Show all"; the chip text drops "Likely cause:" when the card is under a heading that says it |
| Full test page (v1) | Four stat tiles, note, timeline, log and correlations in one scroll | Three tiles, correlation findings closed except the strongest, log opens at the first evidence line |
| Report and export (v1) | Menu hints repeat the item name | Hints only on the two items that are not obvious |
| Settings (v1) | Three sections of hints | One hint per row at most; thresholds list closed by default |
| System banners (v1) | Long sentences | Each banner at most 20 words |
| Board notes (v1 boards) | Design notes sit between UI blocks and read as UI | Put each in a closed "Design note" block |

## 5. How we will check

- Word count per screen from the rendered board (target in section 2, rule 3).
- Five-second test: show the screen for five seconds and ask what it is for and what to press next (kit in `10-usability-test-kit.md`).
- Squint test again after the pass (`09-squint-test.md` method).

## 6. Roll-out result (2026-11-25, canvas v77)

| Screen | Change made |
|---|---|
| Start | Lead cut to one sentence ("A flaky test passes and fails on the same code. Drop your test reports to rank them."). Drop-zone line cut to "More runs give better results." |
| Tests | See section 3 |
| Test detail panel | Status note is one sentence. Two checks show; "More to check" (two more checks plus the quarantine tip) is closed. Run-history key shortened ("Mixed commit"), caption shortened. The duplicate run/commit line above the diff is removed (the diff header already names the run and attempts) |
| Loaded data | Lead is "3 files · 12 runs · last added 18 Nov". Footer shortened to "To remove a file, clear all data." (replaced by per-file Remove in v1) |
| Edge states, Import states | One sentence cut from each (Good news line, sample-mode note) |
| Settings (v1) | Thresholds list closed by default. Duplicate hint under Clear all data removed |
| Full test page (v1) | Three stat tiles, not four (confidence is already in the status note) |
| Report menu (v1) | Hints kept only on Copy top Flaky tests and Open report |
| All v1 boards | Every board note sits in a closed "Design note" block, so only UI text shows |

Still to do when the app is built: apply the same rules to `src/ui/copy.ts` and the screens (the dev chat), and run the five-second test on the new Start and Tests screens.

## 7. Sub-label sweep (2026-11-25, after the owner flagged small grey lines)

New rule 8: **no grey helper line under a label.** A label is the name of the thing. If it needs explaining, the explanation goes in a tooltip (hover title) or a closed block. A helper line stays only if it prevents a mistake (for example "You can't undo this" in a delete dialog).

| Screen | Sub-labels removed |
|---|---|
| Settings | Hints under Theme, Row density, Single-key shortcuts (the shortcut keys are now a tooltip); the "Saved in this browser" caption; the privacy line under Your data and in About; the version pill and its sub-line (now "FlakeLens 0.1.0"); the config names column in the thresholds list (now a tooltip); the undo line in the remove dialogs; the "Added 18 Nov, 16:40" detail under a file name (now "4 runs · 211 tests") |
| Tests | The grey meaning line after each group name (now a tooltip on the group name) |
| Test detail | Run-history caption line |
| Failure groups | Lead sentence under the title; "first seen" and run count in the card meta; the visible "Evidence from the logs" label (kept for screen readers); "Showing 4 of 14 groups"; the unknown-cause note; the meta line on the environment card |
| Full test page | Lead sentence under "What it depends on"; shorter finding, no-link, not-enough-data and missing-data sentences; the log footer sentence |
| Report | Lead sentence under the title; "Change it from the Export menu"; all hints in the Export menu |

### 7b. Second sweep (all remaining screens scanned for small grey text)

Scan method: every text element at 13px or smaller in the muted or secondary grey, on every board. Result: the rest of the small grey text is either data (file paths, commit SHAs, counts in cells), a status the person needs, or board notes. Removed or shortened:

| Screen | Change |
|---|---|
| Loaded data, Commit label | File sub-line was "Added 15 Nov, 09:12 · 5 runs, 211 tests, 3 not imported". Now "5 runs · 211 tests" (the pill already says Partly imported; the added date is in the lead) |
| Commit label field | Removed "Leave empty to use the commit from the report. A label you type replaces it." and the grey placeholder sentence (the source tag says "From the report", the box shows the SHA). Shared-label helper cut to "Also used by 1 other file." Edit helper "Enter saves, Esc cancels" removed (the buttons say it). Read-only helper cut to "Read-only in sample data." |
| Install rows (banners board) | Hints under "Install FlakeLens" and "FlakeLens is installed" removed (tooltip kept). Safari row is one line: "On iPhone or iPad: Share, then Add to Home Screen" |
| Shortcuts sheet (edge states) | "They never fire while you type in a text field." removed |

Kept on purpose: file path under a test name (identifies the test), commit SHA and branch cells, "No commit info found" note (a warning with a link), the not-imported list detail (explains each skipped record), and the source tag beside the commit field.
