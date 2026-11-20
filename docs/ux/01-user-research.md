# FlakeLens UX 01: User Research (desk research)

Drafted 2026-11-19 in the UI/UX chat. Input: project spec (Updated, 19 Nov 2026) and the decisions recorded since.

## 1. Method and limits

- **Method:** secondary (desk) research only. Sources are academic studies of developers and flaky tests, competitor docs, and practitioner articles.
- **Why no interviews:** the project skipped user interviews and Gate 1 (personal portfolio project). The personas below are **proto-personas**: assumptions backed by published evidence, not by our own sessions.
- **Bias warning:** most practitioner articles come from vendors that sell flaky-test tools. Treat their claims as leads, not facts.
- **What would upgrade this:** the spec's pre-launch check (3 people of different QA levels try it, note where they hesitate). Section 7 lists what to watch for in that session.

## 2. What the evidence says

| # | Finding | Source | Strength |
|---|---|---|---|
| E1 | Reproducing the flaky behavior and finding its cause are the two hardest parts for developers. | Eck et al. 2019 (survey of 121 developers, plus 21 developers classifying 200 fixed flaky tests) | Strong |
| E2 | Flakiness often comes from the system under test and the infrastructure, not only from the test code (timing, concurrency). | Habchi et al. 2022 (14 practitioner interviews) | Moderate |
| E3 | Developers want dashboards that show test outcomes **over time**, IDE plugins that detect flaky code, and more training on flakiness. They worry more about **losing trust in test results** than about the cost of re-runs. | Survey of 335 developers and testers (Gruber and Fraser, ICST 2022) | Strong |
| E4 | Developers want a clear root-cause explanation before they trust an automated fix. | FlakyGuard | Moderate |
| E5 | Playwright's HTML report only flags flakiness inside one run (fail then pass on retry). Diagnosing one failure means switching between CI logs, the HTML report, traces and screenshots. | Vendor articles (Currents, TestDino) | Weak (vendor only, not checked against Playwright docs) |
| E6 | About 75% of flaky tests were flaky when they were added. | Longitudinal study | Strong |

## 3. Competitor UX patterns

Only the UX patterns are listed here. Pricing and positioning are in spec section 5.

| Pattern | Who does it | Take for FlakeLens? |
|---|---|---|
| Flaky = different results on the same commit | Trunk, FlakeLens spec | Yes, already the core rule |
| Status a human can override (Flaky, Healthy, Broken) | Trunk | **Yes, v1 (decided 2026-11-19).** Stored locally. The engine label is never overwritten and stays visible beside the user's label, so accuracy numbers stay clean. Exports show both. |
| Quarantine and auto-quarantine | Trunk, Datadog | No. It is a non-goal (needs CI integration). Mention it in the Flaky note as advice only. |
| Test detail page: status, pass/fail history chart, timeline, table of unique failure reasons | Trunk | Yes. It matches our run-history grid plus failure groups. |
| Filter history by result | Trunk | Yes, cheap in the detail panel. |
| Clicking a test opens its latest failed run or first flaky run | Datadog | **Yes.** Open the detail panel on the most useful evidence, not on the top of the history. |
| States such as quarantined, disabled and fixed, plus an "attempt to fix" check | Datadog | **v2 idea "Fix check" (decided 2026-11-19).** Merges the "Fixing / Fixed?" mark with re-import and compare. v1 gets only a "since commit / date" filter on the run-history grid. |
| Auto-created tickets | Trunk, Datadog | No. Our substitute is the markdown export (paste into a ticket). |
| Multi-repo overview landing page | Trunk | No. One dataset at a time. |

**Gap all of them leave:** every tool needs an account, a CI upload step, or both. None of them works on files the user already has, on a machine that cannot send data out. That is the FlakeLens gap (spec section 5).

## 4. Proto-personas

Primary first. Each persona maps to one experience level from spec section 13.1.

### P1. Maya, SDET on a small team (primary, Practitioner)

