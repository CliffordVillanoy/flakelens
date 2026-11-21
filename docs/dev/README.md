# Development tickets

Each ticket follows the DEV format: Title, Goal, Objectives, Scope, Acceptance Criteria, Details, Skills/Plugins, Limitations/Restrictions, Definition of Done. The planning chat writes tickets; development runs in separate sessions, one ticket at a time.

Source of truth: `docs/SPEC.md`. Exact interfaces, test code and values: the linked implementation plan.

## v0 engine (plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, branch `feat/v0-engine`)

| Ticket | Title | Scope | Plan tasks | Status |
| --- | --- | --- | --- | --- |
| [DEV-00](DEV-00.md) | Project foundation | Backend | 1 | Done |
| [DEV-01](DEV-01.md) | Canonical data model and Playwright JSON importer | Backend | 2–4 | Done |
| [DEV-02](DEV-02.md) | Dataset and run de-duplication | Backend | 5 | Done |
| [DEV-03](DEV-03.md) | Flakiness score and labels | Backend | 6–7 | Done |
| [DEV-04](DEV-04.md) | Default ranking | Backend | 8 | Done |
| [DEV-05](DEV-05.md) | Flake lab and generated fixtures | Backend | 9 | Done |
| [DEV-06](DEV-06.md) | Lab acceptance and detection report | Backend | 10 | Done |
| [DEV-08](DEV-08.md) | Flake lab, cross-run flaky test | Enhancement | (added) | Done |
| [DEV-09](DEV-09.md) | CI cost settings | Enhancement | (added) | Done |
| [DEV-07](DEV-07.md) | v0 engine review and merge | Fix or refinement | Final review | Done (merged, pushed) |

Order: DEV-02 → DEV-03 → DEV-04 → DEV-05 → DEV-06 → DEV-08 → DEV-07. DEV-08 was added after DEV-06 showed the lab could not separate the engine from Playwright's own flaky flag; it runs before the final review so the review covers it. DEV-05 can run in parallel with DEV-02 to DEV-04 (it only needs `hashString`).

Merged into `main` and pushed to https://github.com/CliffordVillanoy/flakelens on 2026-11-20 (merge `9c5d84e`). History was rewritten before the push (local paths scrubbed, attribution trailers removed), so commit hashes quoted in the tickets are stale; commit subjects are unchanged.

## v0 UI (plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, branch `feat/v0-ui`)

| Ticket | Title | Scope | Plan task | Status |
| --- | --- | --- | --- | --- |
| [DEV-11](DEV-11.md) | UI foundation: tokens, fonts, copy, router | Frontend | 1 | Done |
| [DEV-12](DEV-12.md) | Data layer: worker import, storage, sample, store | Both (engine helpers + frontend data) | 2 | Done |
| [DEV-13](DEV-13.md) | Start screen and import states | Frontend | 3 | Done |
| [DEV-14](DEV-14.md) | Tests screen: health box, tabs, ranked table | Frontend | 4 | Done |
| [DEV-15](DEV-15.md) | Table controls and export | Frontend | 5 | Done |
| [DEV-16](DEV-16.md) | Test detail panel and keyboard navigation | Frontend | 6 | Done |
| [DEV-17](DEV-17.md) | Loaded data, clear data, edge states, shortcuts sheet | Frontend | 7 | Done |
| [DEV-18](DEV-18.md) | End-to-end, accessibility, privacy and deploy | Both (tests, CI, hosting) | 8 | Done |
| [DEV-19](DEV-19.md) | v0 UI review and merge | Fix or refinement | Final review | To do |

Order: DEV-11 → DEV-12 → DEV-13 → DEV-14 → DEV-15 → DEV-16 → DEV-17 → DEV-18, then a final review and the user's merge approval.

## Notes for later tickets

- From DEV-02: `importId` hashes file name + import time + run ID. Two imports of the same file with an identical `importedAt` would share an ID. Not reachable with a real clock, but the storage ticket (v0 UI) should use a unique key or check for this.

