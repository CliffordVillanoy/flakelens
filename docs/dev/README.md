# Development tickets

Each ticket follows the DEV format: Title, Goal, Objectives, Scope, Acceptance Criteria, Details, Skills/Plugins, Limitations/Restrictions, Definition of Done. The planning chat writes tickets; development runs in separate sessions, one ticket at a time.

Roles (from 2026-11-24): the **planning chat** writes plans, tickets, spec changes and reviews; the **dev chat** writes code and tests; the **Project Dev Ops chat** owns CI/CD, pipeline logs, deploys and version control (branches, pull requests, merges, tags, version numbers); the **security chat** reviews; the **UI/UX chat** owns design and copy. `main` is protected by a ruleset (pull request required, checks `check` and `e2e`), so changes reach `main` through pull requests.

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
| [DEV-19](DEV-19.md) | v0 UI review and merge | Fix or refinement | Final review | Done (merged and live) |

Order: DEV-11 → DEV-12 → DEV-13 → DEV-14 → DEV-15 → DEV-16 → DEV-17 → DEV-18, then a final review and the user's merge approval.

## Security hardening (report: `docs/security/review-2026-11-22.md`, branch `fix/security-hardening`)

Written from the security chat's review of `1afaeb6` (0 critical, high or medium; 4 low, 3 info). Order agreed with the dev chat: B, A, C, E, then D only if asked.

| Ticket | Title | Finding | Status |
| --- | --- | --- | --- |
| [DEV-20](DEV-20.md) | Security B: validate stored data on load | S-4 (Low) | Done |
| [DEV-21](DEV-21.md) | Security A: import limits before reading files | S-3 (Low) | Done |
| [DEV-22](DEV-22.md) | Security C: Dependabot and a CI audit step | S-6 (Info) | Done |
| [DEV-23](DEV-23.md) | Security E: neutralise bare URLs in the Markdown export | S-7 (Info) | Done |
| [DEV-25](DEV-25.md) | Dependabot: stop major bumps the toolchain cannot take | S-6 follow-up | Done and verified |
| [DEV-27](DEV-27.md) | README accuracy fixes on PR #2 | Documentation | Done (pushed to PR #2, merged) |
| [DEV-26](DEV-26.md) | Pages deploy: stop the artifact timing failure | Deploy reliability | Done and verified |
| [DEV-24](DEV-24.md) | Security D: frame guard and referrer policy (optional) | S-1 (Low), S-8 (Info) | Optional |

Accepted risks (no ticket): S-2 non-cryptographic run IDs (revisit before any sync or share feature); S-5 `style-src 'unsafe-inline'`; S-1 and S-8 while hosting stays on GitHub Pages (revisit when the hosting move is scheduled, then set the full header set on the new host).

Standing rule from the owner (2026-11-22): while on GitHub Pages, add no secrets, accounts or network features.

### Security acceptance lines for future tickets

Every ticket below must carry these lines in its Acceptance Criteria, and the security chat re-runs its review before the ticket is marked done.

| Future ticket | Security acceptance lines |
| --- | --- |
| JUnit XML importer | A parser with DTD and external entity processing off (a test with an XXE payload fails safely); size and depth limits as for Playwright JSON; parsing in the worker; hostile XML (entity bombs, huge attributes) fails with a notice and never hangs the page. |
| Failure fingerprinting and rule classifier | Failure text may contain secrets: never logged or sent anywhere; patterns are linear-time or bounded (a ReDoS test with a long adversarial string finishes within a set time); output is rendered as text. |
| Provider adapter and LLM tiers | Explicit per-provider opt-in; the app shows exactly what will be sent; stack traces and file paths stripped by default; API keys never in URLs, logs or localStorage if avoidable; `connect-src` relaxed only to the chosen provider's origin; failure text treated as untrusted input to the model and model output rendered as text, never as actions. Needs a host that can set headers or a reviewed CSP change. |
| PWA and service worker | Cache scope and update flow reviewed so a stale or hijacked worker cannot serve altered code. |
| Any sync or share feature | Collision-resistant IDs (S-2), validate on load (S-4, done in DEV-20), integrity checks. |
| Flake lab | The lab app stays out of the deployed `dist` and off the shared origin, or gets the same CSP. |

## v1 (plan: `docs/superpowers/plans/2026-11-25-v1.md`)

Written 2026-11-25. Build order is in "Build sequence from 2026-11-26" in the v1 plan (the owner starts the UI work on 2026-11-26), not number order, unless "Needs first" is not ready. UI tickets wait for boards from the UI/UX chat (`docs/ux/spec-sync-list-v0.md`, section C). Branches, pull requests, merges and releases: Dev Ops chat.

