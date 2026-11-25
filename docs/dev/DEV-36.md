# DEV-36: Rule-based cause classifier

**Status:** To do

**Goal:** Each failure group gets a likely cause with quoted evidence, from rules only, no model.

**Objectives:**
- Classify failures into the nine causes or "unknown".
- Publish accuracy on the lab with its limits.

**Scope:** Backend (engine, evaluation).

**Acceptance Criteria:**
1. `classifyFailure({ message, stack, ... })` returns `{ category, confidence: 'low' | 'medium' | 'high', evidence: { line, text }[], hint? }`. Categories are exactly the spec 12 list plus `unknown` when no rule fires; it never forces a guess.
2. Rules live in `src/engine/cause/rules.ts` as data: id, category, bounded pattern, weight, tip. Cover at least: timeout and waiting-for-locator text, `strict mode violation` and visibility or detached errors, `net::ERR_*`, `ECONNREFUSED`, `ECONNRESET`, `getaddrinfo`, 5xx, `Target closed`, out-of-memory and `ENOSPC`, date or time-looking mismatches. Document each rule in the report.
3. Evidence lines are exact substrings of the input with 1-based line numbers (property test: every evidence text occurs in the input at that line). Library frames are dropped, project-code frames kept, at most 5 lines.
4. Optional correlation hints (for example fails only on one browser) change confidence, never the quoted evidence. An `environmentEvent` group classifies as infrastructure unless a stronger test-specific rule fires.
5. ReDoS: a table-driven test runs every rule on 1 MB hostile strings and each finishes in under 500 ms.
6. `npm run eval:causes` writes `docs/eval/lab-causes.md`: accuracy and a confusion matrix per category on the lab (needs DEV-34), `unknown` counted as wrong and shown separately, a limits paragraph (synthetic messages, small sample). Publish whatever the numbers are.
7. No UI change, no new dependency.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-35.
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
