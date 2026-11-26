# Flake lab

A tiny static app (`app/index.html`) and 9 Playwright tests (`tests/lab.spec.ts`) with known answers. Running it produces real Playwright JSON reports for the engine's tests and for the "Try sample data" button. Ground truth is in `labels.json` (internal labels).

## Injected causes

| Test | Cause | Expected label |
| --- | --- | --- |
| `stable: shows heading`, `stable: adds item`, `stable: shows footer` | None; always pass. | stable |
| `flaky: timing` | The Checkout button appears after a seeded delay; the test waits a fixed 200 ms and checks visibility without auto-wait. | flaky |
| `flaky: random data` | The test types a seeded username; 4 of the 10 possible names are already taken in the app. | flaky |
| `flaky: cross-run only` | Flaky across runs, never within a run (what retries cannot see): fails both attempts on even runs, passes on odd runs, so each commit has one failing and one passing run. | flaky |
| `failing: wrong heading` | The test expects a heading the app never shows. | failing |
| `unproven: regression` | The app shows a wrong total on odd commits (c1, c3, c5); deterministic, so the retry fails too. | suspect |
| `new: added last run` | Defined only in run 11; one pass is too little history. | insufficient |

## Final tuning values

- Timing delay: seeded in 0–150 ms (passes) or 250–400 ms (fails), 50/50. The 150–250 ms band is left out so real timer jitter around the 200 ms wait cannot change an outcome between reruns.
- Taken names: 4 of 10 (40%).

With these values both seeded flaky tests (timing, random data) show a mixed commit (a pass and a fail on the same commit) in the committed fixtures.

## Simulated durations

The durations in the reports are simulated. The app takes `?slow=ms` and shows "Loading…" until that time has passed (a slow page), and the tests really wait for it, so every duration in the JSON is a measured wait, not an edited number. The waits are seeded from `hashString(run:title:retry)` in their own stream (`labMs` in `prng.ts`), so a rerun gives about the same durations and no wait can change a pass or fail.

| Tests | Duration per attempt |
| --- | --- |
| `stable: ...`, `new: added last run` | 0.5 to 3 s |
| `flaky: ...` (timing, random data, cross-run only) | 3 to 40 s (the waits lean towards the long end) |
| `failing: wrong heading` | ends at a 5 to 30 s timeout |
| `unproven: regression` | 3 to 12 s of wait, then a 5 to 12 s timeout on odd commits (under 24 s in all) |

A failing check ends at its timeout, so a failed attempt lasts that long; a passing attempt ends when the page has loaded. Real timer jitter moves each duration by a few hundred milliseconds between reruns.

With these ranges the engine measures 10.6 minutes of Flaky wasted time over the 12 runs, and 4.3 minutes for the top Flaky test (`flaky: cross-run only`). The totals are computed by the engine from the reports, never typed in.

## Run it

```bash
npm run lab
```

This runs the lab 12 times (`LAB_RUN=0..11`, commit `c` + floor(run / 2), so 6 commits with 2 runs each) with `retries: 1`, `workers: 1` and Chromium only. The runs go 6 at a time (`LAB_CONCURRENCY`, default 6), each with its own output folder: one after another, the simulated waits add up to about half an hour, side by side the whole lab takes about 6 minutes (6 min 21 s measured). It writes:

- `fixtures/lab/run-00.json` to `run-11.json` and `manifest.json` (file and commit per run).
- `public/sample/`: the same 12 runs, `run-bad.json` (run 0 with two results missing `status` and one spec missing its `title`) and `manifest.json`.

The app opens from a `file://` path: no web server and no network. Randomness is seeded from `hashString(run:title:retry)` into mulberry32 (`prng.ts`), so a rerun gives the same pass and fail pattern. Timestamps change between reruns, and durations move slightly (see above). The local checkout path in the reports is replaced with `/repo`.

The browser must be installed first: `npx playwright install chromium` (it goes to `PLAYWRIGHT_BROWSERS_PATH`, `.cache\ms-playwright` on D:).
