# DEV-43: JUnit XML importer

**Status:** Merged (2026-11-28, PR #22 squashed, main 14a609c; check and e2e green; 5 commits, last `2074d84`). Parser: hand-written `src/engine/import/xml.ts` (about 220 lines, single pass, no recursion, no DTD; an internal-subset `<!ENTITY>` is refused with the new notice `import.fail.unsafe`; only 5 predefined and numeric entities decode). Dispatcher `parseReport` in `report.ts` (first non-space char `<` = JUnit). Test.project is '' for JUnit. Fixtures in `fixtures/junit/` (12). New interim keys: start.help.junit, import.fail.unsafe; changed import.fail.format. Open for UI/UX: start.drop.title and start.help.title still say Playwright JSON. Needs the updated copy doc in the same PR. Security chat review of xml.ts and the entity refusal is recommended before merge.

**Goal:** Teams on Java, Python, .NET and most other stacks can import their reports.

**Objectives:**
- Parse JUnit XML into the canonical records, safely, inside the worker.
- Pick the importer by content.

**Scope:** Backend (importer) + small frontend.

**Acceptance Criteria:**
1. `parseJUnitReport(text, opts)` in `src/engine/import/junit.ts` returns the same `ImportResult` and notice codes as the Playwright importer and never throws. A dispatcher `parseReport(text, opts)` chooses the importer by content (a JSON object versus an XML root of `testsuites` or `testsuite`); the worker uses it. An unknown format fails with `import.fail.format`, whose copy no longer says JUnit is "planned".
2. Mapping: `testcase` `classname` and `name` give file, suite path and title; `time` (seconds) gives `durationMs`; `failure` and `error` give a failed attempt with message and stack from the attributes and element text; `skipped` gives a skip; no child gives a pass. Surefire rerun elements are attempts in order: `flakyFailure` and `flakyError` are failed attempts followed by the final pass; `rerunFailure` and `rerunError` are failed retries.
3. Metadata: read `git.commit`, `git.branch`, `os.name` and `browser` from `<properties>` when present (document the names read); otherwise null and the no-commit notice.
4. Every row of spec 9.1 has an XML fixture and a test: valid, partial (missing name, bad time), duplicates, same run twice, wrong format, empty or truncated, more than half bad, too large or deep, hostile text.
5. Security: DTD and external entity processing are off. An XXE payload that references a local file or an HTTP URL causes no read and no request and ends as a failed import or plain text with a notice. A billion-laughs payload fails in under 1 s with a notice. The existing 50 MB and depth limits apply. Parsing runs only in the worker. A fuzz test (random and corrupted XML) never throws.
6. UI: dropping a JUnit file works from Start and Loaded data; the format help text gains a JUnit step; e2e with a Surefire file.
7. Report the parser's name, version, licence and why it meets the security line; it is not in the main bundle (extend `e2e/bundle.spec.ts`).
8. Commit small JUnit fixtures: valid, surefire-rerun, partial, hostile.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-39.
- Parser choice is the dev chat's, within the security line. No parser is assumed in this plan.
- Spec: sections 9, 9.1, 19.1 (malicious or oversized input).
- Security chat re-review: yes.

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
