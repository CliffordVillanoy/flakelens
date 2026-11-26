---
name: FlakeLens
description: Flaky-test triage that reads like the code review an SDET already does every day.
colors:
  canvas: "#0D1117"
  surface: "#161B22"
  neutral-muted: "#21262D"
  border-default: "#30363D"
  border-muted: "#21262D"
  border-emphasis: "#6E7681"
  fg-default: "#E6EDF3"
  fg-secondary: "#C9D1D9"
  fg-muted: "#A4ABB4"
  fg-on-emphasis: "#FFFFFF"
  accent-fg: "#4493F8"
  accent-fg-hover: "#79C0FF"
  accent-subtle: "#121D2F"
  success-emphasis: "#238636"
  success-fg: "#3FB950"
  success-subtle: "#12261E"
  success-gutter: "#1B3A26"
  attention-fg: "#D29922"
  attention-text: "#E3B341"
  attention-subtle: "#4A3A12"
  done-fg: "#AB7DF8"
  done-text: "#C297FF"
  done-subtle: "#3C2A63"
  danger-emphasis: "#B62324"
  danger-fg: "#F85149"
  danger-text: "#FF7B72"
  danger-subtle: "#3A1B1F"
  danger-line: "#25171C"
  new-fg: "#39C5CF"
  success-emphasis-hover: "#196C2E"
  success-emphasis-pressed: "#145A26"
  danger-emphasis-hover: "#DA3633"
  danger-emphasis-pressed: "#8E1519"
  disabled-fg: "#848D97"
  success-emphasis-hover-light: "#116329"
  success-emphasis-pressed-light: "#0F5323"
  danger-emphasis-hover-light: "#A40E26"
  danger-emphasis-pressed-light: "#8C0C1F"
  disabled-fg-light: "#656D76"
  new-subtle: "#0F3A3D"
  new-fg-light: "#0B6B73"
  new-subtle-light: "#D5F5F6"
  danger-badge: "#5A1E22"
  success-badge: "#1A3D26"
  accent-muted: "#1B3358"
  accent-border: "#1F6FEB"
  border-control: "#3D444D"
  surface-hover: "#262C36"
  canvas-light: "#F6F8FA"
  surface-light: "#FFFFFF"
  surface-hover-light: "#E6EAEF"
  secondary-fill-light: "#EFF2F5"
  secondary-border-light: "#C3CCD5"
  neutral-badge-light: "#D8DEE4"
  border-muted-light: "#D8DEE4"
  border-default-light: "#D1D9E0"
  border-emphasis-light: "#818B98"
  fg-default-light: "#1F2328"
  fg-secondary-light: "#393F46"
  fg-muted-light: "#4F5A65"
  accent-fg-light: "#0969DA"
  link-light: "#0860CA"
  accent-fg-hover-light: "#0550AE"
  accent-subtle-light: "#DDF4FF"
  accent-muted-light: "#B6E3FF"
  accent-border-light: "#54AEFF"
  success-fg-light: "#1A7F37"
  success-text-light: "#116329"
  success-subtle-light: "#ACEEBB"
  success-line-light: "#E6FFEC"
  success-gutter-light: "#CCFFD8"
  attention-fg-light: "#BF8700"
  attention-text-light: "#7D4E00"
  attention-subtle-light: "#FFE58F"
  done-fg-light: "#8250DF"
  done-subtle-light: "#E8D9FF"
  done-text-light: "#6639BA"
  danger-fg-light: "#CF222E"
  danger-text-light: "#A40E26"
  danger-subtle-light: "#FFEBE9"
  danger-gutter-light: "#FFCECB"
  danger-border-light: "#FF8182"
  danger-border: "#6E2B2B"
typography:
  display:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
  headline:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  title:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  title-sm:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
  heading:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  body-sm:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  count:
    fontFamily: "Mona Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    fontFeature: "tnum"
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "20px"
  mono-sm:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "11px"
    fontWeight: 400
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "14": "56px"
components:
  button-primary:
    backgroundColor: "{colors.success-emphasis}"
    textColor: "{colors.fg-on-emphasis}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-primary-lg:
    backgroundColor: "{colors.success-emphasis}"
    textColor: "{colors.fg-on-emphasis}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.neutral-muted}"
    textColor: "{colors.fg-default}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.danger-emphasis}"
    textColor: "{colors.fg-on-emphasis}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
  button-invisible:
    backgroundColor: "transparent"
    textColor: "{colors.accent-fg}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "28px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg-default}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
  box:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  box-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg-default}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "40px"
  box-row-selected:
    backgroundColor: "{colors.accent-subtle}"
  label-flaky:
    backgroundColor: "{colors.attention-subtle}"
    textColor: "{colors.attention-text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  label-suspect:
    backgroundColor: "{colors.done-subtle}"
    textColor: "{colors.done-text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  label-failing:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.danger-text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  label-stable:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.success-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  label-not-enough-data:
    backgroundColor: "{colors.neutral-muted}"
    textColor: "{colors.fg-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  chip-data-source:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.accent-fg-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: "24px"
  app-header:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg-default}"
  diff-line-removed:
    backgroundColor: "{colors.danger-line}"
    textColor: "{colors.fg-default}"
    typography: "{typography.mono}"
  diff-gutter-removed:
    backgroundColor: "{colors.danger-subtle}"
    textColor: "{colors.fg-secondary}"
    typography: "{typography.mono}"
    width: "36px"
  diff-line-added:
    backgroundColor: "{colors.success-subtle}"
    textColor: "{colors.fg-default}"
    typography: "{typography.mono}"
  diff-gutter-added:
    backgroundColor: "{colors.success-gutter}"
    textColor: "{colors.fg-secondary}"
    typography: "{typography.mono}"
    width: "36px"
  diff-hunk-header:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.fg-muted}"
    typography: "{typography.mono}"
    padding: "4px 12px"
---

# Design System: FlakeLens

## Overview

**Creative North Star: "The Review Thread"**

