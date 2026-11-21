# DEV-19: v0 UI review and merge

**Status:** To do (after DEV-11 to DEV-18)

**Goal:** An independent review of the whole `feat/v0-ui` branch, fixes for anything serious, then merge into `main` once the user approves.

**Objectives:**
- One whole-branch review on the most capable model, using the plan's Review Focus list and the extra checks below.
- Fix every Critical and Important finding, each with a test that failed first. One fix pass.
- Merge `feat/v0-ui` into `main` only after the user approves. No push.

**Scope:** Fix or refinement.

**Acceptance Criteria:**
1. Review covers the 5 Review Focus items in `docs/superpowers/plans/2026-11-21-v0-ui.md` (5,000-test suite, blocked IndexedDB, same file twice in one drop, hostile and very long test names, reload on a test link after Clear all data), one line of evidence each.
2. Review covers these extra checks, one verdict each:
   a. Security: CSP in the built HTML, no `dangerouslySetInnerHTML`, no `eval`, no network request outside the app origin, hostile report content (HTML, formulas, newlines, ANSI codes, `__proto__` keys, huge strings) in the table, panel, copy summary, Markdown, CSV and JSON.
   b. Privacy: nothing stored except IndexedDB data and the listed prefs; sample data never stored; Clear all data really empties both.
   c. Data integrity: save then reload gives the same ranking; import cancel and timeout leave data unchanged; unique import IDs under repeated drops.
   d. Accessibility: focus order, dialogs, live regions, status never colour alone, reduced motion, 24px targets.
   e. Copy: every visible string comes from `src/ui/copy.ts`; no leftover "Suspect", "skipped" for left-out results, or "Why" column text.
   f. Engine boundary and bundle: `src/engine` still has no UI imports; no test helper in `dist/`.
3. Every Critical and Important finding is fixed with a regression test that failed first, or recorded as a ruling with its cost if wrong. Minor findings are listed as deferred, not fixed.
4. Full unit suite, e2e suite, typecheck, lint and build green after the fixes.
5. The report lists every ruling from the whole branch and every deferred minor, so the user sees them before merging.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md` ("Review Focus"). Ledger: `.superpowers/sdd/2026-11-21-v0-ui/progress.md` (all `Ruling:` lines).
- Branch cut from `main` at `c33da85`. Review package: the executing-plans `review-package` script with that plan, merge base `c33da85` and HEAD.
- Follow the Final Review part of superpowers:executing-plans: one reviewer subagent on the most capable model, re-grade findings by effect on a user, one fix pass.

**Skills/Plugins:** superpowers:requesting-code-review, superpowers:finishing-a-development-branch, superpowers:verification-before-completion, security-review.

**Limitations/Restrictions:**
- No merge without the user's approval, no push, no Pages deploy.
- Design token changes are out of scope: contrast proposals go to the UI/UX chat.
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Review done, fixes verified, rulings and deferred minors reported to the planning chat.
- Merged into `main` with the user's approval; the plan workspace deleted afterwards.
