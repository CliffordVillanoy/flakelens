---
version: 1
slug: "docs-ux-wireframes"
primary_target: "docs/ux/wireframes"
related_targets: []
---

## Scope

FlakeLens MVP app screens: Start, Import states, Tests (ranked list), Test detail panel, Loaded data and Edge states. Visitor mode: Operate. The build is code-led.

## Audience and job

An SDET triaging flaky Playwright tests after red CI runs. Success means a trusted ranked list and a summary to share. Recruiters see it second.

## Chosen direction

The user pinned this on 2026-11-19: the visual language of GitHub and GitLab code review, with diff views, CI check marks on commits, and file headers with a diffstat. It was the user's choice over the rolled Forecast Desk direction. Convention is the commitment: it should sit alongside GitHub's and GitLab's own code-review screens at their craft level. Nothing may use GitHub or GitLab names, logos or Octicons artwork. The look is built only from open primitives: Primer-style colour roles, Mona Sans (OFL) and JetBrains Mono.

## Direction contract

THESIS: FlakeLens reads like the code review the SDET does every day. Evidence appears as diffs and CI checks on commits, not as a dashboard. It refuses the generic KPI-tile dashboard.

OWN-WORLD:
- **Ground:** a GitHub-dark canvas (#0D1117) with #161B22 surfaces and 1px #30363D borders. The light theme is the light canvas.
- **Status colour roles:** success green, attention amber for Flaky, done violet for Suspect, danger red for Failing.
- **Diff lines:** green (#12261E / #3FB950) and red (#25171C / #F85149) line backgrounds.
- **Type:** Mona Sans for UI and JetBrains Mono for code, paths and SHAs.
- **Shape:** 6px radius, Counter pills and box-header bars.

STORY: The user opens the list, sees each test's run history as a strip of CI check icons, and opens a test. Its latest failure reads as a diff hunk, with the failing attempt as a red line and the retry that passed as a green line. The user trusts the label and copies the summary.

FIRST VIEWPORT:
- **Top:** a header bar with the app name, data chip, privacy line and actions.
- **Below it:** a box-header filter bar with segmented counters (All 211 · Flaky 3 · Suspect 2 · Failing 2) and the wasted-time Counter.
- **Then:** the ranked list as a bordered box. Group headers sit in the box-header grey. Each row has a 12-run check strip (✓ pass, ✗ fail, ↻ passed on retry, ⊘ skipped), plus Why and Wasted columns.
- **Right:** the detail panel opens beside the list with a file-header bar (test path, Flaky label, diffstat), a commit list with a check icon per run, and the latest failure as a diff hunk.
- **Primary action:** "Add your files" in the header, green like a primary "Merge" button.

FORM: Pinned by the user (GitHub/GitLab code-diff UI). The roll's assigned Forecast Desk was declined by the user. seed:a8c9402ce77f5a89

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- The run-glyph vocabulary changes from the spec's shapes (filled square, triangle, diamond, hollow circle) to check icons (✓ ✗ ↻ ⊘). These are still distinct shapes. Update spec section 13 to match.
- The teal "New" status has no Primer role. Keep spec teal (#39C5CF on dark).
