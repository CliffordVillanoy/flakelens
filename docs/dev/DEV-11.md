# DEV-11: UI foundation: tokens, fonts, copy, router

**Status:** Done (2026-11-21, commit `162bb29` on `feat/v0-ui`; 85 tests pass)

**Goal:** A styled, themed app shell with the copy catalog and hash routing, ready for the screens.

**Objectives:**
- Tailwind + shadcn/ui set up with every token from `DESIGN.md` (dark default, light under `[data-theme="light"]`).
- Self-hosted Mona Sans and JetBrains Mono; logo SVGs from `docs/ux/brand/`.
- `t()` copy module with ICU-style plurals; `useRoute`/`navigate`; safe `getPref`/`setPref`.
- Header: logo, privacy line, "Add your files", theme and help buttons.
- CSP meta tag and an ESLint ban on `dangerouslySetInnerHTML`.

**Scope:** Frontend.

**Acceptance Criteria:**
1. `t('import.reading', {count: 1})` is "Reading 1 file…" and `{count: 3}` is "Reading 3 files…"; a missing param fails the test.
2. Routes `#/`, `#/tests?status=flaky&q=login`, `#/tests/:id`, `#/data` parse as the plan says; unknown hashes go to Start.
3. With `localStorage` throwing, prefs fall back and never throw.
4. Theme button switches dark and light, is saved, and dark is the default.
5. The dev page loads no file from outside its origin (fonts included).
6. `npm run build` output works from a sub-path (Vite `base: './'`).

**Details:**
- Plan: `docs/superpowers/plans/2026-11-21-v0-ui.md`, Task 1 (interfaces, files and behaviour).
- Spec: `docs/SPEC.md`; design: `DESIGN.md`; copy: `docs/ux/04-ux-copy.md`; IA: `docs/ux/02-information-architecture.md`.
- Boards: Start header (1), Tests header (3).

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
