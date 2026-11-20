# Spec sync list

**Merged 2026-11-20 into `docs/SPEC.md` by the planning chat. The Downloads copy is retired.**

**Applied 2026-11-20:** items 1 to 14 and the additions (15 to 20, as a new section 13.3) were written into the spec. A backup of the previous version is `Flaky Test Triage Assistant Updated Project Spec.backup-2026-11-20.md` in the same folder.

Checked 2026-11-20 against the earlier standalone spec file (`Flaky Test Triage Assistant Updated Project Spec.md`) (928 lines). The spec is owned by the planning chat, so nothing here is edited yet. Line numbers are from that file.

## A. Wording and names (must change)

| # | Spec location | Says now | Change to |
|---|---|---|---|
| 1 | L34, L78, L229, L469, L552, L569, L796, L905 to 906 (labels and status table) | **Suspect** | **Unproven**. Keep `suspect` as the internal value if wanted. L197 and L203 ("order-dependence suspects") are a different use and can stay |
| 2 | L569 status note | "…so it could be a real regression." | "…so it could be flaky or a real bug." (the board's group line) |
| 3 | L472 status table | Not enough data → label "No data" | Label **Not enough data** (L552 and L572 already say this) |
| 4 | L148, L156, L172, L525, L542 (import rules and screen parts) | records left out are "**skipped**" | **not imported**. "Skipped" stays only for the test status Playwright reports, such as a hollow circle in the old glyph list |
| 5 | L553 column list | column **Why**, example "Passed and failed on the same commit in 3 of 12 commits" | column **Evidence**; example "3 of 9 commits had both a pass and a fail" (number first, per the copy guide) |
| 6 | L587 pros and cons | "through the Why column" | "through the Evidence column" |

## B. Design decisions (must change)

| # | Spec location | Says now | Change to |
|---|---|---|---|
| 7 | L474 run-history glyphs | filled square pass, triangle fail, diamond retry, hollow circle skipped | **Squares:** passed solid green, passed on retry solid amber, failed hollow red outline, skipped solid gray. Shape plus colour, no inner marks |
| 8 | L469 to 472 status table, icon column | every status has an icon | Status pills show **label only** (no icon). Icons remain on the filter tabs for Flaky, Unproven and Failing |
| 9 | L458 spacing | "Compact table rows around 32px" | **Comfortable 40px (default)**, **Compact 32px (option)**, switchable per browser. The Comfortable rows on the ranked table are 56px minimum with two lines (name and path) |
| 10 | L543, L560 default sort | "sorted by fix priority by default" | **Grouped by status** (Flaky, Unproven, Failing, Stable, Not enough data), fix priority inside Flaky. This matches decision 20.1 at L905, which 13.2 contradicts |
| 11 | L490 Dashboard screen | "summary tiles for tests analysed, confirmed flaky and wasted minutes" | A **Test health box** (stacked status bar, legend, wasted time) with **status tabs** (All, Flaky, Unproven, Failing, each with a count). No tiles |
| 12 | L487 to 493 screen list | 5 screens: Import, Dashboard, Test detail, Settings, Report | MVP screens are: **Start** (the Import screen becomes an empty state), **Tests**, **Test detail panel**, **Loaded data**. Add **Edge states**, **State matrix** and **Table controls** as design reference boards. Settings and Report stay v1 |
| 13 | L495 interaction notes | `e` to export | Export is a menu ("⤓ Export ▾") with Copy top Flaky tests (works in MVP), Download CSV and Download JSON (v1). Add shortcuts `Enter` and `Esc`; single-key shortcuts can be switched off |
| 14 | L453 design system intro | "Dark theme by default with a light option" | Add: both themes are built; theme switch is an icon-only button in the header |

## C. Additions (not in the spec at all)

| # | Item | Where it lives |
|---|---|---|
| 15 | Sample data held **in memory only**, never mixed with the user's files; "Exit sample" is a link in the sample banner | `02-information-architecture.md`, DESIGN.md |
| 16 | Engine needs an **import record** (file name, time, result, counts, notices) linked to the runs it created, for the Loaded data screen | `02-information-architecture.md` |
| 17 | Header holds the logo, the privacy line, "Add your files" and icon buttons only. Data summary lives in the Test health box and the Loaded data lead | DESIGN.md |
| 18 | Logo: open ring with three dots, "Flake" plus a blue "Lens". Vector files needed for the build | `docs/ux/brand/` |
| 19 | Pill geometry, 22px × 76px minimum, and the new copy rules (glossary, grade 8 reading level) | DESIGN.md, `04-ux-copy.md`, `08-plain-language.md` |
| 20 | Versioning: v0 first build, then v0.1, v0.2 and so on to enterprise production level | `00-handoff-v0.md` |

## D. Already consistent

Stack (Tailwind, shadcn/ui, Lucide), Playwright JSON first, rules-first detection, privacy default, status notes for Flaky, Failing, Stable and Not enough data (L568 to L572, except the quarantine tip wording), Wilson-based score, thresholds in one config.

## E. Spec items the UX work still leaves open

- Status note for Flaky (L568): the board adds "Tip: while you investigate, quarantine it in CI so it can't block merges." and replaces "The environment, such as a slow or unavailable service" with "Slow or unavailable services the test needs".
- L458 says the WCAG 2.2 target size is "as I recall it". It is confirmed: 24 × 24 CSS px minimum.
