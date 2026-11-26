# DEV-28: Apply the UI/UX v0 review decisions

**Status:** Done locally (2026-11-26, commit `66041f1` on `feat/dev-28-tokens-copy-sync`, cut from `docs/v1-plan` HEAD `2c58fa1`; 333 unit + 38 e2e tests pass, axe 32 scans clean). Not pushed or merged. Needs the docs committed first (copy-sync test reads `docs/ux/04-ux-copy.md`). Open: Comfortable row height is 62 to 66px, DESIGN.md says 56px (UI/UX decision); doc typo in `tests.filters.search`.

**Goal:** The live app matches the design and copy the UI/UX chat confirmed on 2026-11-25.

**Objectives:**
- Apply the four contrast token changes.
- Replace interim copy with the confirmed wording and add the four new keys.
- Make the small header, import and health-box changes the decisions call for, and the system banners and toasts.
- The less-text changes to the screens are DEV-29, which follows this ticket.

**Scope:** Frontend (tokens, copy, small UI changes).

**Acceptance Criteria:**
1. Tokens (source: `DESIGN.md`, "Contrast tokens fixed after the v0 axe audit"): light `--link` is `#0860CA`; dark `--muted-foreground` is `#A4ABB4`; light `--muted-foreground` is `#4F5A65`; the skipped run square follows muted. Amber `#BF8700` is for graphics only; every amber text use (status Flaky text, links, notes) uses `#7D4E00` in light. A unit test computes the contrast of the pairs named in the decisions (link on row hover, muted on selection, both themes) from `src/ui/styles.css` and asserts at least 4.5:1, so a later edit cannot regress them. The axe e2e scans stay at zero violations in both themes.
2. Copy: `src/ui/copy.ts` matches `docs/ux/04-ux-copy.md` section 9 (133 confirmed keys, 6 reworded: `glossary.suspect` and `note.suspect.means` now say "Could be flaky or a real bug"; `run.attempt.retry` = "passed on retry"; `import.fail.crash`; `toast.copyFailed`; `tests.why` = "see evidence") and the new keys in section 10 (`header.privacy.short`, `import.noCommit.many`, `import.progress.reading`, `tests.health.scope`; `clear.body` gains "Your theme and display choices are kept."). Keys that still contain `suspect` stay as keys and show "Unproven". A test parses the key and text columns of sections 9 and 10 and fails when `copy.ts` differs, so the doc and the app cannot drift. Report any row of the doc that cannot be parsed.
3. Header: "Loaded data" is a ghost button with a data icon, placed before "Add your files". A small amber dot shows when the most recent import record has at least one notice with severity `warning` or `error` (info notices such as no commit info do not count; say so in the report).
4. Phone width: below 1000px the header shows `header.privacy.short` ("Local only"); the full `header.privacy` line is the tooltip and the accessible name.
5. Import: when files without commit information are imported, one note per import says "No commit info found in {count} files..." (`import.noCommit.many`); a single file keeps the per-file `import.noCommit` text with its name (decide and report). Per-file progress shows Done, Reading... (`import.progress.reading`) and Waiting, with no percent.
6. Tests: the Test health box shows the caption `tests.health.scope` ("All {n} tests") because the tabs follow the search and the box does not.
7. Loaded data: Branch and Browser show an em dash (the same as the empty wasted-time cell), not a hyphen.
8. Verify, and fix only if different, that Compact density is one 32px line with the path on hover only, Comfortable is two lines at 56px, the panel is 600px wide and its headings are weight 600 (decisions 4 and 7); report the result.
9. System banners (board 11, `DESIGN.md` "System banners and toasts", copy section 13): only one banner shows at a time, in the order failed, then skipped, then off; the skipped banner gets the action `storage.skipped.action` ("Clear all data", opens the usual confirmation); an error banner has no Dismiss and uses role alert; a dismissed warning stays dismissed until the next page load; the banner sits in the page flow under the header at the content width (max 1232px). The existing keys `storage.off`, `storage.fail`, `storage.skipped`, `storage.reload` and `banner.dismiss` are unchanged.
10. Toasts (same board): at most 2 at a time, bottom left on desktop, full width on phones, newest at the bottom, never take focus, Esc closes the focused toast, 150 ms fade that is off with reduced motion. Report if the app's toasts differed.
11. Where the boards or `docs/ux/12-simplification-pass.md` give shorter text than `docs/ux/04-ux-copy.md` section 9 or 10 for a key, the board wins; report each such key so the UI/UX chat updates the copy doc. Keys that become unused (for example the toolbar density keys and long banner text) are retired from `src/ui/copy.ts`, and the copy-sync test in item 2 is adjusted to match.
12. Unit and e2e tests updated or added for every item above; full suites green.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing.
- Sources: `docs/ux/11-v0-review-decisions.md` (the 14 decisions), `docs/ux/04-ux-copy.md` sections 9 and 10, `DESIGN.md`, and the updated boards in `docs/ux/wireframes/`.
- Banners and toasts: board 11 (`Banners.dc.html`) and `docs/ux/04-ux-copy.md` section 13; the PWA toasts and the install row in that section belong to DEV-45, not here.
- The UI/UX chat owns wording and tokens; this ticket only applies them. If a value in the docs is unclear, ask the planning chat rather than guessing.
- Send this ticket first (sequence in `docs/superpowers/plans/2026-11-25-v1.md`, "Build sequence from 2026-11-26"); DEV-29 follows it.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md), interaction-design.

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; list every new interim copy key in the report (the UI/UX chat confirms them later).
- No new network calls, accounts or secrets. A new dependency only as named in the ticket; report its name, version and licence.
- Every regex or loop over untrusted text is bounded or linear and has a timing test (plan, Global constraints).
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint` and `npm run build` green; `npm run e2e` green when the app changes.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.
