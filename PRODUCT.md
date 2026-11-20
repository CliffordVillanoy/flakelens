# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript (strict), Tailwind CSS with shadcn/ui (Radix primitives), Lucide icons. Tokens are CSS variables mapped into the Tailwind theme. This was confirmed 2026-11-19 over Astryx, which stays out of the build. Static site on GitHub Pages, installable PWA, with no backend.

## Users

- **Primary:** an SDET or QA automation engineer on a small team who owns a Playwright suite in CI. They come to the tool when CI keeps going red or a lead asks why. Their job is to find which tests are flaky, trust the evidence, and say what to fix first.
- **Secondary:** a developer who owns CI at a startup or open-source project and needs a fast answer to "is this me or is this flaky?"
- **Hypotheses, not yet validated:** a QA learner who needs terms taught in place, and a regulated-team lead who cannot upload logs anywhere.
- **Also sees it:** recruiters and hiring managers. FlakeLens is a portfolio piece. The design is aimed at the primary user first. Craft and restraint in daily use is what should impress a reviewer (confirmed 2026-11-19).

## Product Purpose

FlakeLens turns test results from several CI runs into a ranked, explained list of flaky tests in under two minutes, with no account, no install and no upload. Success means the user reaches a ranked list they trust and can take a summary to their team.

## Positioning

Local-first and private by default. It works on report files the user already has, entirely in the browser, with no CI integration. Evidence comes before claims: every label shows the numbers behind it, and causes are only ever "likely".

## Operating Context

- **Desk work:** large logs and dense tables. Desktop first, but layouts must survive phone width.
- **Inputs:** Playwright JSON reports (JUnit XML comes in v1), dropped in several at a time.
- **Ritual:** triage after a red CI run, then copy a summary into a ticket or standup.
- **Keyboard-first:** j/k, `/`, Enter, Esc and `?`. Single-key shortcuts can be turned off.

## Capabilities and Constraints

- **MVP:** Playwright JSON import, flakiness scoring, a ranked table grouped by status (Flaky, Unproven, Failing, Stable, Not enough data), a detail panel with run history by commit, and sample data held in memory only.
- **Terms:** the glossary in `docs/ux/04-ux-copy.md` is binding: run, attempt, mixed commit, not imported, wasted time.
- **No network calls by default.** Fonts and icons are self-hosted. Budget: $0.
- **Status is never colour alone:** always an icon plus a word.

## Brand Commitments

- **Name:** FlakeLens. This is a working name, and its availability has not been checked.
- **Theme:** dark by default, with a light option. This is binding (confirmed 2026-11-19).
- **Visual language:** modelled on code-review UIs like GitHub's and GitLab's (user's choice, 2026-11-19). That means diff hunks, CI check icons on commits, file-header bars with a diffstat, a dark canvas and Primer-style colour roles. Build it only from open primitives (Mona Sans, JetBrains Mono, CSS tokens). Never use GitHub or GitLab names, logos or Octicons artwork.
- **Voice:** plain, calm and exact. "Likely", never certain. The number comes first in evidence. Full rules: `docs/ux/04-ux-copy.md`.
- **Spec design foundations:** 4px grid, compact rows, 6px control radius and 8px card radius, flat surfaces with 1px borders. Status colours are green Stable, amber Flaky, violet Unproven, red Failing, teal New and gray Not enough data.

## Evidence on Hand

- **UX documents:** research, IA and flows, the heuristic review and UX copy, in `docs/ux/01` to `04`.
- **Wireframes:** `docs/ux/wireframes/` and the canvas at https://claude.ai/artifact/TgaVPKws7Sm57HT8RUbEbX.
- **Sample data:** synthetic, from a planned flake lab. Never present it as real customer data.
- **Not available:** no real users, testimonials, benchmarks or accuracy numbers yet. None may be invented.

## Product Principles

1. Trust before speed. A wrong Flaky label on a real bug costs more than a missed flaky test.
2. The answer first, evidence on demand.
3. Never a dead end. Every state says what happened and what to do next.
4. Privacy you can see, not just read about.
5. Every number on screen reconciles with the loaded data.

## Accessibility & Inclusion

WCAG 2.2 AA in both themes: 4.5:1 for text and 3:1 for UI, full keyboard use, a visible focus ring, reduced motion, and status by icon plus word. Automated axe checks are planned in CI.