FlakeLens borrows the visual language of a hosted code-review screen: a dark canvas, bordered boxes with header bars, CI check marks against commits, file headers with a diffstat, and diff hunks with red and green lines. It does not look like a monitoring dashboard. The SDET reads test evidence the same way they read a pull request. The interface feels familiar on first contact because it follows a convention the user already trusts. It does not try to invent a new one.

The density is a working tool's density. Rows are compact (40px), controls are 28 to 40px tall, and type sits mostly at 12 to 14px. Hierarchy comes from weight, tone and borders, not from size jumps or decoration. Surfaces are flat. The near-black canvas (#0D1117) and the raised box surface (#161B22) are separated by 1px borders, never by shadow. Colour is reserved for meaning. Blue is for links, focus and selection. Green is the single primary action and a passing result. Amber, violet and red are test statuses, and each always comes with an icon and a word.

The inspiration is described here only. No product UI may carry a third-party name, logo or icon artwork. The look is built from open parts: Primer-style colour roles, Mona Sans (OFL) and JetBrains Mono, all self-hosted.

**Key Characteristics:**
- Dark by default. The light theme is built on the boards with Primer-style light roles (see Light theme below).
- Bordered boxes with header bars and row dividers. Flat, with no shadows or gradients.
- Evidence uses code-review devices: a run strip per test, a file-header bar with a diffstat, and the latest failure as a diff hunk.
- Each status has three tones: an icon tone, a text tone and a subtle fill. A status label is always shown as an icon plus a word. The run strip is the one recorded exception (see Components).
- Machine text such as paths, SHAs, errors and keys is set in JetBrains Mono. Everything else is set in Mona Sans.

## Colors

The palette is a cool near-black neutral ramp with one blue interaction accent and four semantic hues. The hues carry status and never decorate.

### Primary
- **Merge Green** (success-emphasis): the fill of the one primary action per view, such as "Add your files", "Browse files" or "Analyse my files". White text on top.
- **Review Blue** (accent-fg): links, the 2px focus ring, the logo stroke, progress fill and the border of the pressed filter. Its hover tone (accent-fg-hover) also colours the data-source chip text.
- **Selection Navy** (accent-subtle): the fill for selected and informational surfaces. It is used for the selected list row, the pressed filter, the info banner, the data-source chip and the diff hunk header.

### Secondary (status roles)
- **Flaky Amber**: attention-fg for icons, the passed-on-retry run square and the mixed-commit outline; attention-text for label text; attention-subtle for the label fill. Warning notices use attention-fg icons.
- **Unproven Violet**: done-fg for icons, done-text for label text, done-subtle for the label fill.
- **Failing Red**: danger-fg for the failed run square, diff "−" marks and the diffstat count; danger-text for label text; danger-subtle for the label fill and the removed-line gutter; danger-line for removed diff lines and error callouts; danger-emphasis only as the fill of a destructive button, both the in-page action and its confirm.
- **Stable Green**: success-fg for the passed run square, the "+" diffstat, added diff marks and the privacy line; success-subtle for added diff lines and the "Imported" label; success-gutter for the added-line gutter.
- **Not enough data Gray**: neutral-muted fill with fg-secondary text.
- **New Teal** (new-fg, planned): reserved for the "New" status. It has no Primer role and is not drawn on any board yet. Its subtle fill and text tones are to be resolved when it is built.

### Neutral
- **Canvas** (canvas): the page ground, and the inset for "What this means" note blocks inside a box.
- **Box Surface** (surface): the app header, boxes, cards, dialogs, the detail panel, inputs and icon buttons.
- **Muted Fill** (neutral-muted): the secondary button fill, progress tracks and the "Not enough data" label fill.
- **Hairline** (border-default): every box, card, header and control border.
- **Row Divider** (border-muted): the 1px top border between rows and groups inside a box.
- **Control Edge** (border-emphasis): the stronger border on text inputs, selects and toggle-style controls, and the dashed drop zone.
- **Text** (fg-default), **Secondary Text** (fg-secondary) and **Muted Text** (fg-muted): the main, supporting and meta text tones. Muted is used for counts, file paths, SHAs, hints and column meta.

### CSS variable map (Tailwind + shadcn/ui)

Each variable resolves to a frontmatter token. The frontmatter is normative. Define the variables on `:root` under the dark theme and map them into the Tailwind theme.

| CSS variable | Token | Notes |
|---|---|---|
| `--background` | `{colors.canvas}` | Page ground |
| `--foreground` | `{colors.fg-default}` | |
| `--card`, `--popover` | `{colors.surface}` | Boxes, dialogs, panel |
| `--card-foreground`, `--popover-foreground` | `{colors.fg-default}` | |
| `--primary` | `{colors.success-emphasis}` | Primary action is green |
| `--primary-foreground` | `{colors.fg-on-emphasis}` | |
| `--secondary` | `{colors.neutral-muted}` | Secondary button fill |
| `--secondary-foreground` | `{colors.fg-default}` | |
| `--muted` | `{colors.neutral-muted}` | |
| `--muted-foreground` | `{colors.fg-muted}` | |
| `--accent` | `{colors.accent-subtle}` | shadcn hover/selected surface, not the link blue |
| `--accent-foreground` | `{colors.fg-default}` | |
| `--destructive` | `{colors.danger-emphasis}` | |
| `--destructive-foreground` | `{colors.fg-on-emphasis}` | |
| `--border` | `{colors.border-default}` | |
| `--border-muted` | `{colors.border-muted}` | Custom: row dividers |
| `--input` | `{colors.border-emphasis}` | Control edge |
| `--ring` | `{colors.accent-fg}` | |
| `--link`, `--link-hover` | `{colors.accent-fg}`, `{colors.accent-fg-hover}` | Custom |
| `--fg-secondary` | `{colors.fg-secondary}` | Custom |
| `--status-flaky`, `--status-flaky-text`, `--status-flaky-subtle` | `{colors.attention-fg}`, `{colors.attention-text}`, `{colors.attention-subtle}` | Custom |
| `--status-suspect`, `-text`, `-subtle` | `{colors.done-fg}`, `{colors.done-text}`, `{colors.done-subtle}` | Custom |
| `--status-failing`, `-text`, `-subtle` | `{colors.danger-fg}`, `{colors.danger-text}`, `{colors.danger-subtle}` | Custom |
| `--status-stable`, `-subtle` | `{colors.success-fg}`, `{colors.success-subtle}` | Custom |
| `--status-none`, `-subtle` | `{colors.fg-secondary}`, `{colors.neutral-muted}` | Custom: Not enough data |
| `--status-new` | `{colors.new-fg}` | Custom, planned |
| `--diff-del`, `--diff-del-gutter` | `{colors.danger-line}`, `{colors.danger-subtle}` | Custom |
| `--diff-add`, `--diff-add-gutter` | `{colors.success-subtle}`, `{colors.success-gutter}` | Custom |
| `--radius` | `{rounded.lg}` | shadcn derives md = 6px and sm = 4px, which matches |

