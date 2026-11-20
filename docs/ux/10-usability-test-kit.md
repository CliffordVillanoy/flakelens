# FlakeLens UX 10: Usability Test Kit

Prepared 2026-11-20 in the UI/UX chat. This is a reusable usability check for an ongoing project. Run it yourself, or with anyone you have at hand, whenever the boards change. There is no fixed participant count and no recruiting step; the user removed them on 2026-11-20. Persona tasks (Maya, Sam, Lee) are walked as roles.

## 1. Plan

| Item | Decision |
|---|---|
| Goal | Can people of different technical levels find the flaky tests, trust why they are flagged, and share what to fix first? |
| Who | Whoever runs the check: you, or anyone available. Take the role of a persona for each task: Maya (SDET), Sam (developer), Lee (non-technical learner) |
| Format | Think-aloud, solo or with one helper. Note what you expected and what surprised you |
| What they use | The clickable prototype: `http://localhost:8765/_preview.html?board=Main.dc.html` (launch config `wireframe-preview`). Alternate runs between the dark and light boards (`MainLight.dc.html`) to compare themes |
| Length | About 30 minutes per run |
| Success targets | Ranked list reached in under 2 min (spec MVP done-when). At least 80% task success overall. SUS 70 or higher. At least 3 positive reaction words per run |

**Prototype limits:**
- These are static screens. Links and the main buttons move between screens (Try sample data, Browse files, Add your files, Clear all data).
- Typing, filters and sorting don't change the data. Ask people to say what they *would* expect.
- Hovering shows tooltips on the run squares and the Wasted time header.

## 2. Intro (when someone else runs it)

> Thanks for helping. We're testing a design, not you. There are no wrong answers, and if something is confusing, that's the design's fault. Please think aloud: say what you're looking at, what you expect, and what surprises you. Some parts are not working yet; if something doesn't respond, tell me what you expected. With your permission I'll record the screen and audio. The recording stays on my machine and is deleted after I write up notes. You can stop at any time. Is that OK?

## 3. Warm-up (2 min)

- Tell me about the last time a test failed in CI and you weren't sure why.
- What did you do about it?

## 4. Tasks

Read each scenario, not the steps. Do not help unless the person is stuck for 2 minutes, and if you do, mark the task "assisted".

| # | Scenario (read aloud) | Start screen | Success criteria | Target | Flow / insight checked |
|---|---|---|---|---|---|
| T1 | "You heard this tool can find flaky tests. You don't have any reports with you. Have a look at what it can do." | Start | Reaches Tests via Try sample data | under 2 min | F1, I3 |
| T2 | "Which test should your team fix first, and why?" | Tests | Names *checkout › applies coupon code* and gives a reason based on the Why or wasted time | under 1 min | F4, I1, I2 |
| T3 | "What do the small squares next to each test tell you?" | Tests | Explains passed, failed and retry, using the legend or tooltips | — | W1, inclusive |
| T4 | "Open the top test. Convince me it's really flaky, not a real bug." | Tests | Opens the panel, points at the mixed commits or "4 of 9 commits" | under 1.5 min | F3, I1, W4/W5 |
| T5 | "Your lead asks for a short summary of this test for a ticket. Get it." | Detail | Finds Copy summary | under 30 s | F4 end artifact |
| T6 | "What's the difference between Flaky and Unproven here?" | Tests | Gives a correct paraphrase using the group header text | — | I10 learner |
| T7 | "Some data from your files wasn't imported. Find out what and why." | Tests | Reaches Loaded data via the chip or "see why", and reads the notices | under 1 min | F2, 9.1 |
| T8 | "You're done for today and want to remove everything this tool stored." | Loaded data | Finds Clear all data and reads the dialog. Expects nothing is uploaded | — | F6, I9 |
| T9 (Maya or Sam role) | "Your suite has 1,000+ tests. How would you see only Flaky tests that match 'coupon', with fewer columns?" | Tests, then the Table controls board | Points to the Flaky tile, search, Columns and density | — | Table upgrade |

**Probes after each task:**
- What did you expect to happen?
- How confident are you in that answer, from 1 to 5?
- Was anything confusing or missing?

## 5. First-click test (5 questions, separate quick round)

Show the screen and ask: "Where would you click first to…"

| # | Screen | Question | Correct first click |
|---|---|---|---|
| FC1 | Start | …try the tool without your own files? | Try sample data |
| FC2 | Tests | …see only the Flaky tests? | Flaky tile |
| FC3 | Tests | …understand why test #1 is flagged? | Row 1 (or its Why cell) |
| FC4 | Detail | …give your lead a summary? | Copy summary |
| FC5 | Tests | …check whether all your files were read? | Data chip or "see why" |

Record the first click and the time to click. Success means the correct target on the first click.

## 6. 5-second test (start of the session, before the tasks)

Show **Tests** for 5 seconds, then hide it and ask:
1. What is this tool for?
2. What was the most important thing on the screen?
3. Anything you'd want to click?

Pass: answer 1 mentions flaky or unreliable tests, and answer 2 names the ranked list or a status.

## 7. SUS questionnaire (after the tasks)

Rate each from 1 (strongly disagree) to 5 (strongly agree):

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Scoring:**
- For odd items, subtract 1 from the rating.
- For even items, subtract the rating from 5.
- Add the 10 results and multiply by 2.5, giving 0 to 100.
- Target: 70 or higher. 68 is the average for this method.

## 8. Desirability: reaction words (after SUS)

"Pick the 5 words that best describe what you just used, and tell me why for each."

> Professional · Trustworthy · Clear · Fast · Calm · Technical · Overwhelming · Confusing · Busy · Simple · Useful · Credible · Dated · Polished · Cluttered · Approachable · Intimidating · Efficient · Inconsistent · Friendly · Boring · Organized · Accessible · Generic · Reliable · Easy to use · Too technical · Clean · Slow · Valuable

**Targets:**
- At least 3 of the 5 words come from the intended set: Professional, Trustworthy, Clear, Calm, Credible, Polished, Organized, Efficient, Approachable, Reliable, Clean.
- In the Lee role, the words do not include "Intimidating" or "Too technical".

## 9. Wrap-up (2 min)

- If you could change one thing, what would it be?
- Would you use this on your own CI results? Why or why not?

## 10. Note sheet (one per run)

| Task | Success (Y / assisted / N) | Time | Confidence 1–5 | Quotes / observations | Issue IDs |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| T3 | | | | | |
| T4 | | | | | |
| T5 | | | | | |
| T6 | | | | | |
| T7 | | | | | |
| T8 | | | | | |
| T9 | | | | | |

Also record:
- First clicks: FC1 to FC5
- 5-second answers
- SUS score
- The 5 reaction words

## 11. Synthesis template

**Issue log.** Give every observed problem one row. Severity uses the same scale as `06`: P1 blocks or misleads, P2 slows or confuses, P3 is friction.

| ID | Observation | Persona role | Task | Severity | Likely cause (screen / element) | Fix idea |
|---|---|---|---|---|---|---|

**Summary metrics:**

| Metric | This run | Previous run | Target | Met? |
|---|---|---|---|---|
| Time to ranked list (T1) | | | < 2 min | |
| Task success rate | | | ≥ 80% | |
| First-click success | | | ≥ 4 of 5 | |
| SUS | | | ≥ 70 | |
| Positive reaction words | | | ≥ 3 | |

**Decision rule:**
- Any P1 is fixed before the next board change ships.
- P2s are fixed in the next refinement round.
- Everything else goes to the backlog.
- Write the results to `docs/ux/11-usability-results.md` and keep each run's metrics so trends show across refinements.
