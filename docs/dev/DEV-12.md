# DEV-12: Data layer: worker import, storage, sample, store

**Status:** To do

**Goal:** Get data in and out: parse files in a worker, store the user's data in IndexedDB, load sample data in memory, and expose ranked results to the screens.

**Objectives:**
- Engine: `orderRuns`, `runHistory`, `lastRuns` in `src/engine/view.ts`; new `import.partial.badDate` notice (info).
- Dexie storage with `saveImport`, `loadDataset`, `clearAll`, `storageAvailable`; unique import IDs.
- Comlink worker parsing with progress, cancel and a 30 s per-file timeout.
- `loadSample()` from `public/sample/` (memory only).
- Zustand store with mode, dataset, ranked scores, import progress and storage state.

**Scope:** Both (engine helpers + frontend data).

**Acceptance Criteria:**
1. Run order in `runHistory` matches `scoreTests`, including mixed timed and untimed runs.
2. `retryPass` and `mixedCommit` are set correctly.
3. An unreadable start date gives `import.partial.badDate` and the import stays `success`.
4. Save then load gives the same dataset; a repeated `importId` is made unique.
5. With IndexedDB unavailable, import still works in memory and the store reports `storage: 'off'`.
6. The same file twice in one drop keeps one run and adds `import.dupeRun`.
7. Sample mode never writes to storage; cancel leaves the dataset unchanged.
8. `newFlaky` counts tests that became Flaky since the last dataset.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 2 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Interfaces only; no screens. Dev dependency `fake-indexeddb` for tests. Add the `import.partial.badDate` copy line given in the plan and mention it in the report for the UI/UX chat.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Branch `feat/v0-ui` (create it from `main` in DEV-11). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge.
- Every visible string from `src/ui/copy.ts` (keys from `docs/ux/04-ux-copy.md`). No network calls outside the app origin.
- New dependencies only as named in the plan; report each one's version and licence.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` green.
- Compared against the named wireframe boards (launch config `wireframe-preview`) in dark and light; differences listed in the report.
- Committed on `feat/v0-ui`; ledger line added; development report sent to the planning chat.