**Light theme (built on the boards 2026-11-19, `*Light.dc.html`).** The same variable names are re-pointed under `[data-theme="light"]`. The light boards use these values, and the detector found no contrast failures in them.

| Dark | Light | Role |
|---|---|---|
| #0D1117 | #F6F8FA | canvas, page ground |
| #161B22 | #FFFFFF | surface: boxes, panel, dialogs |
| #262C36 | #E6EAEF | row hover, group header |
| #21262D | #EFF2F5 button fill, #C3CCD5 button edge / #D8DEE4 divider and Not enough data badge | secondary button, row dividers, gray badge |
| #30363D | #D1D9E0 | border-default |
| #6E7681 | #818B98 | border-emphasis (control edge, 3.4:1 on white) |
| #E6EDF3 | #1F2328 | fg-default |
| #C9D1D9 | #393F46 | fg-secondary |
| #9198A1 | #59636E | fg-muted (5.8:1 on #F6F8FA) |
| #4493F8 / #79C0FF | #0969DA / #0550AE | link and focus / link hover |
| #121D2F | #B6E3FF selection, pressed tile, Sample tag / #DDF4FF + #54AEFF edge for info band and diff hunk header | selection, accent-subtle |
| #238636 | #1A7F37 | primary fill (white text 5.1:1) |
| #B62324 | #B62324 | danger fill (unchanged) |
| #3FB950 / #12261E | #1A7F37 / #ACEEBB (badge text #116329) | success: run square, Stable badge |
| #D29922, #E3B341 / #4A3A12 | #BF8700, #7D4E00 / #FFE58F | attention: run square, Flaky text / fill |
| #AB7DF8, #C297FF / #3C2A63 | #8250DF, #6639BA / #E8D9FF | done: Unproven |
| #F85149, #FF7B72 / #3A1B1F | #CF222E, #A40E26 / #FFCECB | danger: run square, Failing text / fill |
| #25171C / #3A1B1F | #FFEBE9 / #FFCECB | diff deleted line / gutter |
| #12261E / #1B3A26 | #E6FFEC / #CCFFD8 | diff added line / gutter |

In light, the run squares use #1A7F37, #BF8700, #CF222E and #59636E. Every square keeps at least 3:1 against white, the WCAG minimum for graphics, and the amber reads as yellow, not brown. `color-scheme` switches to `light`. The theme button offers the other theme ("Dark" in light, "Light" in dark).

### Named Rules
**The Status Has Three Tones Rule.** Every status uses a strong tone for its icon, a lighter text tone for its word, and a dark subtle fill behind both. Never use the icon tone as label text or as a label fill. The run squares are the only shapes filled with an icon tone.

**The One Green Button Rule.** Merge Green fills at most one button per view region, and that button is the primary action. Passing results use the green icon tone (success-fg), never the button fill.

**The Controls Inherit Rule.** This is a foundation rule on every surface. The root sets `color-scheme: dark`. Buttons, inputs, selects, textareas and summaries set `color: inherit`. Placeholders use Muted Text (fg-muted) at full opacity. Without these, native controls render black text on the dark ground. In the light theme the scheme switches to `light`.

**The Blue Is For Interaction Rule.** Review Blue means link, focus or selection. It never marks a status.

## Typography

**Body Font:** Mona Sans (with system-ui, sans-serif), self-hosted, weights 400, 500, 600 and 700.
**Mono Font:** JetBrains Mono (with monospace), self-hosted, weight 400.

**Character:** A neutral, slightly wide grotesk carries the interface. A coding mono marks anything a machine produced. The pairing reads like a review tool, not like a marketing page.

### Hierarchy
- **Display** (700, 28px): the single page title on the start screen ("Find your flaky tests").
- **Headline** (700, 24px): page titles on secondary screens such as Loaded data.
- **Title** (700, 20px): the test name at the top of the detail panel.
- **Title small** (600, 17px): dialog titles and the drop-zone call.
- **Heading** (600, 15px): section heads inside a panel ("Run history", "Latest failure") and empty-state titles.
- **Body** (400, 14px): default reading text, row text, banners and dialog copy. Lists and notes use the same size.
- **Body small** (400, 13px): button and control text, group headers, captions and meta lines.
- **Label** (600, 12px): status labels, the data-source chip, column headers and diffstat counts.
- **Count** (700, 24px, tabular figures): the large number in each filter tile and the wasted-time figure.
- **Mono** (400, 12px, 20px line height): diff lines, hunk headers, file paths and `kbd` keys. Inline `code` in prose uses 13px.
- **Mono small** (400, 11px): commit SHAs under the run-history columns.

### Named Rules
**The Machine Text Is Mono Rule.** File paths, commit SHAs, error output, commands and keyboard keys are set in JetBrains Mono. Human sentences never are.

**The Tabular Numbers Rule.** Ranks, counts, durations and diffstats use tabular figures so columns line up.

## Layout

