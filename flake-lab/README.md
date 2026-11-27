# Flake lab

A tiny static app (`app/index.html`) and 22 Playwright tests (`tests/lab.spec.ts`, `tests/responsive.spec.ts`) with known answers. Running it produces real Playwright JSON reports for the engine's tests and for the "Try sample data" button. Ground truth is in `labels.json` (internal labels).

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

## One test per cause (DEV-35)

`labels.json` gives every test a `label` (what the engine should say) and a `cause` (the injected cause, one of the nine spec categories, or `null` for a test that is not a flake). A test that runs in two Playwright projects has a second entry named `title [project]`.

**The lab injects each cause with seeded outcomes and realistic error text, so it validates the classifier's text rules, not real mechanisms.** The outcome of every new flaky test comes from the seeded PRNG (`labRandom`, about 45 % failures per attempt); the text is what Playwright or Node really prints for that kind of failure. Each new flaky test has at least one mixed commit (a pass and a fail on the same commit) and every attempt takes 3 to 6 s of simulated slow page.

| Test | Cause (category) | Message in the report |
| --- | --- | --- |
| `flaky: order dependency` | An earlier test left an item in the cart (order dependency) | `expect(received).toBe(expected) // Object.is equality`, `Expected: 0`, `Received: 1` |
| `flaky: stale data` | A cached order number is one behind (shared state or data) | `expect(received).toBe(expected) // Object.is equality`, `Expected: "Order #1001"`, `Received: "Order #1000"` |
| `flaky: external call` | The service is down or unhealthy (network or external service) | `page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:47123/api/orders` (nothing listens on port 47123), or a 503: `expect(received).toBe(expected)`, `Expected: 200`, `Received: 503` |
| `flaky: low memory` | The machine runs out of a resource (environment or resources) | `Error: ENOSPC: no space left on device, write` |
| `flaky: lost update` | Two overlapping saves lose one update (concurrency) | `expect(received).toBe(expected)`, `Expected: "Total: 12"`, `Received: "Total: 11"` |
| `flaky: strict locator` | A promotion adds a second "Add item" button (locator or UI) | `locator.click: Error: strict mode violation: getByRole('button', { name: 'Add item' }) resolved to 2 elements` |
| `infra: login page`, `infra: search`, `infra: cart api`, `infra: profile`, `infra: checkout` | Infrastructure event, see below (infrastructure) | `Error: apiRequestContext.get: socket hang up (ECONNRESET)` |
| `responsive: menu button` | Fails only in the `chromium-mobile` project, see below (locator or UI) | `expect(locator).toBeVisible() failed`, `Locator: getByRole('link', { name: 'Cart' })`, 5 s timeout |

The existing tests have causes too: `flaky: timing` is timing and waits, `flaky: random data` is time and randomness, `flaky: cross-run only` is shared state or data. Stable tests, `failing: wrong heading`, `unproven: regression` and `new: added last run` are not flakes, so their cause is `null`.

**Infrastructure event.** In runs 6 and 7 (one commit) the five `infra:` tests call a local server that resets every connection, so all five fail with the same message in both attempts of both runs (the port number differs, so a classifier has to normalise it), then pass again from run 8. They are labelled `stable` with cause `infrastructure`: the failures are an event, not flakiness.

**Two projects.** `responsive: menu button` (`tests/responsive.spec.ts`) runs in `chromium` and in `chromium-mobile` (Pixel 5 viewport). On the phone the navigation is behind the Menu button, so the check fails; on the desktop it passes. This is the fixture for DEV-40.

**Stacks and logs.** Failures carry multi-line stacks: project frames (`/repo/flake-lab/tests/...` and `/repo/flake-lab/lib/inject.ts`) and library frames (`node_modules/zod`, for the disk-full error that is thrown inside a library callback; Playwright and Node remove their own frames from stacks). `flaky: external call` writes a request log with an obviously fake token, `authorization: Bearer FAKE-TOKEN-NOT-A-SECRET-000000`, for the redaction tests. It is not a secret.

## Simulated durations

The durations in the reports are simulated. The app takes `?slow=ms` and shows "Loading…" until that time has passed (a slow page), and the tests really wait for it, so every duration in the JSON is a measured wait, not an edited number. The waits are seeded from `hashString(run:title:retry)` in their own stream (`labMs` in `prng.ts`), so a rerun gives about the same durations and no wait can change a pass or fail.

| Tests | Duration per attempt |
| --- | --- |
| `stable: ...`, `new: added last run` | 0.5 to 3 s |
| `flaky: ...` (timing, random data, cross-run only) | 3 to 40 s (the waits lean towards the long end) |
| `failing: wrong heading` | ends at a 5 to 30 s timeout |
| `unproven: regression` | 3 to 12 s of wait, then a 5 to 12 s timeout on odd commits (under 24 s in all) |

A failing check ends at its timeout, so a failed attempt lasts that long; a passing attempt ends when the page has loaded. Real timer jitter moves each duration by a few hundred milliseconds between reruns.

With these ranges the engine measures 13.3 minutes of Flaky wasted time over the 12 runs (nine Flaky tests), and 4.3 minutes for the top Flaky test (`flaky: cross-run only`). The totals are computed by the engine from the reports, never typed in.

## Run it

```bash
npm run lab
```

This runs the lab 12 times (`LAB_RUN=0..11`, commit `c` + floor(run / 2), so 6 commits with 2 runs each) with `retries: 1`, `workers: 1` and Chromium only. The runs go 6 at a time (`LAB_CONCURRENCY`, default 6), each with its own output folder: one after another, the simulated waits add up to about 50 minutes, side by side the whole lab takes under 9 minutes (8 min 41 s measured with the 21 tests). It writes:

- `fixtures/lab/run-00.json` to `run-11.json` and `manifest.json` (file and commit per run).
- `public/sample/`: the same 12 runs, `run-bad.json` (run 0 with two results missing `status` and one spec missing its `title`) and `manifest.json`.

The app opens from a `file://` path: no web server and no network. Randomness is seeded from `hashString(run:title:retry)` into mulberry32 (`prng.ts`), so a rerun gives the same pass and fail pattern. Timestamps change between reruns, and durations move slightly (see above). The local checkout path in the reports is replaced with `/repo`.

The browser must be installed first: `npx playwright install chromium` (it goes to `PLAYWRIGHT_BROWSERS_PATH`, `.cache\ms-playwright` on D:).
