# Flake lab

A tiny static app (`app/index.html`) and 8 Playwright tests (`tests/lab.spec.ts`) with known answers. Running it produces real Playwright JSON reports for the engine's tests and for the "Try sample data" button. Ground truth is in `labels.json` (internal labels).

## Injected causes

| Test | Cause | Expected label |
| --- | --- | --- |
| `stable: shows heading`, `stable: adds item`, `stable: shows footer` | None; always pass. | stable |
| `flaky: timing` | The Checkout button appears after a seeded delay; the test waits a fixed 200 ms and checks visibility without auto-wait. | flaky |
| `flaky: random data` | The test types a seeded username; 4 of the 10 possible names are already taken in the app. | flaky |
| `failing: wrong heading` | The test expects a heading the app never shows. | failing |
| `unproven: regression` | The app shows a wrong total on odd commits (c1, c3, c5); deterministic, so the retry fails too. | suspect |
| `new: added last run` | Defined only in run 11; one pass is too little history. | insufficient |

## Final tuning values

- Timing delay: seeded in 0–150 ms (passes) or 250–400 ms (fails), 50/50. The 150–250 ms band is left out so real timer jitter around the 200 ms wait cannot change an outcome between reruns.
- Taken names: 4 of 10 (40%).

With these values both flaky tests show a mixed commit (a pass and a fail on the same commit) in the committed fixtures.

## Run it

```bash
npm run lab
```

This runs the lab 12 times (`LAB_RUN=0..11`, commit `c` + floor(run / 2), so 6 commits with 2 runs each) with `retries: 1`, `workers: 1` and Chromium only. It writes:

- `fixtures/lab/run-00.json` to `run-11.json` and `manifest.json` (file and commit per run).
- `public/sample/`: the same 12 runs, `run-bad.json` (run 0 with two results missing `status` and one spec missing its `title`) and `manifest.json`.

The app opens from a `file://` path: no web server and no network. Randomness is seeded from `hashString(run:title:retry)` into mulberry32 (`prng.ts`), so a rerun gives the same pass and fail pattern. Timestamps and durations change between reruns. The local checkout path in the reports is replaced with `/repo`.

The browser must be installed first: `npx playwright install chromium` (it goes to `PLAYWRIGHT_BROWSERS_PATH`, `.cache\ms-playwright` on D:).
