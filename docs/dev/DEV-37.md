# DEV-37: Rule-based cause classifier

**Status:** To do

**Goal:** Each failure group gets a likely cause with quoted evidence, from rules only, no model.

**Objectives:**
- Classify failures into the nine causes or "unknown".
- Publish accuracy on the lab with its limits.

**Scope:** Backend (engine, evaluation).

**Acceptance Criteria:**
1. `classifyFailure({ message, stack, ... })` returns `{ category, confidence: 'low' | 'medium' | 'high', evidence: { line, text }[], hint? }`. Categories are exactly the spec 12 list plus `unknown` when no rule fires; it never forces a guess. The cause ids are the string union `'timing' | 'order' | 'sharedState' | 'network' | 'environment' | 'concurrency' | 'locator' | 'time' | 'infrastructure' | 'unknown'`, so the UI reads its names and tips from the copy keys `cause.<id>` and `cause.<id>.tip` (UI/UX copy, section 14).
2. Rules live in `src/engine/cause/rules.ts` as data: id, category, bounded pattern, weight, tip. Cover at least: timeout and waiting-for-locator text, `strict mode violation` and visibility or detached errors, `net::ERR_*`, `ECONNREFUSED`, `ECONNRESET`, `getaddrinfo`, 5xx, `Target closed`, out-of-memory and `ENOSPC`, date or time-looking mismatches. Document each rule in the report.
3. Evidence lines are exact substrings of the input with 1-based line numbers (property test: every evidence text occurs in the input at that line). Library frames are dropped, project-code frames kept, at most 5 lines.
4. Optional correlation hints (for example fails only on one browser) change confidence, never the quoted evidence. An `environmentEvent` group classifies as infrastructure unless a stronger test-specific rule fires.
5. ReDoS: a table-driven test runs every rule on 1 MB hostile strings and each finishes in under 500 ms.
6. Group level (needed by board 12): `classifyGroup(group, ds, config)` returns `{ category, confidence: 'high' | 'medium' | 'low', evidence: { line, text }[], attemptId, agreement }`. It classifies up to 20 sampled failures of the group; the winning category is the majority; `agreement` is its share; confidence is `high` only when agreement is at least 0.8 and the winning rule's weight is high, `medium` at agreement of at least 0.5, otherwise `low`; no rule gives `unknown`. `attemptId` is a representative failure that matched the winning rule (the latest one), and `evidence` is quoted from that failure's text with 1-based line numbers. The thresholds live in `src/engine/config.ts` with tests; the UI shows a cause tip only for `medium` and `high`. The group's count, first and last seen and run count come from `FailureGroup` (DEV-36).
7. `verifyEvidence(logText, evidence)` returns whether each quoted line really occurs at its line number in the log text (board 13 shows "Quoted from the log" or "Not found in the log" per quote); property test: evidence produced by the classifier always verifies, and a changed or shifted line does not.
8. `npm run eval:causes` writes `docs/eval/lab-causes.md`: accuracy and a confusion matrix per category on the lab (needs DEV-35), `unknown` counted as wrong and shown separately, a limits paragraph (synthetic messages, small sample). Publish whatever the numbers are.
9. No UI change, no new dependency.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-36.
- Spec: sections 12 (category list, evidence rule), 17 (cause accuracy), 19.1.
- Wording is always "likely"; the classifier never states a cause as fact.
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
