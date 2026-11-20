# FlakeLens UX 08: Plain-Language Check

Run 2026-11-20 in the UI/UX chat. Target: Flesch-Kincaid grade 8 or lower for user-facing text, with nothing above grade 9.

## Method

- **What was scored:** every keyed string in `04-ux-copy.md`, the status notes and group headers, and every visible sentence on the dark boards (the light boards share their copy). That is 165 strings in total.
- **What was skipped:** labels under 6 words. A grade score means nothing for "Add files".
- **Domain words:** Playwright, JSON, JUnit, CI, CSV, flaky, commit and retry count as one-syllable words. The users know them, and their syllables would wrongly inflate the score.
- **Exempt:** verbatim error messages from the user's own tests (for example "TimeoutError: locator.click…"), because FlakeLens shows them exactly as reported.

## Results

| | Count |
|---|---|
| Strings scored | 165 |
| Above grade 9 | 2, now fixed (plus 1 exempt verbatim error) |
| Mean grade, copy catalog | 2.7 |
| Highest after fixes | 8.4 (`header.help`, an accessible name) |

## Rewrites

| Where | Before (grade) | After (grade) |
|---|---|---|
| Flaky status note, check-next list | "The environment, such as a slow or unavailable service" (10.2) | "Slow or unavailable services the test needs" (7.4) |
| Flaky status note, tip | "Tip: quarantine it in CI while you investigate, so it stops blocking merges." (7.6) | "Tip: while you investigate, quarantine it in CI so it can't block merges." The action comes first, and the result is plainer |
| Full Flaky note | 9.4 | 8.0 |

Applied to the Test detail boards (dark and light) and to `04-ux-copy.md`.

## Not changed, by choice

- **Board annotations** (State matrix, Table controls captions) score up to 7.8. They are notes for designers and builders, not product UI.
- **"Flakiness score", "Flip rate" and "Mixed commit"** stay as terms. Each is defined in place (score details, group headers, legend), and the glossary keeps them consistent.

## For the build

Run this check in CI on the strings file. Fail the build if any user-facing string scores above grade 9 and is not on the exempt list. The scoring script is `docs/ux/tools/readability.py` (`python docs/ux/tools/readability.py [copy-file]`). Move it to `scripts/` when the repo exists.