The layout uses a 4px base grid. Spacing tokens are the on-grid steps observed in the build: 4, 8, 12, 16, 20, 24, 32, 40 and 56px.

- **App header:** full width, 24px side padding, with the brand, data chip and privacy line on the left and actions on the right. It wraps on narrow screens.
- **Containers:** the ranked list is capped at 1232px with 24px gutters. The Loaded data page is capped at 960px. The start screen column is capped at 720px with 56px top padding.
- **Sections** stack with 20px gaps. The ranked list currently uses an off-grid 14px gap, which is drift and not a step. Inside a box, rows are 40px tall minimum with 12px cell padding. Group header rows are 36px tall.
- **List and detail:** the detail panel opens to the right of the list (flex basis 520px, max 600px) with a 1px left border. The list keeps a 420px basis and stays usable while the panel is open. Below a combined width of about 940px, the panel wraps under the list.
- **Responsive:** wide tables scroll horizontally inside their box (the ranked table has a 1040px minimum). Header actions, filter tiles and button groups wrap with flex-wrap. Board grids use `auto-fit` with `minmax(min(100%, …), 1fr)`.

## Elevation & Depth

The system is flat. There are no box shadows and no gradients anywhere, including dialogs. Depth comes from two tonal layers, canvas under surface, plus 1px borders. A third tone appears only as an inset: canvas used again inside a surface for note blocks. Selection changes the fill to accent-subtle. Row hover and group-header rows use a third tone, #262C36, one step above the surface. Focus is a 2px Review Blue outline with a 2px offset.

### Named Rules
**The Flat Box Rule.** A container is a surface fill plus a 1px hairline border. If something needs to stand out, change its fill tone or its border, never add a shadow.

## Shapes

Corners are gently rounded and consistent by role. Controls (buttons, inputs, selects, the file-header bar and the diff box) use 6px. Boxes, cards, banners, dialogs and filter tiles use 8px. Small marks (keyboard keys and the commit column outline) use 4px. Run squares use a 3px corner on a 16px box (rx 3 in a 16-unit viewBox, so about 2.25px at 12px). Diffstat squares use 2px. Labels and chips are full pills. With shadcn `--radius: 8px`, its derived `md` (6px) and `sm` (4px) land on these same values.

Borders are always 1px solid, with three exceptions: the drop zone is a 2px dashed Control Edge, the pressed filter tile is a 2px Review Blue border, and the mixed-commit outline is 1.5px Flaky Amber.

## Components

### Buttons
Quiet, compact and conventional. The family has three filled variants plus an invisible text button. There is no outline-only danger variant.
- **Shape:** 6px radius. Heights are 28px (inline and table), 32px (header and panel), 36px (dialogs and states) and 40px (drop zone).
- **Primary:** Merge Green fill, white 600-weight text, no border. One per region.
- **Secondary:** Muted Fill with a 1px Hairline border and Text colour. It is used for every non-primary action.
- **Danger:** a Destructive Red fill (danger-emphasis) with a matching border and white 600-weight text. The in-page "Clear all data…" and its dialog confirm use the same button. In the dialog, focus starts on the safe choice.
- **Invisible:** transparent, Review Blue 600-weight text. Used for "Show 201 Stable tests" and "Show all 12 runs".
- **Icon buttons:** 32×32 (or 28×28 for dismiss) on Box Surface with a Hairline border and a 16px stroke icon. They always carry an `aria-label`.
- **Focus:** a 2px Review Blue outline with a 2px offset. Hover tones are not drawn on the boards yet.

### Labels and chips
- **Status label:** a full pill, 24px tall (22px in the compact list), 8px side padding and a 12px/600 word, with a 14px stroke icon in currentColor before the word. It uses the status text tone on the status subtle fill.
- **Data-source chip:** a Selection Navy pill with hover-blue text ("Sample data").

### Boxes and lists
- **Corner Style:** 8px.
- **Background:** Box Surface on Canvas.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** a 1px Hairline outside and 1px Row Divider between rows.
- **Internal Padding:** 12px for cells; 12 to 16px for list rows; 16 to 20px for cards and dialogs.
- **Row:** the whole row is one link. The selected row uses Selection Navy with 600 weight. Hover uses #262C36.

### Inputs and fields
- **Style:** Box Surface fill, 1px Control Edge border, 6px radius and 36px height, with a 16px muted search icon and a trailing `kbd` hint.
- **Focus:** the global 2px Review Blue ring.
- **Select:** 28px tall, same edge and radius.

### Navigation
- **App header:** a Box Surface bar with a bottom Hairline. It holds the stroke logo mark in Review Blue with a 16px/700 wordmark, the data-source chip, a file-count control and the green privacy line. The primary action, theme toggle and help button sit on the right.
- **Keyboard hints:** `kbd` keys in mono 12px with a 1px Hairline border, 4px radius and Box Surface fill.

### Status filter (as built)
Four filter tiles (All, Flaky, Unproven, Failing) show a 13px label with a status icon over a 24px tabular count, next to a wasted-time card. The pressed tile has a Selection Navy fill and a 2px Review Blue border. The direction contract asked for segmented counters inside a box-header filter bar. Treat the tile form as provisional, not as a pattern to repeat.

### Run strip (signature)
Each ranked row shows the last 12 runs, oldest first, as a row of plain filled rounded squares. Each square is an SVG rect with rx 3 in a 16-unit viewBox and no inner mark. The colours are: passed in success-fg, failed in danger-fg, passed on retry in attention-fg and skipped in fg-muted. In the ranked list the squares are 12px with a 3px gap. In run history they are 16px and stack vertically when a run had retries, with the SHA beneath in mono 11px. A mixed commit gets a 1.5px Flaky Amber outline with a 4px radius. The legend uses 14px squares, each followed by its word.

Screen readers get the full meaning. In the ranked list, the whole strip carries one `role="img"` label that spells out every run in words. In run history, each run column carries its own label.

