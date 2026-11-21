# DEV-14: Tests screen: health box, tabs, ranked table

**Status:** To do

**Goal:** The ranked, grouped list of tests with evidence a user can trust at a glance.

**Objectives:**
- Test health box (counts, distribution bar, legend, wasted time with Unproven estimate).
- Status tabs and search synced to the URL; live result count.
- Ranked table: #, Test + file, Status pill, Last 12 runs strip, Evidence sentence, Wasted time; group headers; Stable and Not enough data collapsed.
- Virtual rows, sticky header and group label, `scroll-padding-top`.
- Glossary hints; phone-width card layout.

**Scope:** Frontend.

**Acceptance Criteria:**
1. Evidence uses the right `why.*` template for each label, number first.
2. Wasted time shows `{min} min`, `~{min} min (est.)` for Unproven, or `—`.
3. Groups appear in the order Flaky, Unproven, Failing, Stable, Not enough data.
4. Status pills show only the word; run squares follow the shape rule; the strip has one spoken label.
5. Test names with HTML, very long names, RTL text and emoji render as plain text and keep the layout.
6. Focused rows are never hidden under the sticky header.

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 4 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Board: 3 Tests. Column widths and alignment from `DESIGN.md`. Dependencies: TanStack Table and TanStack Virtual.

**Skills/Plugins:** superpowers:executing-plans, superpowers:test-driven-development, superpowers:verification-before-completion, frontend-design / impeccable (match DESIGN.md), interaction-design.

**Limitations/Restrictions:**
- Branch `feat/v0-ui` (create it from `main` in DEV-11). Commit only task files. Plain commit messages, no Claude attribution. No push, no merge.
- Every visible string from `src/ui/copy.ts` (keys from `docs/ux/04-ux-copy.md`). No network calls outside the app origin.
- New dependencies only as named in the plan; report each one's version and licence.

**Definition of Done:**
- Tests written first and seen failing, then passing.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` green.
- Compared against the named wireframe boards (launch config `wireframe-preview`) in dark and light; differences listed in the report.
- Committed on `feat/v0-ui`; ledger line added; development report sent to the planning chat.
