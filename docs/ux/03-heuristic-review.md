# FlakeLens UX 03: Heuristic Review of the MVP Wireframes

Run 2026-11-19 in the UI/UX chat. Target: the 6 boards in [wireframes/](wireframes/) ([canvas](https://claude.ai/artifact/TgaVPKws7Sm57HT8RUbEbX)).

**Method:** Impeccable critique, dual-agent. Assessment A was a design review: Nielsen's heuristics, cognitive load, Laws of UX, personas. Assessment B was the Impeccable detector plus mechanical WCAG checks. Cross-checked against Astryx (closest template `table-filter`, plus `Drawer` guidance) and Taste (a marketing-site skill, used only for its system rules).
**Limit:** a source review only. The boards render only inside the canvas runtime, so nothing was rendered, and the dark theme was not checked.

## 1. Score before fixes: 28/40 (Good)

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Tile filters have no visible pressed state |
| 2 | Match with the real world | 3 | "Flip rate" and "Score 62" are unexplained jargon |
| 3 | User control and freedom | 3 | Good exits. Clear-all has no undo (it is confirmed instead) |
| 4 | Consistency and standards | 2 | Numbers disagree across boards (run 11 vs 12, 1 vs 2 vs 3 notices). Two controls do the same filtering |
| 5 | Error prevention | 3 | Dialogs name their scope |
| 6 | Recognition rather than recall | 3 | The detail list drops status icons. The rank logic is not explained |
| 7 | Flexibility and efficiency | 3 | Keyboard-first, but no copyable summary |
| 8 | Aesthetic and minimalist design | 3 | Five bands above the first table row |
| 9 | Error recovery | 3 | No "did you mean" on a typo search |
| 10 | Help and documentation | 2 | Inline term definitions (insight I10) are missing |

## 2. Laws of UX applied

| Law | Finding | Fix applied |
|---|---|---|
| Hick | Tiles and a Status select set the same filter. Six status options plus an unclear "Show details" box | Tiles are now the only status filter. The select is removed. The checkbox is renamed "More columns" |
| Fitts | Only the test-name link opens a row. Sort and "Show" buttons are about 15px tall | The whole row is the target. Small buttons are now at least 28px |
| Jakob | j/k, `/`, `?` and Esc match GitHub, Gmail and Linear | Kept |
| Miller / Cowan | About 9 controls in the Tests header and toolbar | Down to about 5 |
| Tesler | Collecting several runs is pushed onto the user with no recipe | Start help now explains how to get the last 5 to 10 runs |
| Doherty | Per-file progress and filtering as you type are good | Added a live result count |
| Proximity | Wasted time sat apart from the status claim | Moved next to the badge |
| Common region | The "What this means" box works | Kept. Group headers now carry their own definition |
| Von Restorff | The mixed-commit outline isolates the evidence well | Added "mixed" to its accessible name |
| Serial position | Flaky first, Not enough data last | Kept |
| Goal gradient | No sense of progress through the top items | Open question (a "seen" mark) |
| Peak-end | The session ended on a stack trace with nothing to take away | Added "Copy summary" to the panel |

## 3. Priority issues and status

| Sev | Issue | Fix | Status |
|---|---|---|---|
| P1 | Evidence did not reconcile across boards (runs, notices, counts, "one file per run") | One canonical sample dataset across all 6 boards. Acceptance rule: **every number on screen must reconcile with the loaded data** | Fixed |
| P1 | No visible focus. Search set `outline: none`. Input border was 2.16:1 | `:focus-visible` 2px ring on every board. Input borders darkened to #6B7482 (4.8:1) | Fixed |
| P2 | Table buried under 5 bands, rows 52px | Banner and first-run hint merged into one band. Rows are one line, about 40px | Fixed |
| P2 | Detail list lost meaning (no icons, "1 of 214") | Icon plus word badges. Counter now counts visible rows | Fixed |
| P2 | No takeaway at the end of F4 | "Copy summary" in the panel (name, status, Why, wasted time) | Fixed |
| P3 | Terms undefined (Suspect, flip rate, score, mixed commit) | Definitions in group headers and in Score details | Fixed |

## 4. Accessibility fixes (WCAG 2.2 AA)

- **Text contrast:** already passed everywhere. The lowest was 5.82:1.
- **1.4.11 non-text contrast:** search and select borders were 2.16:1. Now 4.8:1.
- **2.4.7 focus visible:** added a focus ring. The selected row no longer uses an outline, so it can't be mistaken for focus.
- **Headings:** Tests and Test detail now have an `h1`, visually hidden where the layout has no title.
- **Status announcements:** a live region announces the result count. Collapsed groups expose `aria-expanded`, and the sort header exposes `aria-sort`.
- **Dialogs:** dialogs set `aria-modal="true"`. The clear dialog puts focus on Cancel.
- **Actions:** actions use `<button>`, not `<a href="#">`. Unicode arrows and × are replaced with SVG icons.
- **Small text:** commit labels went from 10px to 11px.

## 5. What Astryx and Taste added

- **Astryx:** `table-filter` is the closest template to Tests plus the detail pane, and it confirms the pattern. Its `Drawer` rules match decision Q1: non-modal for master-detail, a visible close button, Esc to close, and focus returns to the row. **For the planning chat:** Astryx is React with StyleX, while the spec picked Tailwind with shadcn/ui. That stack choice belongs to the planning chat, not here.
- **Taste:** it targets marketing sites, so most of it waits for a future landing page. Rules applied now: one link look and one button pair, buttons named as a verb plus an object ("Show 201 Stable tests"), and no scroll-driven motion. Its no-violet rule conflicts with the spec's violet Suspect status. The spec wins, because violet there is a status colour, not decoration.

## 6. Open questions

All answered, see below.

**Answered 2026-11-19:**
- Rank numbers show on Flaky rows only, in true fix-priority order. The other groups show no number.
- The Failing tile stays. The tiles are All, Flaky, Suspect and Failing.
- The "seen" mark (goal gradient) is a v1 idea, parked with the manual status override.
