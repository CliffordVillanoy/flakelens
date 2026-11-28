# FlakeLens UX: v0 handoff

Written 2026-11-20. The MVP wireframes are the design baseline for **v0**, the first build. The project refines in small steps: v0, v0.1, v0.2 and on, until it reaches enterprise production level. Each version goes through the same loop: build, check (squint test, the usability kit in 10, the detector), refine, and update the docs.

## Source of truth

**The spec is `docs/SPEC.md` in this folder (merged by the planning chat, 2026-11-20). The Downloads copy is retired; never edit it.** The sync items below are already merged into it.

| What | Where |
|---|---|
| Visual system, tokens, states, rules | `DESIGN.md` and `.impeccable/design.json` |
| Product facts and commitments | `PRODUCT.md` |
| Boards (dark and light, 16 files) | `docs/ux/wireframes/`, and the canvas https://claude.ai/artifact/TgaVPKws7Sm57HT8RUbEbX |
| Local preview and click-through prototype | launch config `wireframe-preview`, `http://localhost:8765/_preview.html?board=Main.dc.html` |
| Copy, glossary and string keys | `docs/ux/04-ux-copy.md` |
| Logo | `docs/ux/brand/flakelens-dark.svg`, `flakelens-light.svg` (vectors) and `flakelens-logo-reference.webp` |
| Research, IA, reviews, checks | `docs/ux/01` to `10` |

## v0 scope

Screens: Start, Import states, Tests, Test detail panel, Loaded data, Edge states, State matrix, Table controls.
Out of v0 (v1 and later): failure groups, full test page with log viewer, report and export downloads (CSV, JSON), per-file remove, manual status override, JUnit import, settings, and AI explanations.

## Decisions to sync into the planning chat and spec

1. **Status name:** "Suspect" is now **Unproven**. The internal value can stay `suspect`.
2. **Import wording:** records left out of an import are **not imported**, not "skipped".
3. **Gray status:** the label is **Not enough data** everywhere.
4. **Sample data:** held in memory only, never mixed with real runs.
5. **Default sort and density:** the table sorts by group (Flaky, Unproven, Failing, Stable, Not enough data); Comfortable (40px) is the default and Compact (32px) is the option.
6. **Run squares:** passed solid green, failed solid red (was hollow until 2026-11-27), passed on retry solid amber, skipped solid gray. They replace the old filled square, triangle, diamond and circle.
7. **Stack:** Tailwind with shadcn/ui, tokens as CSS variables, not Astryx.
8. **Engine data:** it needs an import record (file name, counts, notices) linked to the runs it created.
9. **Column "Why":** it is now called **Evidence**.
10. **Table layout:** every column is centred except Test, and the table scrolls inside its box below 1160px.

## Known gaps for v0.1 and later

- Fonts load from Google on the boards. The build must self-host Mona Sans and JetBrains Mono to keep the no-network promise.
- Logo vectors are supplied: `docs/ux/brand/flakelens-dark.svg` and `flakelens-light.svg`, already used in the board headers.
- Screen readers have not been tested on the real build. Sticky header needs `scroll-padding-top` so it never covers a focused row.
- The canvas does not apply the narrow-screen styles inside board previews; check them in the real app.
- No usability sessions have run. The kit in 10 is ready, and it runs solo or with anyone available.