| Ticket | Title | Scope | Needs first | Status |
| --- | --- | --- | --- | --- |
| [DEV-28](DEV-28.md) | Apply the UI/UX v0 review decisions (tokens, copy sync, banners and toasts) | Frontend | nothing | Done locally (not pushed) |
| [DEV-29](DEV-29.md) | Simplification pass on the v0 screens | Frontend (copy and screen changes) | DEV-28 | Done locally (not pushed) |
| [DEV-30](DEV-30.md) | Community files and feedback path | Documentation (repository files) | nothing | Done locally (not pushed) |
| [DEV-31](DEV-31.md) | v0 deferred minors cleanup | Fix or refinement (frontend) | nothing | Done locally (not pushed) |
| [DEV-32](DEV-32.md) | Commit or label per imported file | Frontend (+ pure engine helper) | nothing (board ready) | Done locally (not pushed) |
| [DEV-33](DEV-33.md) | Settings screen and per-file remove | Frontend (+ pure engine helper) | board from the UI/UX chat | Done locally (not pushed) |
| [DEV-34](DEV-34.md) | Sample data: realistic lab durations | Enhancement (flake lab) | nothing | Done locally (not pushed) |
| [DEV-35](DEV-35.md) | Flake lab: one test per cause | Enhancement (flake lab) | DEV-34 | Done locally (not pushed) |
| [DEV-36](DEV-36.md) | Failure fingerprinting and grouping | Backend (engine) | DEV-35 | Done locally (not pushed) |
| [DEV-37](DEV-37.md) | Rule-based cause classifier | Backend (engine, evaluation) | DEV-36 | Done locally (not pushed) |
| [DEV-38](DEV-38.md) | Failure groups screen and cause tips | Frontend | DEV-37; board from the UI/UX chat | Done locally (not pushed) |
| [DEV-39](DEV-39.md) | Run metadata from Playwright reports | Backend (importer, storage) + small frontend | nothing | Done locally (not pushed) |
| [DEV-40](DEV-40.md) | Correlation by browser, shard, OS and time | Backend (engine) | DEV-39, DEV-35 | Done locally (not pushed) |
| [DEV-41](DEV-41.md) | Full test page with log viewer | Frontend | DEV-37, DEV-40; board from the UI/UX chat | Done locally (not pushed) |
| [DEV-42](DEV-42.md) | Export CSV and JSON, report preview | Frontend | DEV-36; board from the UI/UX chat | Done locally (not pushed) |
| [DEV-43](DEV-43.md) | JUnit XML importer | Backend (importer) + small frontend | DEV-39 | To do |
| [DEV-44](DEV-44.md) | Real-data check of the flaky detector | Backend (evaluation) | DEV-43 | To do |
| [DEV-45](DEV-45.md) | Installable offline app (PWA) | Frontend (build, service worker) | DEV-33, DEV-38, DEV-40, DEV-41 and DEV-42 | To do |
| [DEV-46](DEV-46.md) | v1 review and release hand-off | Fix or refinement (review) | DEV-28 to DEV-45 | To do |
| [DEV-47](DEV-47.md) | Failed run square is filled, More to check indented | Frontend (small) | none (before DEV-46) | Done locally (not pushed) |

### Renumbering (2026-11-26)

The v1 tickets were renumbered so the number follows the build sequence (DEV-24 stays on hold and keeps its number; done tickets keep theirs). Messages and notes written before this date cite the old numbers; use this table to translate.