- From DEV-03: score weights (0.60/0.25/0.15) are named constants in `score.ts`, not in `DEFAULT_CONFIG`. Move them into config when calibration starts.
- From DEV-03: `buildDataset` (test helper) lives in `src/engine/score/testkit.ts`; confirm the UI bundle does not ship it.
- From DEV-04: tie-break sorts file and title by code unit (not locale), then testId. Non-ASCII names sort by code point; revisit if users complain.
- From DEV-05: the sample set has 13 runs (`run-bad.json` is a third run on commit c0). The UI sample banner should count runs from the data, not assume 12.
- From DEV-05: timing delay is seeded at 0–150 or 250–400 ms around the 200 ms wait, so real timer jitter cannot change outcomes. Values in `flake-lab/README.md`.
- From DEV-07: an unreadable run start date is dropped with no notice. The UI plan needs a notice code and copy (for example `import.partial.badDate`).
- From DEV-07 deferred minors: duplicate retry values in hand-edited files; a dropped duplicate import still shows `counts.imported`; mixed path separators in lab fixtures; eval matches labels by title only.
- For the UI/UX chat (from DEV-11): a phone-width "Local only" privacy variant needs a copy key; `04-ux-copy.md` section 6 still shows an own-data `header.dataChip` that section 4 retired; some "a / b" keys were split into separate keys in `src/ui/copy.ts` (list in the DEV-11 ledger).
- From DEV-11: CSP is injected at build only (dev server needs inline scripts for fast refresh). npm 12 skipped the esbuild install script; build works without it.
- For the UI/UX chat (from DEV-12): new copy `import.partial.badDate` = "{file}: the run start time couldn't be read, so this run keeps its import order."; interim copy for a whole-import timeout and crash (`import.fail.timeout`, `import.fail.crash`) set by the planning chat for DEV-13, to be confirmed.
- From DEV-12: sample files parse on the main thread, adding about 60 kB gzip (zod) to first load; move to the worker in the DEV-18 performance pass. The worker under the `/flakelens/` sub-path must be checked with a real drop (DEV-13 or DEV-18).
- For the UI/UX chat (from DEV-13): confirm new keys `import.region`, `import.result`, `banner.dismiss`, `import.fail.timeout`, `import.fail.crash`; the progress bar has no percent (worker reports per file); no commit-label input in v0, so every own file shows the `import.noCommit` info line; sample banner placement is set in DEV-14.
- From DEV-13: import copy lacks a plural for runs ("1 runs"); fixed in DEV-14 per the copy rule (ICU plurals, section 3).
- For the UI/UX chat (from DEV-14): new copy keys `tests.count.all/.status/.search/.statusSearch`, `tests.col.runs`, `tests.legend.title`, `tests.rows`, `tests.health.label`, `run.pass/.retryPass/.fail/.skip`, `runs.label`, `glossary.suspect/.mixedCommit/.wasted`; "Skip to results" link needs a key; tab counts follow the search while the health box counts all tests (confirm); rank shows for Flaky rows only (as board 3).
- From DEV-14: sample lab durations are tiny, so wasted time shows 0.1 to 0.3 min in the demo. Honest numbers, weak demo; decide before launch whether the sample needs longer lab durations.
- For the UI/UX chat (from DEV-15): interim keys `tests.columns/.title/.locked/.reset/.saved`, `tests.col.score/.mixed/.flip/.lastFailed/.project`, `cell.fraction`, `tests.density/.compact/.comfortable`, `tests.filters/.status/.search/.remove/.clear`, `tests.why`, `tip.export`, `tests.banner.sample.seeWhy`, `sort.rank/.wasted/.test`; board 8 compact shows the path inline but DESIGN.md says hover only (followed DESIGN.md); clipboard-failure copy needed (interim `toast.copyFailed` set by planning in DEV-16).
- Decision (planning, DEV-15): sample banner "(see why)" links to Loaded data (#/data), as board 3 does; the dev chat was right and the earlier ask was wrong.
- For the UI/UX chat (from DEV-16): interim keys `panel.fileBar`, `panel.history.list/.show/.legend.mixed`, `panel.failure.diff/.metaNoDate`, `run.attempt.pass/.fail/.retry/.skip`, `summary.title/.status/.wasted/.failure/.footer`, `toast.copyFailed` ("Couldn't copy. Your browser blocked the clipboard."), `panel.wasted.label`, `panel.close.hint`; panel headings use 600 weight (DESIGN.md) vs the board's 700; panel is 600px wide on desktop vs the board's 520px.
- For DEV-18 (from DEV-16): check a click on "Try sample data" that once did not navigate (possible dev-reload race); check that the virtualised table recovers after its container was hidden during a live resize; the page gutter at exactly 640px is 24px (Tailwind max-sm stops at 639px); banners are hidden on phone while a panel is open.
- For DEV-17 (from the DEV-15 security review): CSV and JSON downloads must reuse the control-character cleanup from `escapeMd` plus formula-safe CSV cells; test with a name containing a newline and a leading `=`.
- For the UI/UX chat (from DEV-17): interim keys `data.summary`, `data.file.failed`, `data.download.csv/.json`, `data.runs.label`, `storage.reload`, `keys.close`; plurals added to `data.file.meta`, `clear.body`, `empty.filter.title`; no board exists for the storage off/failed banners (flat warning style used); Branch and Browser show "—" because v0 does not parse them; the not-imported download holds only noStatus and noName notices; Clear all data keeps theme, density and the shortcuts switch.
- From DEV-17: `?` opens the shortcuts sheet even over another open dialog (harmless, unchanged); a synthetic Escape on the window does not close a native dialog (affects scripted e2e only; use a real key press).
- Tip for editors (from DEV-17): the file tool turns escape sequences such as U+2028 into raw characters inside source files; helpers use code points instead.
- For the UI/UX chat (from DEV-18): contrast proposals, tokens NOT changed: light `--status-flaky` #bf8700 on #ffffff is 3.14 as text (app uses `--status-flaky-text` #7d4e00 for the link); light `--link` #0969da on `--surface-hover` #e6eaef is 4.29 (propose link #0860ca or a darker hover); dark `--muted-foreground` #9198a1 on `--selection` #1b3358 is 4.34 and light #59636e on #b6e3ff is 4.48 (propose muted #a4abb4 dark / #4f5a65 light, or a lighter selection). Interim key `skip.results` = "Skip to results".
- From DEV-18: the hidden-list bug was real (virtual table cached 0px rows when hidden at phone width) and is fixed with an e2e test. Pages is not enabled or deployed; the e2e CI job has not run on GitHub yet.
