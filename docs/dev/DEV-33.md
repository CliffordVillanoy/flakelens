# DEV-33: Real-data check of the flaky detector

**Status:** To do

**Goal:** Finish the flaky detector's definition of done (spec 11.1 item 5): check it on messier real-world data and publish the result, even if modest.

**Objectives:**
- Decide first whether a public dataset is usable.
- Run the engine on it and publish precision and recall with the limits.

**Scope:** Backend (evaluation).

**Acceptance Criteria:**
1. Go or no-go first: inspect the IDoFT list (Illinois) and the Zenodo regression-test history for Maven (FTW 2024). Record licence, format, size and whether per-commit pass and fail outcomes exist. If neither is usable, report Blocked with the facts and propose alternatives (for example public CI JUnit artifacts from open-source projects with documented flaky tests). No guessing.
2. If usable: converter scripts in `scripts/real-data/` write JUnit XML (or canonical records) into `.cache/real-data/` (git-ignored). Raw data is never committed; a tiny excerpt only if the licence allows.
3. Run the engine; ground truth is the dataset's own flaky labels. Report precision, recall and F1 at several history lengths (spec 17), plus the top false positives and false negatives with short reasons, and the baseline "any retry-based flaky mark" when the data has retries.
4. `docs/eval/real-data-detection.md` holds method, dataset citation and licence, numbers and limits. The README links it only after numbers exist.
5. Do not change thresholds in `src/engine/config.ts`; record suggestions. Any change is its own ticket with the flake lab rerun.
6. No work data is used (spec: only anonymized and with permission).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-25-v1.md`. Needs first: DEV-32.
- Spec: sections 11.1 item 5, 16 (public datasets), 17.
- Datasets are large: keep everything under `.cache/` on the D: drive.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion.

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