- **Context:** owns the Playwright suite. CI runs on every pull request. Retries are on.
- **Trigger:** the manager asks "why is CI always red?" or a release is blocked.
- **Today:** opens the HTML report run by run, re-runs the job, keeps a mental list of "the usual suspects".
- **Needs:** a ranked list she can trust, the evidence behind each label, and a report to paste into a ticket or a standup.
- **Fears:** calling a real bug "flaky". Uploading client logs to a third party.
- **Success:** "In 10 minutes I had the top 5 to fix and a number of wasted minutes to show my lead."

### P2. Sam, developer who owns CI at a startup or open-source project (secondary, Practitioner)

- **Context:** writes product code. Tests are a side job.
- **Trigger:** their own pull request fails on a test they did not touch.
- **Needs:** a fast answer: "is this me or is this flaky?" Then the likely cause, in one line.
- **Behavior:** scans, does not read. Leaves if the first screen needs setup.
- **Success:** "It told me the test is flaky on other commits too, so I re-ran it and moved on."

### P3. Lee, QA learner or bootcamp student (hypothesis, Beginner)

- **Context:** knows what a test is. Does not know the flaky-test taxonomy.
- **Trigger:** a course project or a first job.
- **Needs:** sample data, plain words, a short explanation of each term, and "what to check next".
- **Success:** "I can explain why the test is flaky and what kind of flakiness it is."

### P4. Regulated-team lead (hypothesis, Expert)

- **Context:** client or compliance rules forbid uploading logs to a third-party service.
- **Needs:** proof that nothing leaves the browser, plus a clear-data button.
- **Success:** "I could use it without asking security for an approval."

**Anti-persona:** a platform team that wants org-wide dashboards, auto-quarantine and ticket automation. They should use Trunk or Datadog. Saying so is honest and keeps scope tight.

## 5. Jobs to be done

| Job statement | Persona | Feature that answers it |
|---|---|---|
| When CI is red and I did not change that area, I want to know fast if the failure is flaky, so I do not waste time on a fake bug. | P2 | Search a test, status badge, "Why" sentence |
| When my lead asks about CI health, I want a ranked list with wasted time, so I can show what to fix first. | P1 | Ranked table, wasted-minutes tile, export |
| When I pick a flaky test to fix, I want the evidence and a likely cause, so I can reproduce it quickly (E1). | P1, P2 | Detail panel, run-history grid, failure groups, status note |
| When I learn about flakiness, I want real examples with explanations, so I can recognize each type. | P3 | Sample data, term hints, status notes |
| When my logs are confidential, I want to analyze them without uploading them, so I stay compliant. | P4 | Privacy line, no-network default, clear-all |

## 6. Current-state journey (P1, without FlakeLens)

| Stage | What she does | Pain | FlakeLens opportunity |
|---|---|---|---|
| 1. Notice | CI is red again. A teammate says "it's that flaky one". | No inventory, only memory (spec section 2) | Ranked list replaces memory |
| 2. Gather | Downloads reports from several runs | Each report shows one run only (E5) | Multi-file drop, cross-run view |
| 3. Sort out | Opens each report, compares by hand | Real bug or flaky? Unclear | Status labels: Flaky vs Unproven vs Failing |
| 4. Diagnose | Reads logs and traces | Reproducing and finding cause is hardest (E1) | Evidence lines, failure groups, likely cause (v1) |
| 5. Report | Writes a ticket or a Slack message | Hard to show impact | Wasted minutes, markdown export |
| 6. Verify fix | Re-runs CI and hopes | No before/after view | v1: "since commit / date" filter on the history grid. v2 idea: "Fix check". |

The biggest pains are stages 3 and 4. The MVP covers stages 1 to 3 and part of 5. Stage 4 depth arrives with the v1 classifier.

## 7. Insights and design implications

