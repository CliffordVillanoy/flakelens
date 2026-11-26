# FlakeLens UX 11: Answers to the v0 review

2026-11-25, UI/UX chat, answering `docs/ux/spec-sync-list-v0.md` from the planning chat.

## A. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Header link "Loaded data" | **Keep.** A ghost button with a data icon, text "Loaded data", placed before "Add your files". It shows a small amber dot when the last import had notices. Reason: Clear all data stays one click away |
| 2 | Tab counts follow the search; the health box counts all tests | **Keep.** This is how GitHub's tabs work. The health box gets a caption "All 211 tests" (`tests.health.scope`) so it is clear it ignores the search |
| 3 | Rank on Flaky rows only | **Keep.** It is the true fix-priority order. Other groups carry no number |
| 4 | Compact density path | **DESIGN.md wins.** Compact is one line, 32px, with the file path on hover only. Comfortable is two lines (name, then path), about 64px (changed from 56px on 2026-11-26 after the build measured 62 to 66px). Board 8 is updated to match |
| 5 | Phone "Local only" line | New key `header.privacy.short` = "Local only". The full line `header.privacy` is the tooltip and the accessible name. Shown below 1000px |
| 6 | `header.dataChip` in section 6 | Retired in section 6 of `04-ux-copy.md` |
| 7 | Panel width and heading weight | **Panel 600px, headings weight 600.** Board 4 is updated to match the app |
| 8 | Storage banners | Use the flat warning style of the sample banner (amber icon, normal text, Dismiss for info, Reload page action for errors). A board comes with the v1 "System banners" board (see C). Copy stays as in `04-ux-copy.md` section 9 |
| 9 | Progress without percent | **No percent.** Per-file states: Done, Reading…, Waiting. Board 2 is updated |
| 10 | "No commit info found" on every own file | Show **one note per import**: "No commit info found in {count} files. Evidence across commits will be limited." (`import.noCommit.many`). In v1 it links to the label field (DEV-32) |
| 11 | Not-imported download holds only "no status" and "no name" | **Confirmed.** It lists records that were left out. Other notices (no commit, bad date, duplicates) are information, so they stay in the Notices list |
| 12 | Clear all data keeps theme, density and shortcuts | **Confirmed.** They are settings, not data. The dialog adds: "Your theme and display choices are kept." |
| 13 | Zero-width spaces in Markdown copy | **No export hint.** It is invisible and harmless. Mention it in the help page later if people report paste problems |
| 14 | Branch and Browser show "-" in v0 | **Fine until v1** (DEV-39). Show an em dash "—", the same as the empty wasted-time cell |

## B. Contrast

Done. See "Contrast tokens fixed after the v0 axe audit" in `DESIGN.md`. New tokens: link (light) `#0860CA`, muted (dark) `#A4ABB4`, muted (light) `#4F5A65`. The rule for amber: `#BF8700` is for graphics only; amber text uses `#7D4E00`. The detector reports 0 contrast problems on all 18 boards. The app needs the same four token changes.

## D. Copy

All 139 keys are confirmed or reworded in `04-ux-copy.md` section 9 (133 confirmed, 6 reworded), with the new keys in section 10.

## C. v1 boards, in the order I recommend

Order follows the v1 ticket order so the dev chat is unblocked first.

| Order | Board | Ticket |
|---|---|---|
| 1 | Commit or label per file (the field on Loaded data file rows, plus the link from the no-commit note) | DEV-32 |
| 2 | Settings screen, per-file remove confirmation with undo toast | DEV-33 |
| 3 | System banners and toasts: storage off, storage failed, saved imports skipped, update available, offline ready, install prompt | DEV-17, 20, 45 |
| 4 | Failure groups, cause chips with confidence and quoted evidence, environment-event card, cause tips in the detail panel | DEV-38 |
| 5 | Full test page: run timeline, log viewer, evidence chips, correlations | DEV-41 |
| 6 | Report preview and export options | DEV-42 |

Status: all six v1 boards are designed, dark and light, on the canvas: **9** commit or label (DEV-32), **10** settings and per-file remove (DEV-33), **11** system banners and toasts (DEV-17, 20, 45), **12** failure groups and cause chips (DEV-38), **13** full test page and log viewer (DEV-41), **14** report preview and export (DEV-42). Copy is in `04-ux-copy.md` sections 11 to 16.
