# DEV-39: Run metadata from Playwright reports

**Status:** To do

**Goal:** Runs carry commit, branch, browser, shard and OS when the report has them, so evidence across commits works for the user's own reports.

**Objectives:**
- Read run metadata from Playwright JSON reports.
- Store it safely and show it on Loaded data.

**Scope:** Backend (importer, storage) + small frontend.

**Acceptance Criteria:**
1. First, produce real Playwright 1.65 JSON from the flake lab with git info capture on (the installed version's option, for example `captureGitInfo`), with the `shard` option and with two projects, and commit the files under `fixtures/playwright/real/`. Record in the report the exact JSON paths where commit, branch, project or browser, shard and OS appear. Anything not present is stated as not present; none of these paths is verified in the plan.
2. `Run` gains optional `branch`, `browser`, `shard` (`{ current, total }`) and `os`. Values are validated at the boundary: strings trimmed, control characters cleaned, capped at 200 characters; shard numbers integers of at least 1. Hostile values (a 10,000-character branch, `<script>`, shard -1) become cleaned and capped text or null, never an exception.
3. If the report holds a commit hash in its metadata, `Run.commit` uses it (full value stored, 7 characters shown). A user label still wins over it (DEV-32 adds the UI). When a commit is found, no `import.noCommit` notice is added.
4. Missing fields stay null and are never invented.
5. A v0 stored row (no new fields) still loads and scores the same (db test). `src/ui/data/stored.ts` lists the new fields as optional; `schemaVersion` stays 1.
6. Loaded data runs table shows Branch, Browser and Shard from the data; missing values show "-" as today. Existing copy keys are reused; any new key is listed in the report.
7. Tests: a unit test per field, bad-input tests extended with hostile metadata, and a property test that arbitrary metadata never throws.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: nothing.
- Plan risk: Playwright field names for git info, shard and project are unverified here; this ticket verifies them first.
- Files: `src/engine/types.ts`, `src/engine/import/playwright.ts`, `src/ui/data/stored.ts`, `src/ui/screens/LoadedData.tsx`, `flake-lab/playwright.config.ts` (git capture, shard), `fixtures/playwright/real/`.
- Security chat re-review: yes (new untrusted fields).

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, security-review.

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
