# DEV-47: Failed run square is filled, and More to check is indented

**Status:** Done locally (2026-11-28, commits `cf777cf` filled failed run square, `ce2e5e6` More to check indent and `70d679b` filled diffstat on `feat/dev-47-filled-failed-square` from origin/main c00759c, worktree `flakelens-dev47`; dev chat reports 1191 unit + 62 e2e, typecheck, lint, build clean, axe both themes; failed red contrast 5.03:1 to 5.65:1). Not pushed or merged. No hollow red square remains; no new copy.

**Goal:** The run strip reads as one consistent set: the failed square is solid red like the other squares, not a 2px outline.

**Objectives:**
- Fill the failed square; keep the meaning clear without a shape cue.
- Indent the opened "More to check" block so the toggle shows what it revealed.

**Scope:** Frontend (small).

**Acceptance Criteria:**
1. `src/ui/components/RunStrip.tsx` (about line 13): the failed rect becomes a filled rect that matches the passed square (16-unit viewBox, rx 3, no inner mark, fill `--status-failing`). Passed stays green, passed on retry amber, skipped gray. Update the file's header comment, which still says "failed hollow red".
2. Every place that draws a run square (the Last 12 runs strip, the run-history grid, the Run timeline from DEV-41 if it is merged) uses the same component, so none keeps the outline. Search the code and the tests for the hollow shape (`stroke`, `fill="none"`, "hollow").
3. Colour-blind safety (owner accepted dropping the shape cue, 2026-11-27): meaning now rests on colour, each square's accessible name (for example "Run 6, commit c4: failed"), the tooltip and the Evidence text on the same row. Keep every per-square accessible name and test that failed, passed, passed on retry and skipped squares each have a distinct name. Add no new visible text.
4. Update `src/ui/screens/Tests.test.tsx` (it asserts the hollow shape) and any other test that does; add a test that the failed and passed squares are both filled rects.
5. axe clean in both themes (red on both backgrounds stays visible, non-text contrast at least 3:1); e2e still green.
6. "More to check" indent (owner request via UI/UX, 2026-11-28): in the test panel the opened block's bullets and its Tip line sit at the same left edge as "What to check next". Indent the opened content from the summary text: bullets start about 38px from the block's left edge (the outer list's 18px plus 20px more), the Tip line gets a 20px left margin, same muted tones, the summary and its triangle stay where they are. Apply the same to the closed block on the full test page if it has one, so both agree. Test: the opened list has a larger left offset than the "What to check next" list, or a class check. No new copy; axe stays clean.
7. Diffstat (UI/UX decision 2026-11-28): in the panel's file header (`FileHeaderBar` in `PanelParts.tsx`, five 8px squares, rx 2) the failed part becomes solid too, using the same fill token `--status-failing`; remove `border-2` and update its test. No hollow red square may remain in the app (search `border-2` on red). Design note: `DESIGN.md` "Diffstat squares are filled too (2026-11-28)".

**Details:**
- Design for item 6: `DESIGN.md` note "More to check is indented (2026-11-28)"; TestDetail board dark and light.
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
