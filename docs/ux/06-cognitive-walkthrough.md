# FlakeLens UX 06: Cognitive Walkthrough

Run 2026-11-20 in the UI/UX chat on the current canvas boards: dark and light, after the visual design and polish passes.

## Method

The six task flows from `02-information-architecture.md` (F1 to F6), walked step by step as two personas from `01-user-research.md`:
- **Lee:** a QA learner. Non-technical, has never seen a flakiness tool, may not know diff notation.
- **Maya:** an SDET. Technical, fluent in GitHub and CI, in a hurry.

At each step we ask the four standard questions:
- **Q1 Goal:** will the user try to do the right thing?
- **Q2 See:** will they notice the right control?
- **Q3 Connect:** will they link that control to what they want?
- **Q4 Feedback:** will they understand the response and know they made progress?

Any "no" is a failure. It gets a severity: P1 blocks or misleads, P2 slows or confuses, P3 is friction.

Limit: this is a source walkthrough by the designer, not a test with users. It finds likely problems and does not prove the absence of others. Section 6 of `05-ux-methods-plan.md` covers the real tests.

## Results

| Flow | Steps | Lee: failures | Maya: failures |
|---|---|---|---|
| F1 First visit with sample data | 6 | 4 | 1 |
| F2 Import my own reports | 5 | 0 (not Lee's task) | 1 |
| F3 Is this test flaky? | 4 | 1 | 0 |
| F4 Pick what to fix first | 4 | 1 | 2 |
| F5 Come back later | 3 | 0 | 1 |
| F6 Clear my data | 3 | 1 | 1 |

## Failures

| ID | Flow · step | Who | Question failed | What happens | Sev | Fix |
|---|---|---|---|---|---|---|
| W1 | F1 · read the list | Lee, Maya | Q4 feedback | The **Last 12 runs** squares on Tests have no legend. They use colour only, so nobody can tell what yellow or gray means without opening a test. Colour-blind users cannot tell green from red at all | **P1** | Add a one-line legend under the column header, or in a "?" popover beside "Last 12 runs": ■ passed ■ passed on retry ■ failed ■ skipped. Give each square a tooltip with the run, commit and result |
| W2 | F1 · start | Lee | Q2 see | On Start, **Browse files** is the green primary button and **Try sample data** is secondary. Lee has no files, so the strongest button is the one Lee cannot use | P2 | Give both buttons equal secondary weight on Start. The drop zone itself is the primary target. Alternatively, make Try sample data primary when nothing has been loaded before |
| W3 | F1 · start | Lee | Q1 goal | The page never says what "flaky" means, so Lee may not know whether this tool is for them | P3 | Add one line under the title: "A flaky test passes and fails on the same code." |
| W4 | F1 · open a test | Lee | Q3 connect | The file header shows **+10 −5 attempts**. That is diff notation, which Lee reads as "added or removed", not "passed or failed" | P2 | Show it in words: "10 passed · 5 failed attempts", with the coloured mini bar kept |
| W5 | F1 · read latest failure | Lee, Maya | Q3 connect | The diff hunk uses **−** for the failed attempt and **+** for the passing retry. In real diffs, − means deleted and + means added, so Maya's existing habit points the wrong way. The **@@ … @@** header is jargon to Lee | P2 | Keep the diff look but replace the sign column with words, "fail" and "pass" (or ✕ and ✓ plus a word). Change the hunk header to "Run 12 · attempt 1 failed, attempt 2 passed · same commit" |
| W6 | F1 · read the list | Lee | Q3 connect | The **Wasted time** column has no explanation of what was wasted or how it is counted | P3 | Add a header tooltip: "CI minutes spent on failed attempts of commits where this test also passed." This is already the glossary text |
| W7 | F2 · after import | Maya | Q4 feedback | The banner says "2 new Flaky tests since your last import", but the table does not mark which rows are new | P2 | Add a small "New" label (teal, from the spec status palette) on those rows, and make the banner text a link that filters to them |
| W8 | F3 · search | Lee | Q2 see | Search works with `/`, but whether search also respects the active status tile is not shown | P3 | Make the live count name both: "Showing 1 Flaky test matching 'coupon'" |
| W9 | F4 · share | Maya | Q1 goal | Maya's goal is "show my lead the top 5". There is only a **Copy summary** for one test, and no way to copy or export the ranked list | P2 | Add **Copy top Flaky tests** (markdown) next to the Wasted CI time tile. Full export stays in v1 as specced |
| W10 | F4 · sort | Maya | Q3 connect | The **Wasted time ↕** sort button does not say whether it re-sorts inside groups or flattens them | P3 | Keep the groups and sort inside them. Show the current sort in the live count: "sorted by wasted time" |
| W11 | F5 · return | Maya | Q4 feedback | The IA promised "12 runs · last added 3 days ago" in the data chip. The chip shows only counts | P3 | Add "· last added 18 Nov" to the data chip |
| W12 | F6 · clear data | Lee, Maya | Q2 see | With your own data loaded, **Clear all data** should sit in the header (IA principle 5). No board shows that header, because every Tests board is in sample mode | P3 | Add an own-data header variant to the Loaded data board: Add files · Clear all data · theme · ? |

## What passed well

- **Run history in the panel:** the legend, the mixed-commit outline and the commit labels answer "why is this Flaky?" in one look (Q3 and Q4 pass for both personas).
- **Group headers with a meaning line:** "Suspect · 2 · Mixed results, never on the same commit" taught Lee the categories in place.
- **Leave sample dialog and Clear dialog:** they name the scope, focus the safe button and use clear labels.
- **Empty and edge states:** every one offers a next step, such as "Search for 'login' instead" or "Show all tests".
- **Keyboard hints:** the visible `/`, `j k` and `?` hints let Maya work without the mouse from the first visit.

## Fix order

1. W1, the legend for the run squares (P1)
2. W4 and W5, plain words in the file header and diff hunk
3. W2, button weight on Start
4. W9, Copy top Flaky tests
5. W7, New label on rows after import
6. The P3s together: W3, W6, W8, W10, W11, W12

## Status (2026-11-20)

All 12 fixes are applied to the dark and light boards. The automated design check found 0 issues.

| ID | Applied on |
|---|---|
| W1 | Tests: legend line above the table, plus a tooltip on every square (also the panel squares) |
| W2 | Start: Browse files and Try sample data now have equal secondary weight. The drop zone is the primary target |
| W3 | Start: the lead line now opens with "A flaky test passes and fails on the same code." |
| W4 | Panel file header: "10 passed · 5 failed attempts" |
| W5 | Panel failure view: header "Run 12 · attempt 1 failed, attempt 2 passed · same commit"; the sign column reads fail / pass |
| W6, W10 | Tests: the Wasted time header has a tooltip with its definition and "Sorts inside each group" |
| W7 | Import states: the success banner links "Show the 2 new Flaky tests" and shows an example row with a teal **New** label |
| W8, W10 | Tests: the live count reads "Showing all 211 tests, grouped by status, most urgent first". The dynamic format is in 04-ux-copy section 6 |
| W9 | Tests: "Copy top Flaky tests" button under the Wasted CI time tile |
| W11, W12 | Loaded data: own-data header with "3 files · 12 runs · last added 18 Nov", Add files and Clear all data |