**Known accessibility trade-off.** The squares carry meaning by colour alone, which conflicts with the product rule that status is an icon plus a word. The user chose this on 2026-11-19. Three things carry the meaning: the colour, the legend and the aria-labels. The trade-off covers the run strip only. Status labels, banners and every other status device keep icon plus word. Before the real build, check that each fill meets 3:1 against the surface and that the colours stay distinguishable under the common colour-vision deficiencies. Passed (green) and failed (red) are the pair most at risk.

### File-header bar (signature)
A 6px-radius bar with a Hairline border that holds the test file path and project in mono 12px. On the right is a diffstat of attempts: a "+N" count in success-fg, a "−N" count in danger-fg, five 8px squares (2px radius) split in proportion, and the word "attempts".

### Diff hunk (signature)
The latest failure is drawn as a diff box with a 1px Hairline border, a 6px radius and clipped corners. The hunk header ("@@ run 12 · attempt 1 → 2 · same commit @@") sits on Selection Navy in muted mono. The failed attempt's lines are removed lines: a danger-line row, a danger-subtle 36px gutter and a danger-fg "−". The retry that passed is an added line: a success-subtle row, a success-gutter and a success-fg "+". All lines are mono 12px on a 20px line height and wrap long tokens.

### Banners and dialogs
- **Banner:** an 8px box with a 20px status icon, a 600-weight first line and a muted second line, plus a 28px dismiss button. The info variant uses a Selection Navy fill without a border.
- **Dialog:** an 8px Box Surface card with a 1px Hairline border, 20px padding, a 17px title and right-aligned actions. There is no shadow and no scrim on the boards.

## Do's and Don'ts

### Do:
- **Do** pair every status label with its icon and its word. The word is never optional. The run strip is the only recorded exception.
- **Do** show evidence with code-review devices: the run strip, the file-header diffstat and the diff hunk.
- **Do** set paths, SHAs, error text, commands and keys in JetBrains Mono at 11 to 13px.
- **Do** keep containers flat: a Box Surface fill, a 1px Hairline border and an 8px radius.
- **Do** keep to one Merge Green button per region and use secondary buttons for everything else.
- **Do** use tabular figures for every rank, count, duration and diffstat.
- **Do** ship the base control rule on every surface: `color-scheme: dark` on the root, `color: inherit` on native controls and summaries, and fg-muted placeholders at full opacity.
- **Do** self-host Mona Sans and JetBrains Mono. The app makes no network calls by default.

### Don't:
- **Don't** add box shadows or gradients to any surface, including dialogs and popovers.
- **Don't** use Review Blue to mean a status, or a status hue to mean "interactive".
- **Don't** use any third-party product name, logo or icon artwork in the UI. The inspiration stays in documentation.
- **Don't** turn the list into a generic KPI-tile dashboard. Evidence is shown as runs, checks and diffs.
- **Don't** draw run results as Unicode text glyphs. Use the filled rounded-square SVG marks so size and colour stay consistent across fonts.
- **Don't** extend colour-only encoding beyond the run strip.

## Phone width (640px and below)

These rules were added 2026-11-19 and are written on all twelve boards as `@media (max-width:640px)`.

- **Gutters:** the header and page side padding drop to 16px.
- **Tests tiles:** the four status tiles become a 2 × 2 grid.
- **Tests list:** the table stops scrolling sideways. Each row becomes a 3-line card:
  - Line 1: test name, with wasted time on the right
  - Line 2: status badge, with the 12-run strip on the right
  - Line 3: the Why sentence

  The column header row and the rank number are hidden. Group headers stay.
- **Test detail:** the panel takes the whole screen and the list behind it is hidden. Back or the close button returns to the list. Run history keeps its own sideways scroll.
- **Loaded data:** the runs table keeps a sideways-scrolling box with a 640px minimum width.
- Start, Import states and Edge states already reflow: their grids fall to one column, and the containers have a max width with fluid sizing.

## Badge and selection fills (dark/light aligned, 2026-11-20)

Both themes use the same three tiers:
- **Badge fill:** strong enough to read as a coloured chip against the surface.
- **Selection fill:** for the Sample tag, the selected row and the pressed filter tile.
- **Pale info fill with a blue edge:** for the info band and the diff hunk header, so their links keep at least 4.5:1.

| Role | Dark | Light |
|---|---|---|
| Flaky badge fill / text | #4A3A12 / #E3B341 | #FFE58F / #7D4E00 |
| Unproven badge fill / text | #3C2A63 / #C297FF | #E8D9FF / #6639BA |
| Failing badge fill / text | #5A1E22 / #FF7B72 | #FFCECB / #A40E26 |
| Stable / Imported badge fill / text | #1A3D26 / #3FB950 | #ACEEBB / #116329 |
| Not enough data badge fill / text | #30363D / #C9D1D9 | #D8DEE4 / #393F46 |
| Selection: Sample tag, selected row (pressed tile uses border only) | #1B3358 | #B6E3FF |
| Info band, diff hunk header fill + edge | #121D2F + #1F6FEB | #DDF4FF + #54AEFF |
| Group header band, row hover | #262C36 | #E6EAEF |
| Gray button fill / edge | #21262D / #3D444D | #EFF2F5 / #C3CCD5 |

