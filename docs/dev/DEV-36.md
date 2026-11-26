# DEV-36: Failure fingerprinting and grouping

**Status:** Done locally (2026-11-27, commit `e2d3081` on `feat/dev-36-failure-groups` from origin/main fb8875a, worktree `flakelens-dev36`; 481 unit tests, verified by planning). Not pushed or merged. Timing: 1 MB line 3 ms, 1 MB "a." 5 ms, 100k messages 246 ms, 5,000 x 50 grouping about 150 ms (input cut to 50,000 chars first). Lab: 13 groups from 145 failures; the infrastructure event is one group of 4 tests, so environmentEvent is false at the threshold of 5 (decision: keep 5, add a 5th infrastructure lab test in DEV-37). Known: the 503 external call and the order dependency tests normalise to one group (numbers masked), the classifier must tell them apart. Security chat re-review pending.

**Goal:** 200 red tests become a handful of failure groups, and many tests failing the same way at once read as one environment event.

**Objectives:**
- Normalise failure messages into fingerprints and group them.
- Detect environment events.

**Scope:** Backend (engine).

**Acceptance Criteria:**
1. `normalizeMessage(text)` in `src/engine/group/normalize.ts` masks numbers, hex, UUIDs, timestamps, absolute paths, ports, URL query strings, emails, tokens (long base64 or hex runs, `Bearer` values) and memory addresses, collapses whitespace and caps the result. It is linear time. Property tests: changing numbers, timestamps or UUIDs does not change the fingerprint; changing words does.
2. Masked values in the template are typed placeholders the UI draws as small grey tags: `‹n›` for numbers and ports, `‹id›` for hex, UUIDs, tokens and memory addresses, `‹path›` for file paths and URLs, `‹time›` for timestamps (write the angle marks as the code points U+2039 and U+203A in source, never raw; export the four token strings from one constant). `fingerprint(text)` hashes the normalised text (reuse `hashString`) and keeps a capped template (300 characters) for display; the full normalised text stays available so the UI can show the full message (board 12). The normalised template never contains the fake token from the lab fixtures (test).
3. `groupFailures(ds, config)` returns `FailureGroup { fingerprint, template, count, testIds, runIds, firstRunId, lastRunId, environmentEvent }[]` sorted by count. Near-duplicates merge by shingle Jaccard similarity at or above `config.groupMergeJaccard` (start 0.8) with union-find.
4. `environmentEvent` is true when at least `config.envEventMinTests` (start 5) distinct tests fail with the same fingerprint in one run. Both thresholds live in `src/engine/config.ts` with tests.
5. Timing: a 1 MB single-line message, 1 MB of `a.` repeated, and 100,000 distinct short messages each finish in under 500 ms, 500 ms and 2 s; grouping 5,000 tests x 50 runs finishes in under 2 s. Report the numbers.
6. Lab check: the lab fixtures give one group for the infrastructure event and distinct groups for the other injected causes (list expected counts in the report).
7. No UI change, no new dependency.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-35.
- Spec: section 10 (fingerprints, Jaccard, union-find) and 11.1 (environment event versus test problem).
- Security chat re-review: yes (secrets in stacks, ReDoS).

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
