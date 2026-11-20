# FlakeLens UX 02: Information Architecture and Task Flows

Drafted 2026-11-19 in the UI/UX chat. Builds on [01-user-research.md](01-user-research.md) (personas P1 Maya, P2 Sam, P3 Lee, P4 regulated lead; insights I1 to I10).

Items marked **Decided 2026-11-19** are structure decisions made in the UI/UX chat, not in the spec.

## 1. IA principles

1. **One workspace, not a website.** Triage is one task loop: scan, open, decide, move on. Few top-level places, no deep hierarchy.
2. **Tests are the main object.** Users think "which test?", not "which run?". Runs, files and notices are supporting data, one click away.
3. **The answer first, evidence on demand** (spec 13.1). Table row, then detail panel, then raw data.
4. **Location lives in the URL.** Filters, search and the open test are in the hash route. Back works, links can be shared on the same machine, and a reload keeps the place (Tognazzini: State).
5. **Privacy and data control are always visible.** The header always shows what data is loaded and the clear-all action (I9).

## 2. Object model (what users see)

```
Dataset (everything loaded in this browser)
├── Files            imported reports, with their notices
│   └── Runs         one CI run each: commit, branch, browser, shard, time
├── Tests            the main list, one row per test
│   ├── Status       Flaky | Unproven | Failing | Stable | Not enough data   (New in v1)
│   │                Failing can carry a "was flaky earlier" note (flaky, now fails ≥95%)
│   ├── Attempts     one glyph per attempt in the run-history grid
│   └── Failures     messages and logs; grouped by fingerprint in v1
└── Failure groups   v1: one card per fingerprint, links to its tests
```

**Sample data lives in memory only.** **Decided 2026-11-19.** It ships with the app, so it is never written to browser storage and never mixes with the user's own runs. A "Sample data" tag shows in the header, with "Exit sample" next to it. A reload leaves sample mode, which is fine. Reason: mixed sample and real runs would give wrong scores, and the user could not tell (I1 trust). This needs no extra "dataset" record in the engine.

**Engine data needed by this IA (send to the planning chat before build step 2):** spec section 9 has Run, Test, Attempt and Failure. The `#/data` view and persistent notices (spec 9.1) also need an **import record**: file name, import time, result status, counts, and its notices, linked to the runs it created.

## 3. Sitemap and routes

Hash routes, because GitHub Pages serves static files only.

| Route | Screen | Release | Notes |
|---|---|---|---|
| `#/` | **Start** (empty state) or redirect to `#/tests` | MVP | Start is shown only when no data is loaded. |
| `#/tests` | **Tests** (ranked table) | MVP | Filters and search in the query: `#/tests?status=flaky&q=login` |
| `#/tests/:testId` | Tests with the **detail panel** open | MVP | The panel sits beside the table on wide screens and overlays it on narrow ones. Back closes it. |
| `#/data` | **Loaded data** (files, runs, notices) | MVP | Opened from the header data chip and from the import banner. |
| `#/groups` | **Failure groups** | v1 | Second tab beside Tests. |
| `#/tests/:testId/full` | **Test detail page** | v1 | "Open full view" from the panel, for the log viewer and correlations. |
| `#/report` | **Report** preview and export | v1 | Also reached by `e`. |
| `#/settings` | **Settings** | v1 (providers v1.5) | Theme, thresholds view, clear data. |

**Start is an empty state, not a separate page.** **Decided 2026-11-19.** The spec lists "Import" as screen 1. Once data exists, there is nothing to do on an import page. So the drop zone becomes:
- the whole Start screen when nothing is loaded, and
- an "Add files" dialog from the header later (drag and drop onto the Tests screen also works).

This removes one screen and one navigation step (I3 time to first answer).

## 4. Screen layout (MVP)

```
┌ Header ─────────────────────────────────────────────────────────────┐
│ FlakeLens   [Sample data · Exit]   Data: 3 files, 12 runs ▾   [Add files]  [Clear data]  [Theme]  [?] │
├ Import banner (after import, dismissible) ──────────────────────────┤
│ Imported 214 tests from 12 runs. 3 skipped: missing status. View    │
├ Summary tiles ──────────────────────────────────────────────────────┤
│ Tests analysed 214 │ Flaky 7 │ Unproven 4 │ Wasted time 38 min       │
├ Toolbar ────────────────────────────────────────────────────────────┤
│ [Search /]  Status: [All ▾]   [Show details]                        │
├ Ranked table ───────────────────────────┬ Detail panel (on select) ─┤
│ # │ Test / file │ Status │ Why │ Wasted │ Title, status, Why        │
│ 1 │ ...                                │ Run-history grid          │
│ 2 │ ...                                │ Status note: means / check│
│   group dividers: Flaky, Unproven, ...  │ Evidence: latest failure  │
└─────────────────────────────────────────┴───────────────────────────┘
```

