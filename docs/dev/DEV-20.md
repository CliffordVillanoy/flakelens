# DEV-20: Security B: validate stored data on load

**Status:** Done (2026-11-22, commit `1959f0b` on `fix/security-hardening`; 240 unit + 32 e2e tests pass)

**Goal:** A corrupt or old-format stored row can never stop the app from starting, and the user can always clear it.

**Objectives:**
- Validate every stored row when loading, skip rows that fail, and keep valid rows.
- Decide the storage versioning path once: a `schemaVersion` on each stored row plus a migration hook.
- Tell the user when rows were skipped, with Clear all data as the way out.
- Optional rider: zod `jitless` in the worker (deferred DEV-19 minor).

**Scope:** Backend (storage) + small frontend notice. Finding: S-4 (Low).

**Acceptance Criteria:**
1. A corrupt stored row never blocks Start: with a bad row in IndexedDB the app starts, shows the valid rows, and Clear all data removes everything, bad rows included.
2. `loadDataset` validates each row's `result` against a schema (`importResultSchema` in `src/ui/data/stored.ts`, built with zod and checked against the engine types so the two cannot drift). Rows that are not objects, miss `record` or `runs`, or have wrong types are skipped, never thrown.
3. New rows are saved with `schemaVersion: 1`. Rows without the field count as version 1 (everything saved by v0). Rows with a higher version than the app knows are skipped, not deleted, with the message below.
4. A single `migrate(row)` step in `db.ts` is the one place future shape changes go; the Dexie `version(n)` number changes only when an index changes. Say so in a comment and in the report.
5. When rows were skipped, the store sets `skippedRows: n` and a banner says: "{count, plural, one {# saved import} other {# saved imports}} couldn't be read and {count, plural, one {was} other {were}} skipped. Clear all data to remove {count, plural, one {it} other {them}}." (interim key `storage.skipped`, flat warning style like `storage.off`).
6. If every row is bad, the app behaves as empty (Start) with the banner.
7. The existing storage-failed path (DB cannot open) is unchanged.
8. Rider (optional): `z.config({ jitless: true })` is set in the worker, and the worker still parses every fixture. Skip it if it changes results or bundle size badly, and say so.

**Details:**
- Source: `docs/security/review-2026-11-22.md` finding S-4. Code: `src/ui/data/db.ts` (`loadDataset` folds `row.result` with no check today; Dexie is at `version(1)` with `imports: 'importId, seq'`).
- Tests: unit (fake-indexeddb): corrupt row skipped and valid rows kept; row with higher `schemaVersion` skipped; old row without `schemaVersion` loads; save then load round-trip still equals memory; all rows bad gives an empty dataset. Store test: `skippedRows` and the banner. e2e: write a corrupt row straight into IndexedDB, reload, Start loads, banner shows, Clear all data empties the table.
- No new dependency (zod is installed).

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion, security-review.

**Limitations/Restrictions:**
- Branch `fix/security-hardening` (create it from `main` in DEV-20; DEV-21 to DEV-23 go on the same branch). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge: both need the user's approval.
- No new network calls, accounts or secrets (the app stays on GitHub Pages for now).
- Visible text only through `src/ui/copy.ts` (interim keys are listed in the ticket; they go to the UI/UX chat for confirmation).
- The security chat re-reviews each fix when asked; do not start the next ticket before the planning chat sends it.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` green; `npm run e2e` green where the ticket touches the app.
- Committed on `fix/security-hardening`; development report sent to the planning chat.
