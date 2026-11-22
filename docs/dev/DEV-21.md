# DEV-21: Security A: import limits before reading files

**Status:** To do

**Goal:** An oversized file, or a huge drop, is refused with a clear message before the app reads it into memory.

**Objectives:**
- Check `File.size` before `File.text()`.
- Cap the number of files and the total size of one drop.
- Read files one at a time so memory stays bounded.

**Scope:** Frontend (import) + tiny engine export. Finding: S-3 (Low).

**Acceptance Criteria:**
1. An oversized file is refused with a message before it is read: a `File` stub whose `size` is over the limit and whose `text()` throws is reported as a failed import with `import.fail.tooLarge` and the throw is never reached.
2. Limits live in `src/ui/data/limits.ts`: `MAX_FILE_BYTES = 50_000_000` (the same figure as `DEFAULT_CONFIG.maxFileChars`), `MAX_FILES = 200`, `MAX_TOTAL_BYTES = 200_000_000`.
3. More than `MAX_FILES` files, or more than `MAX_TOTAL_BYTES` together, refuses the whole drop before anything is read: nothing changes in the dataset and the drop zone shows the message. Interim keys: `import.fail.tooMany` = "That's more than {limit} files at once. Drop fewer files, or split them into batches." and `import.fail.tooBig` = "These files add up to more than {limit}. Drop fewer files at a time."
4. In a normal drop, an oversized file fails inline (file name first, as other failures) while the other files in the same drop still import.
5. Files are read one at a time (order preserved). Progress, Cancel and the 30 s timeout still work; cancel stops before the next read.
6. A failed-import record for an oversized file appears on Loaded data like other failures. To build it without reading, export the engine's existing `failed(opts, code, params)` helper from `src/engine/import/playwright.ts` (rename if you like) and add a test.

**Details:**
- Source: `docs/security/review-2026-11-22.md` finding S-3. Code: `src/ui/data/importer.ts` (`await f.text()` for every file in `Promise.all`; the limit is applied only later in the engine).
- Tests: unit with `File` stubs (size over cap with a throwing `text()`; 201 files; total over cap; mixed drop; abort between reads). e2e: one Playwright upload of a 50,000,001-byte buffer is refused quickly and the app stays responsive.
- No new dependency.

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