- **Tile clicks filter the table.** "Flaky 7" sets `status=flaky`. One control, two jobs (Tognazzini: Efficiency).
- **Group dividers in the table** show the sort groups: Flaky, then Unproven (by score), Failing, Stable (decision 20.1). "Not enough data" sorts last, below Stable (Q4, decided). Rows inside Flaky sort by fix priority (score times wasted minutes).
- **Wasted time is never mixed silently.** Flaky rows show measured minutes: `12 min`. Unproven rows show an estimate: `~4 min (est.)`, with a hint explaining it. The "Wasted time" tile counts Flaky only. Unproven estimates appear as a second line under it: "+ ~9 min possible (Unproven)".
- **Theme:** dark by default (spec 13). The header Theme button switches to light in the MVP. Settings takes it over in v1.
- **The detail panel opens on the latest failure** (Datadog pattern, I3). It does not open at the top of a long history.

## 5. Navigation model

| Need | Mouse | Keyboard |
|---|---|---|
| Move between rows | click | `j` / `k` |
| Open detail panel | click row | `Enter` |
| Close panel | close button, Back | `Esc` |
| Next or previous test while the panel is open | arrows in the panel header | `j` / `k` keep working |
| Search | search box | `/` |
| Export | v1 button | `e` |
| Shortcuts sheet | `?` button | `?` |

Focus rule: opening the panel moves focus to the panel title. Closing it returns focus to the same row.

Single-key shortcuts (WCAG 2.1.4, Level A):
- They never fire while focus is in a text field.
- The `?` shortcuts sheet has an on/off switch, saved locally. Settings takes it over in v1.

## 6. MVP task flows

Format: entry, then steps, then branches and errors, then exit. Each flow lists its states.

### F1. First visit with sample data (P3, P2) — target under 2 minutes

1. Open the site. **Start** shows: drop zone, "Try sample data" button, the privacy line "Your files stay in this browser. Nothing is uploaded."
2. Press "Try sample data".
3. Parsing progress shows in place of the button (with Cancel when longer than 1 s).
4. Go to `#/tests`. Header shows the "Sample data" tag. The import banner shows the planned skip notice (spec 13.2).
5. First-run highlight: the top 3 Flaky rows each show a "why?" link (spec 13.1 guided first run).
6. User opens row 1. The panel shows the grid, the status note and the evidence.

- **Exit:** "Exit sample" goes to `#/tests` with the user's own data if any exists, otherwise to Start. Nothing of the user's is lost, because sample data is never stored.
- **States:** Start empty, parsing, populated with banner.

### F2. Import my own reports (P1)

1. From Start, drop files or browse. From Tests, use "Add files" or drop onto the page.
2. Format check per file, then parse in a worker with progress per file and a Cancel.
3. Result per import (spec 9.1):

| Result | What the user sees | Next step offered |
|---|---|---|
| Success | Banner: "Imported N tests from M runs." | None needed |
| Partial | Banner: counts, up to 3 example problems, "View all" | `#/data` notices, download skipped list |
| Duplicate run | Banner notice: "This run was already loaded and was not counted twice." | None |
| Missing commit info | Banner notice plus a calm note on tiles: "Cross-commit evidence is limited." | How to include commit info (help link) |
| Failed (wrong format, unreadable, too large, more than half bad) | Inline error at the drop zone, file name first. Other files in the same drop still import. | "Try another file", format help |
| Importing while in sample mode | Confirm dialog: "Leave sample data and analyse your files?" | Yes switches dataset. Cancel keeps sample. |

4. Table refreshes. If rankings changed on an existing dataset, the banner says what changed: "2 new Flaky tests."

- **Never a dead end:** every failed state keeps the drop zone active.

### F3. "Is this test flaky?" (P2, the fast check)

1. Press `/`, type part of the test name.
2. Table filters as you type. One match opens nothing by itself; the user presses `Enter`.
3. Panel shows status badge plus the Why sentence with the number first: "Passed and failed on the same commit in 3 of 12 commits."
4. The user decides: re-run and move on, or open the evidence.

- **Branch, not found:** "No test matches 'login'. Search covers test names and files." plus "Clear search".
- **Branch, Not enough data:** status note says what to load next (I5).

### F4. Pick what to fix first (P1)

