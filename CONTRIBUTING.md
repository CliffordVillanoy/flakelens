# Contributing to FlakeLens

Thanks for taking a look. FlakeLens is a small, local-first project, so contributions are welcome but kept simple. Please read the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## Run it

You need Node.js and npm.

```bash
npm install
npm run dev        # the app on a local address
npm test           # unit tests
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run e2e        # builds the app, then runs the browser tests (Chromium)
```

`npm run e2e` installs nothing by itself. If Playwright asks for a browser, run `npx playwright install chromium` once.

## Reporting a bug

Use the [bug report form](https://github.com/CliffordVillanoy/flakelens/issues/new/choose). A good report has:

- what you did, step by step, and what you expected to happen;
- what happened instead, with a screenshot if it helps;
- the browser and its version, and the commit or the date of the live demo you used;
- the smallest input that shows the problem.

**Never attach real test reports, secrets or personal data to an issue.** Playwright reports can hold test names, file paths, commit SHAs, error messages and stack traces from your own project. Replace those with made-up values, or reproduce the problem with the built-in sample data. A security problem goes through [private reporting](SECURITY.md), not a public issue.

## Rules for changes

- Open an issue first for anything larger than a small fix, so we can agree on the idea.
- Write the test first and see it fail, then make it pass. Run `npm test`, `npm run typecheck`, `npm run lint` and, when the app changes, `npm run e2e`.
- Keep commit messages plain: one short line saying what changed, no tags or signatures from tools.
- Make a pull request. `main` is protected, so changes land through pull requests only.
- Do not add a dependency, a network call, an account or a secret without discussing it first. The app must keep working with nothing leaving the browser.
- All visible text lives in `src/ui/copy.ts`, not in the components.

## Where the plan lives

The roadmap and the numbered tickets are in [docs/dev/README.md](docs/dev/README.md). The design rules are in [DESIGN.md](DESIGN.md) and the product spec is in [docs/SPEC.md](docs/SPEC.md).
