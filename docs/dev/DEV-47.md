# DEV-47: Failed run square is filled

**Status:** To do

**Goal:** The run strip reads as one consistent set: the failed square is solid red like the other squares, not a 2px outline.

**Objectives:**
- Fill the failed square; keep the meaning clear without a shape cue.

**Scope:** Frontend (small).

**Acceptance Criteria:**
1. `src/ui/components/RunStrip.tsx` (about line 13): the failed rect becomes a filled rect that matches the passed square (16-unit viewBox, rx 3, no inner mark, fill `--status-failing`). Passed stays green, passed on retry amber, skipped gray. Update the file's header comment, which still says "failed hollow red".
2. Every place that draws a run square (the Last 12 runs strip, the run-history grid, the Run timeline from DEV-41 if it is merged) uses the same component, so none keeps the outline. Search the code and the tests for the hollow shape (`stroke`, `fill="none"`, "hollow").
3. Colour-blind safety (owner accepted dropping the shape cue, 2026-11-27): meaning now rests on colour, each square's accessible name (for example "Run 6, commit c4: failed"), the tooltip and the Evidence text on the same row. Keep every per-square accessible name and test that failed, passed, passed on retry and skipped squares each have a distinct name. Add no new visible text.
4. Update `src/ui/screens/Tests.test.tsx` (it asserts the hollow shape) and any other test that does; add a test that the failed and passed squares are both filled rects.
5. axe clean in both themes (red on both backgrounds stays visible, non-text contrast at least 3:1); e2e still green.

**Details:**
- Design: `DESIGN.md` section "Run squares: failed is filled (2026-11-27)"; boards Tests and TestDetail (dark and light) at canvas v89.
- Owner request, relayed by UI/UX. Planning updated `docs/SPEC.md` (the run-square sentence) and `docs/ux/spec-sync-list.md` row 7 to "failed solid red".
- Needs first: nothing. Best done before DEV-46 (v1 review).

**Skills/Plugins:** superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md).

**Limitations/Restrictions:**
- Version control (branches, pull requests, merges, tags, version numbers) and every CI/CD change belong to the Project Dev Ops chat. Work on the branch the Dev Ops chat names; commit only task files; no push, no merge.
- Visible text only from `src/ui/copy.ts`; list every new interim copy key in the report (none expected).
- No new network calls, accounts or secrets or dependencies.
- Plain commit messages, no Claude attribution.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` and `npm run e2e` green.
- Committed on the branch named by the Dev Ops chat; development report sent to the planning chat.