| New | Old | Title |
| --- | --- | --- |
| DEV-28 | DEV-44 | Apply the UI/UX v0 review decisions |
| DEV-29 | DEV-46 | Simplification pass on the v0 screens |
| DEV-30 | DEV-45 | Community files and feedback path |
| DEV-31 | DEV-29 | v0 deferred minors cleanup |
| DEV-32 | DEV-31 | Commit or label per imported file |
| DEV-33 | DEV-41 | Settings screen and per-file remove |
| DEV-34 | DEV-28 | Sample data: realistic lab durations |
| DEV-35 | DEV-34 | Flake lab: one test per cause |
| DEV-36 | DEV-35 | Failure fingerprinting and grouping |
| DEV-37 | DEV-36 | Rule-based cause classifier |
| DEV-38 | DEV-37 | Failure groups screen and cause tips |
| DEV-39 | DEV-30 | Run metadata from Playwright reports |
| DEV-40 | DEV-38 | Correlation by browser, shard, OS and time |
| DEV-41 | DEV-39 | Full test page with log viewer |
| DEV-42 | DEV-40 | Export CSV and JSON, report preview |
| DEV-43 | DEV-32 | JUnit XML importer |
| DEV-44 | DEV-33 | Real-data check of the flaky detector |
| DEV-45 | DEV-42 | Installable offline app (PWA) |
| DEV-46 | DEV-43 | v1 review and release hand-off |

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
- From DEV-19: new header link "Loaded data" (key `data.title`) so Clear all data stays one click away; placement and wording for the UI/UX chat to confirm. The address bar shows `?status=suspect` while the UI says Unproven.
- Deferred minors from DEV-19 (not fixed): (1) copy-summary fields are not cleaned, so a newline in a test name can forge lines in copied text; (2) `stripAnsi` removes colour codes only; (3) zod's JIT uses `Function()` in the worker (`z.config({jitless:true})` would remove it); (4) sample-load fetch errors are not caught; (5) `downloadFile` revokes the object URL right after the click (Safari risk); (6) the result count line `role=status` announces every keystroke in search; (7) `Tests.tsx` `useEffect` on `route.query` runs every render; (8) see the `?status=suspect` note above; (9) Loaded data shows no import progress for drops made there.
- Not covered by v0 tests: Firefox and Safari (Chromium only); no 10-run soak of the whole e2e suite.
- For the UI/UX chat (from DEV-20): interim key `storage.skipped` (ICU plurals) for the "saved imports couldn't be read" banner, flat warning style like `storage.off`.
- From DEV-20: stored rows are validated with `zod/mini` on the page (main chunk 485 kB; full zod would have been 553 kB). Validation strips unknown keys, so a future engine field must also be added to `src/ui/data/stored.ts`. Reload at 5,000 tests x 50 runs takes about 0.9 s to first row (was about 0.5 s). The `bundle.spec` assertion now checks that only the Playwright report parser stays out of the main bundle.
- For the UI/UX chat (from DEV-21): interim keys `import.fail.tooMany` and `import.fail.tooBig`.
- From DEV-21 (deferred minor): files are read one at a time, but all texts of a drop are kept until one worker call, so peak memory is bounded by the 200 MB total cap (plus the copy sent to the worker), not by one file. Parsing one file per worker call would keep it to one file at a time.
- From the DEV-21 security re-review (S-3 closed as a Low residual): worst-case memory is about 2-3x the drop size (strings take up to 2 bytes per character, plus the worker copy). If memory complaints appear, lower `MAX_TOTAL_BYTES` to 100 MB (cheapest) or parse one file per worker call. Minor: `src/engine/import/failed.ts` holds a literal NUL character in `SEP`, so git treats it as binary; replace it with the `' '` escape (the failed-import IDs stay the same).
- From DEV-22: the CI audit gates runtime dependencies only (`--omit=dev`); a runtime advisory turns `main` red until fixed, and a registry outage fails the check job (re-run). If branch protection ever requires `ci`, doc-only PRs stay pending (path filters). Dependabot's first PR can only be checked after the first push.
- After the first push of the security branch (owner task, from the DEV-22 re-review): in repo Settings > Code security, confirm Dependabot version updates and security alerts are on; confirm its first PR appears and passes CI. Until then DEV-22 is not fully verified. Note: the audit runs only when CI runs, and `pages.yml` does not gate the deploy on it.
- DEV-21 add-on done: `src/engine/import/failed.ts` now uses the `'\u0000'` escape (commit `e24f27f`), so git treats it as text.
- From DEV-23: the Markdown copy now carries invisible zero-width spaces inside URLs and addresses (the point: they cannot auto-link). Anyone copying a URL out of a pasted export gets the joiner and must retype or strip it. Dev dependency `marked` 18.2.1 (MIT) is tests only and is not in `dist`.
- From the DEV-23 security re-review: `breakAutolinks` took 0.47 s at 40,000 characters and 1.9 s at 80,000 on a string like `'a.'.repeat(n)` (quadratic). The ticket's own suggested approach lacked a bound; the fix bounds the scheme length to 31 characters and adds timing tests. Lesson for the classifier and fingerprint tickets: every regex over untrusted text needs a bounded quantifier and a timing test (already in the security acceptance lines).
- DEV-23 timing fix done (`0a4664f`): scheme length capped at 31; `escapeMd` on 100,000-character hostile strings went from about 13 s to about 15 ms. A scheme longer than 32 characters followed by `://` is no longer broken (no real scheme is that long).
- From DEV-25: Dependabot PR #1 (typescript 6.0.3 to 7.0.2) was closed; `typescript` majors are ignored until `typescript-eslint` supports TypeScript 7 (remove the rule then, as its own migration ticket). Grouped PRs now carry minor and patch only; majors arrive as single PRs; `open-pull-requests-limit` is 5.
- Verified 2026-11-22: the two-job Pages workflow deployed on the first try (one run). Watch the next few deploys; if the artifact race returns, add a short wait or retry before `deploy-pages`. Dependabot re-ran with the DEV-25 rules and opened no PR.
- 2026-11-25, UI/UX chat answered the v0 review (`docs/ux/11-v0-review-decisions.md`, `docs/ux/04-ux-copy.md` sections 9 and 10, `DESIGN.md` contrast tokens). Applying it to the app is DEV-28. The six v1 boards are not designed yet; the UI/UX chat will post them in this order: DEV-32, DEV-33, system banners and toasts (DEV-17, 20, 45), DEV-38, DEV-41, DEV-42.
- 2026-11-25, UI/UX board 1 of 6 is ready: board 9, commit or label per file (`docs/ux/wireframes/CommitLabel*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 11). DEV-32 is unblocked (after DEV-39). Next boards in order: settings and per-file remove (DEV-33), system banners and toasts, failure groups (DEV-38), full test page (DEV-41), report (DEV-42).
- 2026-11-25, UI/UX board 2 of 6 is ready: board 10, settings and per-file remove (`docs/ux/wireframes/Settings*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 12). DEV-33 is unblocked. Decision: the About privacy text says "FlakeLens makes no network requests" until a cloud provider exists. The About block links to Security policy and Report an issue, so DEV-30 adds SECURITY.md and issue templates. Next boards: system banners and toasts, failure groups (DEV-38), full test page (DEV-41), report (DEV-42).
- 2026-11-25, UI/UX board 3 of 6 is ready: board 11, system banners and toasts (`docs/ux/wireframes/Banners*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 13). The v0 banner rules (one at a time, skipped-banner action, toast stacking) went into DEV-28; the PWA toasts and the Install row in Settings went into DEV-45. DEV-45 needs the DEV-33 settings page and the storage state at the time the worker reports an update. Next boards: failure groups (DEV-38), full test page (DEV-41), report (DEV-42).
- 2026-11-25, UI/UX board 4 of 6 is ready: board 12, failure groups and cause chips (`docs/ux/wireframes/Groups*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 14). DEV-38 is unblocked after DEV-37. Engine needs added to the tickets: typed mask tokens in the template (DEV-36) and a group-level `classifyGroup` with confidence, evidence lines and a representative attempt (DEV-37). Next boards: full test page (DEV-41), report (DEV-42).
- 2026-11-25, UI/UX board 5 of 6 is ready: board 13, full test page and log viewer (`docs/ux/wireframes/FullTest*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 15). DEV-41 is unblocked after DEV-37 and DEV-40. Engine needs added: the correlation result shape with per-value counts, adjusted p, odds ratio, Strong/Moderate/Weak and the not-enough-data numbers (DEV-40), and `verifyEvidence` (DEV-37). Last board: report preview and export (DEV-42).
- 2026-11-25, UI/UX board 6 of 6 is ready: board 14, report preview and export (`docs/ux/wireframes/Report*.dc.html`, copy in `docs/ux/04-ux-copy.md` section 16). **All six v1 boards are done**; no v1 ticket waits for design any more. The UI/UX chat also reminds that the contrast token changes (light link `#0860CA`, muted dark `#A4ABB4` and light `#4F5A65`, skipped run square follows muted) are still pending in the app: that is DEV-28.
- 2026-11-25, UI/UX simplification pass (`docs/ux/12-simplification-pass.md`, canvas v77): fewer words per screen, word budgets, rare choices in Settings. Applied to the v0 screens in DEV-28 (Tests, Start, detail panel, Loaded data, edge and import states; the density toggle stays until DEV-33 moves it to Settings) and to the v1 tickets DEV-32, DEV-38, DEV-41, DEV-42 and DEV-33. The planning plan carries the budgets as a global constraint.
- 2026-11-25, UI/UX rule 8 (canvas v78): no grey helper line under a label. Applied to DEV-38, DEV-41, DEV-42, DEV-33 and DEV-28 (retired keys listed there). Replaces the earlier planning decision on the About privacy line: About shows only "FlakeLens {version}" and links. Note for Dev Ops: `package.json` still says version `0.0.0`; the Settings About line and the JSON export read it.
- 2026-11-25, UI/UX second sub-label sweep (canvas v79, `docs/ux/12-simplification-pass.md` section 7b): shorter file sub-lines, no commit-field helper sentences, install rows without hints. Applied to DEV-32, DEV-33, DEV-45 and DEV-28. Kept on purpose: the file path under the test name, SHA and branch cells, the no-commit warning, the not-imported detail.
- 2026-11-25: DEV-28 was split in two (17 criteria was too much for one ticket): DEV-28 keeps tokens, copy sync, header, banners and toasts; the new DEV-29 carries the simplification pass and sub-label sweeps. Sequence for the 2026-11-26 start is in the v1 plan.