| # | Insight | Design implication | Release |
|---|---|---|---|
| I1 | Trust decides adoption. A wrong "flaky" label on a real bug costs more than a missed flaky test (P1 fear, E3, E4). | Show evidence before the label claim: "3 of 12 commits mixed". Keep Failing visibly separate from Flaky. Say "likely". | MVP |
| I2 | Users scan, they do not read (P2). | The "Why" column is one sentence with the number first. Status uses icon plus word. No paragraph above the table. | MVP |
| I3 | Time to the first answer decides whether the tool gets a second visit. | "Try sample data" next to the drop zone. Detail panel opens on the most recent failure. Stay under 2 minutes. | MVP |
| I4 | Over-time history is the most requested view (E3). | Run-history grid is the centerpiece of the detail panel, not a hidden tab. | MVP |
| I5 | Single-run data is the common case, and it gives weak evidence. | "Not enough data" is a normal, calm state with one concrete next step: load more runs, or turn on retries / `--repeat-each`. | MVP |
| I6 | Users need to correct the tool. | Local manual status override with a visible "changed by you" mark. Engine label kept and shown beside it. | v1 |
| I7 | Impact sells the fix to a manager. | Wasted-minutes tile at the top, and in the export header. | MVP |
| I8 | New tests are high risk (E6). | "New" badge and a filter for recently added mixed tests. | v1 |
| I9 | Privacy must be visible, not claimed in the README only (P4). | One-line privacy note on import, "0 network requests" stated, clear-all always one click away. | MVP |
| I10 | Learners need terms taught in place (P3, E3 training wish). | Hover or inline definitions for flip rate, mixed commit, score. No separate glossary page needed. | MVP |

## 8. Assumptions to validate later

Ranked by risk. Use the spec's 3-person session before launch. Give each person one task per row.

| Assumption | Risk if wrong | Quick test |
|---|---|---|
| Users can get JSON reports from several CI runs. | Tool shows "Not enough data" for most real users. | Ask: "Where are your last 10 runs' reports?" Watch whether they can find them. |
| The "Why" sentence is enough to trust a Flaky label. | Users ignore the ranking. | Task: "Would you file this as a bug or as flaky?" Note what they open first. |
| Wasted minutes is meaningful to managers. | The headline number is ignored. | Ask what number they would report today. |
| Beginners understand Flaky vs Unproven vs Failing. | Mislabeling in their heads. | Ask them to explain each badge in their own words. |
| Group sort (Flaky, Unproven, Failing, Stable) matches expectations. | Users re-sort every time. | Watch whether they change the sort. |

## 9. Next UX steps in this chat

1. Information architecture and task flows for the five screens (import, dashboard, detail, settings, report), MVP first.
2. Heuristic review of spec sections 13 and 13.2 against these insights (Nielsen's 10 heuristics).
3. Wireframes for import, ranked table and detail panel.
4. UX copy for status notes, import notices and empty states.

## Sources

- [Eck et al. 2019, Understanding Flaky Tests: The Developer's Perspective](https://ar5iv.labs.arxiv.org/html/1907.01466)
- [Habchi et al. 2022, A Qualitative Study on the Sources, Impacts, and Mitigation Strategies of Flaky Tests](https://ar5iv.labs.arxiv.org/html/2112.04919)
- [Gruber and Fraser 2022, A Survey on How Test Flakiness Affects Developers and What Support They Need](https://arxiv.org/abs/2203.00483)
- [FlakyGuard](https://arxiv.org/html/2511.14002v1)
- [Large-scale longitudinal study of flaky tests](https://par.nsf.gov/biblio/10601348-large-scale-longitudinal-study-flaky-tests)
- [Trunk: managing detected flaky tests](https://docs.trunk.io/flaky-tests/management/managing-detected-flaky-tests)
- [Trunk changelog: test detail dashboard UI improvements](https://docs.trunk.io/changelog/2025-04-09-flaky-tests-test-detail-dashboard-ui-improvements)
- [Datadog Flaky Tests Management](https://docs.datadoghq.com/tests/flaky_management/)
- [Currents: Playwright HTML reporter at scale (vendor)](https://currents.dev/posts/playwright-html-reporter-why-it-breaks-down-at-scale)
- [TestDino: Playwright flaky tests (vendor)](https://testdino.com/blog/playwright-flaky-tests-fix)