Diff line and gutter fills (#25171C/#3A1B1F and #12261E/#1B3A26 in dark) stay pale on purpose so code stays readable.

| New label (rows that turned Flaky since the last import) | #0F3A3D / #39C5CF | #D5F5F6 / #0B6B73 |

## Component states (board "7 State matrix", 2026-11-20)

| Component | Hover | Focus | Pressed | Disabled | Loading |
|---|---|---|---|---|---|
| Primary | darker green (#196C2E dark / #116329 light). White text stays at least 4.5:1, so hover darkens rather than lightens | 2px accent ring, 2px offset | #145A26 / #0F5323 | canvas fill, disabled-fg text (#848D97 / #656D76, at least 4.5:1), border-muted edge, not-allowed cursor | spinner and a verb in progress ("Reading…"). Disabled while busy |
| Secondary | surface-hover fill, stronger edge | ring | pressed fill (#282E36 / #D8DEE4) | as primary | spinner and verb |
| Danger | #DA3633 / #A40E26 | ring | #8E1519 / #8C0C1F | as primary | "Clearing…" |
| Status tab | surface-hover fill | ring | 2px accent underline, fg-default, weight 600 (aria-pressed) | count 0, disabled-fg | n/a |
| Search input | edge brightens | accent edge and ring | n/a | canvas fill | n/a |
| Table row | surface-hover | inset 2px ring | selection fill, weight 600 | never disabled | skeleton bar |
| Link | link-hover and a 2px underline | ring | link-hover | hidden, not disabled | n/a |

**Loading:** skeleton rows match the table's columns. They appear only after 300ms and pulse unless reduced motion is on.

**Toasts:** they sit bottom right, newest on top. Success and info toasts use role status and close after 5s, but stay open while hovered or focused. Error toasts use role alert and stay until dismissed, with a recovery action.

## Table controls (board "8 Table controls", 2026-11-20)

- **Filters:** the status tiles and search are the only filters. Every active filter shows as a removable chip (pill, secondary fill, 24px remove button), followed by "Clear filters". The live count names the result: "Showing 1 Flaky test matching "coupon", grouped by status, most urgent first".
- **Columns:** a "Columns" button opens a popover with checkboxes. Test and Status are locked on. Optional columns are Flakiness score, Mixed commits, Flip rate, Last failed and Project. There is a "Reset to default", and the choice is saved in this browser.
- **Density:** a segmented control. Compact uses 32px rows and 13px text, with the file path on hover only. Comfortable uses 40px rows and 14px text, with the file path inline. Comfortable is the default; the spec's 32px compact row is now the option. It is saved per browser.
- **Large suites:** rows use virtual scroll, so only the visible rows are drawn. The column header is sticky at top 0, and the current group label sticks right under it. The footer reads "Rows a to b of N".

## Run squares: shape cue (decided 2026-11-20, replaces the colour-only trade-off)

The run squares now carry a non-colour cue, with no inner icons:
- **Passed:** solid green square.
- **Failed:** hollow square, a 2px red outline with an empty centre.
- **Passed on retry:** solid amber square. The user changed it from half-filled on 2026-11-20.
- **Skipped:** solid gray square.

Under deuteranopia simulation, passed and failed were nearly identical (luminance difference under 0.05). Now they differ by shape. This closes the WCAG 1.4.1 gap recorded earlier. Evidence is in `docs/ux/07-inclusive-pass.md`.

## Logo (user-supplied, 2026-11-20)

The reference artwork is `docs/ux/brand/flakelens-logo-reference.webp`, in dark and light versions.

- **Mark:** an open ring, a 240° arc with round caps, running from the top round to the lower right. Three equal dots fill the gap. The logo has no tagline (v2, 2026-11-20). The ring and dots use the accent blue: #4493F8 in dark, #0969DA in light.
- **Wordmark:** "Flake" in fg-default and "Lens" in the accent blue. Mona Sans 700, letter-spacing -0.01em.
- **On the boards:** the header uses a 24px inline SVG of the mark plus the wordmark at 16px.
- **For the build:** ask the user for vector source files (SVG). The on-board mark is a redraw from the reference image and is close, not exact.

## Status pills: label only (user, 2026-11-20)

The Flaky, Unproven, Failing and Not enough data pills show only the coloured pill and its word. There is no icon. The word carries the meaning, so the pill still does not rely on colour alone. The filter tiles keep their small icons.

## Ranked table spacing (Comfortable, 2026-11-20)

- **Cells:** 12px top and bottom, 16px left and right, 8px between columns. Header cells match.
- **Rows:** Comfortable rows are 64px (62 to 66 as measured), two lines: name, then path. The Evidence cell stays on one line at 1280px and wider and may wrap to two lines below that (rows then grow to about 68px). Compact rows are 32px, one line. The test name sits on line 1 and the file path (mono, 12px) on line 2. Each truncates on its own.
- **Columns:** rank 52px, Test minmax(280px, 2.2fr), Status 120px, Last 12 runs 208px, Why minmax(260px, 3fr), Wasted time 128px. The table's minimum width is 1160px; below that it scrolls inside its box.
- **Group header bands:** 44px minimum, 8px top and bottom, 16px left and right, on the same edge as the cells.
- **Compact density** keeps the 32px single-line rows from the Table controls board.

## Test health summary and status tabs (2026-11-20, replaces the KPI tiles on Tests)

These follow the patterns used by enterprise code-review and observability tools: GitHub's tab nav with counters and its language bar, and Datadog facet summaries.

- **Test health box:** a single surface box with:
  - a title row: "Test health" plus "211 tests · 12 runs · 9 commits" on the left; the wasted CI time inline ("29 min" bold, with the Unproven estimate muted) and "Copy top Flaky tests" on the right
  - an 8px stacked distribution bar, one segment per status in proportion (minimum width 6px), with a 2px gap
  - a legend row: dot, label and count for each status
  - one accessible name for the bar, which lists every count
- **Status tabs (the filter):** underline tabs with counter pills. The active tab has a 2px accent underline, fg-default text and weight 600. Inactive tabs use fg-secondary. Flaky, Unproven and Failing tabs carry an 8px status dot. They replace the four big-number tiles, which wasted height and repeated the KPI pattern.
- **States:** recorded on the State matrix board in the "Status tab" row, with default, hover, focus, active (pressed), disabled (count 0) and loading not applicable.

## Data summary placement (2026-11-20)

The header no longer carries the data chip. The header holds the brand, the privacy line and global actions only.
- **Tests:** the Test health subtitle reads "211 tests from 3 files · 12 runs · 9 commits", followed by an attention-coloured link "⚠ 3 results not imported" that opens Loaded data. The link appears only when the count is above 0.
- **Loaded data:** the page lead starts with "3 files · 12 runs · last added 18 Nov".

## Export menu (2026-11-20, replaces the "Copy top Flaky tests" button)

- **Where:** in the table toolbar after the density control, as "⤓ Export ▾": a secondary button with a download icon, a label and a chevron, `aria-haspopup="menu"`. Exports sit on the list they export, not in the summary.
- **Menu:** 280px wide, on the surface colour with a border, holding menu items that have a title and a hint line:
  - **Copy top Flaky tests:** Markdown list with rank, name, Why and wasted minutes. Works in the MVP and shows the "Summary copied" toast.
  - **Download CSV** and **Download JSON:** `aria-disabled`, hint "Coming in v1", disabled-fg text.
- The Test health box carries no actions.

## Header actions (2026-11-20)

The header holds one text action, "Add your files" (green, primary), plus the theme and help icon buttons. Leaving sample mode is a link, "Exit sample", at the end of the sample banner, where sample mode is announced. "Add your files" still shows the "Leave sample data?" dialog before an import.

## Status renamed: Suspect becomes Unproven (user, 2026-11-20)

The status for "mixed results, never on the same commit" is now **Unproven** (an interim name, "Unproven", was too long for a pill). "Suspect" read as accusatory. Unproven states the real meaning, that flakiness is not yet proven and could still be a real bug. It pairs with Flaky (proven), and makes the scale read Flaky (proven), Unproven (not proven yet), Failing (likely a real bug), Stable. The colour role is unchanged: done violet.

## Status pill geometry (2026-11-20)

Every status pill shares one box: 22px high, minimum width 76px, 0 8px padding (reduced from 24px, 84px and 10px on 2026-11-20), text centred (`justify-content: center`, `line-height: 1`, `white-space: nowrap`), 12px/600 text. Flaky, Unproven and Failing therefore render at the same width and line up as one column. Longer labels such as "Not enough data" grow past 76px.


## Column rename (2026-11-20)

The ranked table's "Why" column is now **Evidence**. Numeric columns put the sort icon before the label ("⇕ Wasted time"), so the label's right edge lines up with the right-aligned numbers. Every header's text edge matches its column's content edge.

## Column alignment (2026-11-20, user)

- **Centred, header and cells:** #, Status, Last 12 runs, Evidence and Wasted time. The pills, run strips and minute values sit centred under their header, within 1px in the preview.
- **Centred too (user, 2026-11-20):** Evidence. Its header and its sentences are centred on the column, so the header sits over the text, not at the left edge.
- **Left-aligned, header and cells:** Test only. Long names scan better from a common left edge.
- This replaces the earlier rule of right-aligned numbers with the sort icon first. The icon still sits before the "Wasted time" label.

## Runs table on Loaded data (2026-11-20)

Same rule as the ranked table: header and cells share one alignment. All six columns (Run, Commit, Branch, Browser, Time, Tests) are centred on six equal-width columns (`repeat(6, minmax(0, 1fr))`), so no column stretches into a wide gap. Cells use 12px top and bottom and 16px sides, the header has a 1px rule under it, and numbers use tabular figures. The commit SHA stays monospace.


## Logo vectors supplied (2026-11-20)

The user supplied the official vector logos: `docs/ux/brand/flakelens-dark.svg` and `docs/ux/brand/flakelens-light.svg` (viewBox `-8 -8 1067 243`, the wordmark is outlined paths so no font is needed). The earlier redraw is retired. Dark uses #4493F8 (ring, dots, "Lens") and #E6EDF3 ("Flake"). Light uses #0969DA and #1F2328. Both match the theme tokens. The boards inline the SVG at 28px high in the header (Start, Tests, Test detail, Loaded data). In the build, use the files as is, with the existing `aria-label="FlakeLens"`.

## Contrast tokens fixed after the v0 axe audit (2026-11-25)

The dev chat's axe run found four pairs under 4.5:1. The values below are now the tokens (boards and DESIGN.md updated):

| Pair | Was | Now | Ratio now |
|---|---|---|---|
| Light flaky amber `#BF8700` as text on white | 3.14 | **Rule:** amber `#BF8700` is for graphics only (squares, icons). Any amber text or link uses `#7D4E00` (`--status-flaky-text`) | 7.09 |
| Light link `#0969DA` on row hover `#E6EAEF` | 4.30 | Link text `#0860CA` (`--link`). The accent `#0969DA` stays for the focus ring, borders and the logo | 4.91 (5.94 on white) |
| Dark muted `#9198A1` on selection `#1B3358` | 4.34 | Muted text `#A4ABB4` (`--muted-foreground`) | 5.46 (7.47 on surface) |
| Light muted `#59636E` on selection `#B6E3FF` | 4.49 | Muted text `#4F5A65` | 5.17 (7.04 on white) |

The run square "skipped" follows muted (`#A4ABB4` dark, `#4F5A65` light). Disabled tab counters in the State matrix use an outline instead of a fill so disabled text keeps 4.5:1.

## Commit or label field (board 9, 2026-11-25)

- **Where:** inside each file row on Loaded data, below the file name and result pill.
- **Field:** persistent label "Commit or label" above a 36px text field (6px radius, control border, monospace value). Empty shows a muted placeholder. The right end of the label row carries a small source tag: From the report, No commit info (warning colour), Your label, or Read-only.
- **Editing:** focus draws the 2px accent ring and a counter "n / 100". Save label (primary) and Cancel appear only while editing. Enter saves, Esc cancels. The clear (x) button is a 24px target and has the accessible name "Remove label".
- **After save:** a role-status line "Label saved. Rankings updated." Failure uses a role-alert box with Try again.
- **Runs table:** a typed label shows in the Commit column in monospace with a small "label" tag.
- **Read-only (sample):** surface fill, muted text, a lock icon and the source tag "Read-only".

## Settings and per-file remove (board 10, 2026-11-25)

- **Settings page:** one 720px column of boxed sections (Appearance, How rankings are decided, Your data, About), each with a 17px weight-600 heading and a muted caption below. Rows are label plus hint on the left and the control on the right; they wrap below 600px.
- **Controls:** theme and density are segmented groups (`aria-pressed`, selected = selection fill with accent text, 28px high). Shortcuts is a 36x20 switch, on = accent fill with a white thumb, off = outline with a muted thumb.
- **Thresholds:** read-only rows, plain sentence left, config name in JetBrains Mono right. Never editable in v1.
- **Remove:** secondary button with trash icon and the word "Remove" on each file row. The dialog names the file in monospace, lists runs, tests affected and the label, defaults focus to "Keep file", and uses a filled danger button "Remove file".
- **Undo toast:** 480px max, status role, success tick, Undo button with icon, dismiss (24px target), 3px accent timer bar along the bottom edge for 10 seconds. It pauses on hover and focus. It follows the app back to Start when the last file is removed.

## System banners and toasts (board 11, 2026-11-25)

- **Banner:** in the page flow under the header, full content width (max 1232px), 1px edge, 8px radius, 12px 16px padding, icon 18px, normal-weight 14px text, actions on the right (wrap below). Warning: surface fill, amber edge, amber triangle (`#D29922` dark, `#BF8700` light). Error: error-background fill (`#5A1E22` / `#FFCECB`), danger edge `#B62324`, error-text icon, role alert, no Dismiss. One banner at a time: failed, then skipped, then off. Dismiss lasts until the next page load.
- **Toast:** 480px max, surface, 1px border, 8px radius, status role, icon 16px, Dismiss 28px target, optional 3px accent timer bar. Bottom left on desktop, full width on phones, newest at the bottom, at most 2; the update toast is never pushed out and has no timer. Never takes focus; Esc closes the focused toast; 150 ms fade, off with reduced motion.
- **Install:** no pop-up. A row in Settings under About: button, then a status pill once installed, or how-to text on Safari. Hidden when the browser cannot install.

## Failure groups and cause chips (board 12, 2026-11-25)

- **Groups tab:** second tab beside Tests, same tab style and count pill. List order: environment events, then most failures. Cards are surface boxes, 16px padding, 12px gap. The environment-event card uses the info band fill and info edge.
- **Template:** JetBrains Mono 13px, masked values as small grey tags (`‹n›`, `‹id›`, `‹path›`, `‹time›`, hover fill, 4px radius).
- **Cause chip:** outlined pill (control edge, no fill), bolt icon, "Likely cause: {name}" and confidence in words after a dot. Never filled, so it cannot be mistaken for a status pill. Confidence is words only, never colour.
- **Evidence block:** canvas fill, 1px border, line numbers muted, matched text on the selection fill with a dotted underline (not colour alone).
- **Panel tip:** inside the status note box, below a divider: bold "Likely cause: {name}", muted confidence, two-sentence tip, link to the group. Added only at medium or high confidence.

## Full test page and log viewer (board 13, 2026-11-25)

- **Page:** one column, max 1232px, top bar (Back to tests left, Copy test name right), mono 20px title with status pill, path line, last-12 squares, four stat tiles (20px value, 12px muted label), status note with cause tip, then Run timeline, Failure log, What it depends on. Section headings 17px weight 600.
- **Run timeline:** a bordered list, columns Run (link, mono), Commit (mono, "label" tag when typed), When, Result (squares plus words), Time (right). Phone: stacked rows.
- **Log viewer:** canvas-filled area under a toolbar (search with live count, previous and next, Wrap lines switch, Copy line). Mono 12px, line height 1.7, muted non-selectable line numbers 52px wide. Evidence lines: info fill, 3px accent bar on the left, matched words selection fill with dotted underline. Current jump target: 2px focus ring inside the line. Virtualised, at most 150 rows drawn, lines over 2,000 characters cut with Show more.
- **Evidence chip:** a bordered button, quote icon, "Quoted from the log · line N" over the mono quote. Unverified: amber edge, warning icon, "Not found in the log", not highlighted.
- **Correlation finding:** surface box, dimension name with an outlined strength word, one plain sentence, rate bars (10px high, red only on the highlighted value, counts and rates in text), closed "How this was worked out" block. No-link, not-enough-data (3px muted left edge) and missing-data are quiet text boxes.

## Export menu and report (board 14, 2026-11-25)

- **Export menu:** 340px popover, surface fill, 1px border, 8px radius. Top block "What to export" is a radiogroup (Current view with count and hint, All tests with count). Divider, then four menuitems: icon, bold verb-plus-object label, muted one-line hint. Keyboard focus is a 2px inset ring on the item. With zero tests in view the file items are disabled (disabled text colour) and the empty state explains why. The menu keeps its v0 first item (Copy top Flaky tests).
- **Report page:** top bar with Back to tests, 24px title, one lead line, primary "Copy Markdown" (filled green) and secondary "Download .md" on the right. Preview/Markdown is a segmented group (`aria-pressed`). Preview is a surface box with 20/17/14px type and a muted footer; Markdown is a canvas-filled monospace block that scrolls sideways and never wraps. Sample data shows an amber-edged status line above the report.
- **Feedback:** the standard toast; a failed copy is an alert with a "Download .md" action.

## Less text, fewer decisions (2026-11-25)

Rules in `docs/ux/12-simplification-pass.md`: say it once; one lead line at most; word budgets per screen (Start 40, Tests 60, Loaded data 60, panel 90, dialog 45, banner or toast 20); explanations in tips and closed blocks; rare choices (density, theme) in Settings, not toolbars; one filled primary button per screen; board notes are labelled "Design note" and are not UI. Tests screen already updated (health legend removed, banner shortened, density toggle moved to Settings).

## Row height decision (2026-11-26)

The build measured Comfortable rows at 62 to 66px (name line 20px, path line 16px, cell padding 12px, Evidence wrapping to two lines at narrow widths). Decision: the rule follows the real, readable layout. **Comfortable = 64px**, no cell padding reduction. Keep the Evidence text on one line from 1280px up by giving the Evidence column the spare width; below that it may wrap. Compact stays 32px. Density is a Settings choice, so people who want more rows switch to Compact.
