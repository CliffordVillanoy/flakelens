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

## Notes for later tickets

- From DEV-02: `importId` hashes file name + import time + run ID. Two imports of the same file with an identical `importedAt` would share an ID. Not reachable with a real clock, but the storage ticket (v0 UI) should use a unique key or check for this.

- From DEV-03: score weights (0.60/0.25/0.15) are named constants in `score.ts`, not in `DEFAULT_CONFIG`. Move them into config when calibration starts.
- From DEV-03: `buildDataset` (test helper) lives in `src/engine/score/testkit.ts`; confirm the UI bundle does not ship it.
- From DEV-04: tie-break sorts file and title by code unit (not locale), then testId. Non-ASCII names sort by code point; revisit if users complain.
- From DEV-05: the sample set has 13 runs (`run-bad.json` is a third run on commit c0). The UI sample banner should count runs from the data, not assume 12.
- From DEV-05: timing delay is seeded at 0–150 or 250–400 ms around the 200 ms wait, so real timer jitter cannot change outcomes. Values in `flake-lab/README.md`.
- From DEV-07: an unreadable run start date is dropped with no notice. The UI plan needs a notice code and copy (for example `import.partial.badDate`).
- From DEV-07 deferred minors: duplicate retry values in hand-edited files; a dropped duplicate import still shows `counts.imported`; mixed path separators in lab fixtures; eval matches labels by title only.

## Next

v0 UI tickets (build step 4) are written after the UI plan, from `docs/ux/wireframes/`, `DESIGN.md` and `docs/ux/04-ux-copy.md`.