1. Land on Tests. Flaky group is on top, sorted by fix priority.
2. Optional: click the "Flaky" tile or the "Wasted time" header to re-sort.
3. Open the top row and read the evidence, then `j` to the next one.
4. MVP exit: copy the test name and Why text. v1 exit: export a report (F7).

### F5. Come back later with more runs (P1)

1. Open the site. Data is restored from the browser, so go straight to `#/tests` with the last filters.
2. Header data chip shows when data was last added: "12 runs · last added 3 days ago".
3. Add files (F2). The banner reports ranking changes.

### F6. Clear my data (P4)

1. Press "Clear data" in the header.
2. Confirm dialog names the scope: "Delete 3 files, 12 runs and all results from this browser? This cannot be undone."
3. Return to Start with a toast: "All local data cleared."

- **Sample mode:** the button reads "Exit sample" instead, because sample data is not stored.

## 7. Screen states (MVP)

| Screen | Empty | Loading | Partial | Error | Populated | Edge |
|---|---|---|---|---|---|---|
| Start | Default view | Parsing with progress and Cancel | n/a | Inline per file, drop zone stays active | n/a | Unsupported browser storage: warn that data will not persist |
| Tests | Not reachable (redirect to Start) | Skeleton rows on first restore | Banner and data chip warning icon | Storage read failed: message and "Reload" | Ranked table | Filter gives 0 rows: "No Flaky tests in these runs" plus "Show all" |
| Detail panel | n/a | Instant (data is local) | "Cannot check" lines where data is missing | Test ID not found (old link): "This test is not in the loaded data." plus "Back to tests" | Grid, note, evidence | Single attempt: grid shows one glyph and the Not-enough-data note. Flaky now failing: Failing badge plus "was flaky earlier" note with the commit range. |
| Loaded data | Not reachable | n/a | Notices list expanded | n/a | Files, runs, notices | n/a |

## 8. v1 additions (structure only)

- **F7 Export report:** `#/report` previews the markdown. The user picks format (markdown, CSV, JSON) and scope (current filter or all). Copy and download.
- **F8 Override status:** in the detail panel, "Change status" opens a small menu with a note field. The badge shows "changed by you". The engine label stays visible as "FlakeLens says: Flaky" (decision 2026-11-19).
- **Failure groups tab** and the **full test page** with log viewer and correlations.
- **"Since commit / date" filter** on the run-history grid (decision 2026-11-19).

## 9. Decisions (all answered 2026-11-19)

| # | Question | Answer |
|---|---|---|
| Q1 | Start as an empty state instead of a separate Import page? | **Yes.** (section 3) |
| Q2 | Sample data in memory only, with "Exit sample"? | **Yes.** (section 2) |
| Q3 | Remove a single file in `#/data`, or only clear everything? | **Decided:** per-file remove in v1. MVP has clear-all only. A wrong file then costs a full re-import, which is acceptable at MVP size. |
| Q4 | Where does "Not enough data" sort? Decision 20.1 names only Flaky, Unproven, Failing, Stable. | **Decided:** last, below Stable. It is the least actionable group. |

**Decided, for the planning chat to sync:** spec 13.2 says the default sort is fix priority. Decision 20.1 (later) sorts by group. This doc follows 20.1, so spec 13.2 needs an update.

## 10. Wireframes

Mid-fidelity wireframes for the MVP: [FlakeLens MVP Wireframes (canvas)](https://claude.ai/artifact/TgaVPKws7Sm57HT8RUbEbX). Source copy: [wireframes/](wireframes/).

| Board | Shows |
|---|---|
| 1 Start | Drop zone, Browse files, Try sample data, privacy line, "How do I get a report?" help |
| 2 Import states | Parsing with Cancel, success and partial banners, one failed file, leave-sample dialog |
| 3 Tests | Header in sample mode, summary tiles, search and filters, first-run hint, grouped ranked list |
| 4 Test detail | Panel beside the list: run history by commit, status note, latest failure, score details |
| 5 Loaded data | Files, notices with skipped-list download, runs, clear all |
| 6 Edge states | Empty filter, no search match, old link, not enough data, clear-data dialog, shortcuts sheet |

Wireframe choices that go past this doc (**decided 2026-11-19**):
- Stable and Not enough data groups start collapsed, with a "Show" button, so the list opens on what needs action.
- Flaky and Unproven tiles are buttons that filter the table. Tests analysed and Wasted time are plain tiles.
- The run history in the detail panel is one column per run, grouped by commit, with retries stacked and mixed commits outlined.
- The wireframes are light and neutral on purpose. The dark default theme comes with visual design.
