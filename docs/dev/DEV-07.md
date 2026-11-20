# DEV-07: v0 engine review and merge

**Status:** Done. Review fixes merged into `main` (merge `9c5d84e`) and pushed to GitHub on 2026-11-20.

**Goal:** An independent review of the whole engine branch, fixes for anything serious, then merge into `main`.

**Objectives:**
- One whole-branch review on the most capable model, using the plan's Review Focus list.
- Fix every Critical and Important finding, each with a test that failed first.
- Merge `feat/v0-engine` into `main` once the user approves.

**Scope:** Fix or refinement.

**Acceptance Criteria:**
1. Review covers all 5 Review Focus items in the plan: BOM files, re-imports under a new label, all-skipped tests, missing start times, multi-project tests.
2. Review also checks the DEV-03 run-order ruling: `compareRuns` compares `startedAt` only when both runs have one, so a mix of timed and untimed runs is not a strict total order. Decide whether results can change with input order in that mix, and fix with a test if so.
3. Every Critical and Important finding is fixed and has a regression test, or is recorded as a ruling with its cost if wrong.
4. Minor findings are listed as deferred, not fixed.
5. Full suite, typecheck and lint green after the fixes.
6. The user sees every ruling and deferred minor before merging.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-20-v0-engine.md`, "Final Review" in superpowers:executing-plans.
- Ledger: `.superpowers/sdd/2026-11-20-v0-engine/progress.md` (rulings so far: EngineConfig type, BOM lint fix, lenient result fields, non-object entries).
- Review package: `skills/subagent-driven-development/scripts/review-package PLAN 1197f1d HEAD`.

**Skills/Plugins:** superpowers:requesting-code-review, superpowers:finishing-a-development-branch, superpowers:verification-before-completion.

**Limitations/Restrictions:**
- Merge needs the user's explicit approval.
- No push until the user provides the repo link.
- One fix pass only.

**Definition of Done:**
- Review done, fixes verified, rulings and deferred minors reported to the user.
- Merged into `main` with the user's approval; the plan workspace in `.superpowers/sdd/` deleted.
