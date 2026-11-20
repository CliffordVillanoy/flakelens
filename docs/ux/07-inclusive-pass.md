# FlakeLens UX 07: Inclusive Design Pass

Run 2026-11-20 in the UI/UX chat against WCAG 2.2 AA on all 16 boards (dark and light). Method: source audit, keyboard focus-order mapping, and colour-vision simulation (Machado 2009 matrices, severity 1.0).

## 1. Checklist

| WCAG / area | Result | Notes |
|---|---|---|
| 1.1.1 Text alternatives | Pass | Icon-only buttons have `aria-label`. Decorative SVGs are `aria-hidden`. Each run strip has a full `aria-label` |
| 1.3.1 Info and relationships | Pass after fix | `role=table`, row and column headers, `aria-sort`. **Fixed:** the Test detail board had no main landmark (now `role="main"`), and Import states and Edge states had no `h1` (added) |
| 1.4.1 Use of colour | **Fail (open)** | Run squares use colour only. See section 3 |
| 1.4.3 / 1.4.11 Contrast | Pass | Every text and UI pair is at least 4.5:1 or 3:1 in both themes (detector, plus manual checks during the colour passes) |
| 1.4.4 / 1.4.10 Resize and reflow | Pass | At 200% zoom a 1280px window becomes 640 CSS px, so the phone layout applies. No sideways scroll except data tables, which scroll inside their own box |
| 1.4.12 Text spacing | Pass, by construction | No fixed-height text boxes except table rows, and they use `min-height` |
| 2.1.1 Keyboard | Pass | Every control is a real `button`, `a`, `input` or `select` |
| 2.1.4 Character key shortcuts | Pass | Single-key shortcuts can be turned off and never fire while typing (Edge states, sheet F) |
| 2.4.1 Bypass blocks | Pass after fix | **Fixed:** added "Skip to results" on Tests and "Skip to test details" on Test detail |
| 2.4.3 Focus order | Pass | See the map in section 2 |
| 2.4.7 / 2.4.11 Focus visible, not obscured | Pass | 2px focus ring on every board. The sticky header must not cover a focused row: the build needs `scroll-padding-top` |
| 2.5.8 Target size (24px) | Pass | The smallest targets are the chip remove (24px) and dismiss (24 to 28px) buttons |
| 3.3.1 / 3.3.3 Error identification and suggestion | Pass | Import errors name the file, the problem and the fix |
| 4.1.3 Status messages | Pass | Live count `aria-live=polite`, toasts `role=status`, error toast `role=alert` |
| Reduced motion | Pass | The skeleton pulse stops. No other motion |
| Cognitive load | Pass | Plain-language glossary, definitions shown in place, one primary action per area |

## 2. Keyboard focus order

**Tests**
1. Skip to results (shows only on focus)
2. Data chip ("3 files · 12 runs · 3 not imported") opens Loaded data
3. Add your files, Leave sample, Theme, Help (?)
4. Banner: "see why" link, Dismiss
5. Status tiles: All, Flaky, Suspect, Failing. Each is a toggle with `aria-pressed`
6. Copy top Flaky tests
7. Search (`/` jumps here)
8. Columns, then Density: Compact, Comfortable
9. Wasted time sort (in the column header)
10. Group header "Show 201 Stable tests" button, where collapsed
11. Rows. Each row is one link. `j`/`k` move between rows, Enter opens the panel

**Test detail panel.** Opening it moves focus to the panel title. Esc or Close returns focus to the same row.
1. Panel title (`tabindex=-1`, the focus target)
2. Previous / Next test (`k` / `j`), Copy summary, Close
3. Run history "Show" select
4. Show previous failure, Copy error message
5. "How the score is built" disclosure

The panel is non-modal: Tab continues back into the list, so there is no focus trap.

## 3. Colour-only run squares: evidence

Simulated with deuteranopia, the most common colour-vision deficiency, which affects about 6% of men:

| Theme | Passed | Failed | Retry | Skipped |
|---|---|---|---|---|
| Dark, as designed | #3FB950 | #F85149 | #D29922 | #9198A1 |
| Dark, as a deuteranope sees it | **#AD9E58** | **#AA9A44** | #BDA928 | #9397A1 |
| Light, as designed | #1A7F37 | #CF222E | #BF8700 | #59636E |
| Light, as a deuteranope sees it | **#756B3D** | **#867826** | #AA970E | #5D616E |

Seen this way, **passed and failed look nearly the same** in both themes: the same olive, with a luminance difference under 0.05. A colour-blind SDET cannot read the strip, which is the main evidence for the Flaky label (insight I1). The legend and tooltips help, but they do not fix scanning.

**Decision needed:** add a non-colour cue to the failed square (and ideally the retry square), keeping the squares free of inner icons as you asked.

**Decided 2026-11-20 (user): hollow failed squares.**
- Failed is a 2px outline with an empty centre.
- Passed on retry is solid amber. The user changed it from half-filled on 2026-11-20.
- Passed and skipped stay solid.

This is applied to the list strip, the legend, the panel run history, the panel diffstat bar and the Table controls board, in both themes. WCAG 1.4.1 now passes.
