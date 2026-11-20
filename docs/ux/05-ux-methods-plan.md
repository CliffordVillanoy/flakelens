# FlakeLens UX 05: Methodology Plan

Drafted 2026-11-20 in the UI/UX chat. It assesses which UX methods to apply to the MVP wireframes, against four goals:
1. user-centric
2. friendly to both technical and non-technical users
3. visually appealing
4. enterprise-grade layout

Constraint: this is a personal portfolio project, so there are no formal interviews. Validation is ongoing and solo-first: the kit in 10 is rerun as the boards change, with no fixed participant count (user decision 2026-11-20).

## 1. What is already done

| Method | Where | Goal served |
|---|---|---|
| Desk research, proto-personas, JTBD, journey map | `01-user-research.md` | User-centric |
| IA, task flows F1 to F6, screen-state table | `02-information-architecture.md` | User-centric, enterprise |
| Heuristic evaluation (Nielsen 10, Laws of UX, cognitive load) | `03-heuristic-review.md` | All four |
| Content design: voice, glossary, string catalog | `04-ux-copy.md` | Friendly to both |
| Progressive disclosure: answer, then evidence, then score details | Tests, detail panel | Friendly to both |
| Design system: tokens, two themes, type ramp, contrast | `DESIGN.md` | Visual, enterprise |
| Responsive rules (640px) | `DESIGN.md` | Enterprise |
| Automated design and WCAG checks | Impeccable detector | Visual, a11y |

## 2. Gaps found while assessing the wireframes

| # | Gap | Goal hurt | Board |
|---|---|---|---|
| G1 | No one has walked the flows step by step as a first-time user. The heuristic review judged screens, not task paths | User-centric, non-technical | All |
| G2 | The run squares use colour alone (user choice), and no keyboard focus state is drawn on any board | Inclusive, enterprise a11y | Tests, detail |
| G3 | There is one density only. Enterprise tables usually offer compact and comfortable modes | Enterprise | Tests |
| G4 | The table has no sticky header, no visible column picker and no hint for 1,000+ tests (virtual scroll) | Enterprise scale | Tests |
| G5 | No loading (skeleton) board, no toast board and no keyboard-shortcut discovery after first use | Feedback, enterprise | Missing boards |
| G6 | There is no first-impression check of clarity or appeal, so "visually appealing" is still our own opinion | Visual | All |
| G7 | Non-technical terms are defined, but no reading-level check has been run on the copy | Non-technical | Copy |
| G8 | There is no export or "share" path in the MVP boards. Enterprise users hand results on | Enterprise | Detail (Copy summary only) |

## 3. Recommended methods

### A. Apply now (solo, on the wireframes)

| Method | What it is | How we apply it | Fixes |
|---|---|---|---|
| **Cognitive walkthrough** | Walk each task step by step as a named persona. At each step, ask the 4 standard questions: will they try it, see the control, connect it to their goal, and understand the feedback? | Run F1 to F6 as Lee (non-technical learner) and Maya (SDET). Log every "no" | G1 |
| **Squint test and 5-second self-test** | Blur the screen and check what stands out. Then show the screen for 5 seconds and ask what it was for | Run on Tests and detail, in both themes. The ranked list and the top Flaky row must win | G6 (first pass) |
| **State matrix** | A grid of every component against every state (default, hover, focus, active, disabled, loading, empty, error) | Draw the missing states as a board: focus ring, skeleton rows, toast, disabled button | G2 focus, G5 |
| **Enterprise data-table pattern review** | Check the table against standard data-grid behaviour (Astryx `table-filter`, Carbon and Atlassian data tables) | Add a sticky header, a column picker popover, a density toggle and a "211 tests, virtual scroll" note | G3, G4 |
| **Inclusive design pass (WCAG 2.2 AA)** | Keyboard order, screen-reader names, colour independence, 200% zoom | Write a focus-order map for Tests and the panel. Propose a non-colour cue for failed squares (hollow). You decide | G2 |
| **Plain-language check** | Readability score on the user-facing copy (Flesch-Kincaid grade 8 or below) | Score `04-ux-copy.md` strings. Rewrite anything above grade 9 | G7 |

### B. Ongoing checks (solo or with anyone available; kit in 10)

| Method | Who | Output |
|---|---|---|
| **Think-aloud task run** | You, walking each task as Maya, Sam or Lee | Time to ranked list (target under 2 min), where they hesitate, success per task |
| **First-click test** | Same run, 5 questions such as "Which test should you fix first?" | Whether the first click lands on the right target |
| **SUS questionnaire** (System Usability Scale) | After each run | A benchmark score, target 70 or above |
| **Desirability test** (Microsoft Product Reaction Cards) | After each run, pick 5 words | Evidence for "visually appealing" and "enterprise", e.g. "trustworthy", "professional" |
| **5-second test** | Anyone, also async | Whether people understand what FlakeLens is from the first screen |

### C. Patterns to adopt in the design (enterprise layout)

| Pattern | Why | Status |
|---|---|---|
| App shell: fixed header, one workspace, panel beside the list | Predictable, like GitHub, Jira and Datadog | Done |
| 4px spacing grid and type ramp | Consistent rhythm | Done (`DESIGN.md`) |
| Status = icon + word, three tones | Scannable, accessible | Done (badges); squares are colour-only |
| Density modes (compact 32px rows, comfortable 40px rows) | Power users want more rows; new users want air | **To add** |
| Sticky table header and column picker | Long lists, different roles | **To add** |
| Filter chips that show active filters, plus "Clear all" | Users can see why rows are hidden | **To add** (tiles only today) |
| Toasts for background results ("Summary copied") | Feedback without blocking | **To add as a board** |
| Skeleton loading | Perceived speed (Doherty threshold) | **To add as a board** |
| Keyboard shortcut hints shown in tooltips | Experts discover them by using the app | **To add** |
| Export and share (markdown, CSV, JSON) | Enterprise hand-off | v1 per spec. Mock the menu now |

### D. Methods we are not using, and why

- **Card sorting and tree testing:** the IA is a single workspace with 4 places, too small to need them.
- **Diary studies, A/B testing, surveys of 100 or more people:** no traffic and no budget. Revisit after launch.
- **Personas from interviews:** skipped by decision. The proto-personas stay labelled as hypotheses.

## 4. Proposed order

1. Cognitive walkthrough of F1 to F6 as Lee and Maya, which logs the defects
2. State matrix board: focus, loading, toast, disabled
3. Enterprise table upgrade: sticky header, density toggle, column picker, filter chips
4. Inclusive pass: focus-order map and a decision on the colour-only squares
5. Plain-language check of the copy
6. Squint and 5-second self-test on both themes
7. Before launch: 3-person usability test with SUS, first-click and desirability cards (reusable kit in 10, run as needed; no recruited participants)
