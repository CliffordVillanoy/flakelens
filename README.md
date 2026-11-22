<div align="center">

# FlakeLens

**Local-first flaky test detection and triage for Playwright.**

No account required · No report uploads · No backend · Free to use

</div>

FlakeLens is a free, browser-based tool that helps QA Engineers, Automation Engineers, and SDETs identify, investigate, and prioritize flaky tests using historical Playwright CI execution reports.

By analyzing multiple test runs, FlakeLens ranks unstable tests and separates **confirmed flakiness** from **unproven** results, helping teams make evidence-based decisions instead of relying solely on individual failures or retries.

> **Development Status:** v0 — Work in Progress. Core flaky test detection, reporting, and browser-based analysis features are implemented. Additional capabilities are planned.

> **v0 limitation:** v0 treats each imported file as its own commit. Commit labels and reading commits from report metadata are not in the app yet, so same-commit evidence across runs currently shows in the sample data. For your own reports, Flaky means a test passed on a retry within one run.

## Try FlakeLens

**[Launch Live Demo](https://cliffordvillanoy.github.io/flakelens/)**

### Getting Started

1. Open the FlakeLens web application.
2. Click **Try sample data** to explore the application using predefined test runs.
3. Alternatively, drag and drop Playwright JSON reports from multiple CI executions.
4. Explore the ranked and grouped test results.
5. Select a test to inspect its execution history and available evidence.

No installation or account is required to use the hosted application.

## Features

### Evidence-Based Flaky Test Detection

FlakeLens analyzes test outcomes across CI runs to identify inconsistent behavior.

It distinguishes between:

- **Confirmed Flaky:** A test has both passing and failing outcomes associated with the same commit. (In v0 this applies to the built-in sample data; for your own reports see the v0 limitation above.)
- **Unproven:** A test exhibits concerning execution patterns, but the available evidence does not establish confirmed flakiness.

This distinction helps engineers avoid confusing legitimate regressions with unstable tests.

### Flaky Test Ranking

The v0 scoring engine ranks tests using historical execution evidence, making it easier to identify which tests warrant further investigation.

### Test Execution History

Inspect individual tests through a detail panel containing their available execution history.

Review test outcomes across CI runs to better understand inconsistent behavior.

### Playwright JSON Report Import

Load reports from multiple Playwright CI executions directly into the browser.

- Import multiple JSON reports.
- View ranked and grouped test results.
- Review import notices.
- Download information about data that could not be imported.
- Preserve imported data locally between sessions.

### Built-in Flake Lab

FlakeLens includes a controlled test environment with deliberately introduced flaky behavior.

The lab supports validation of the detection engine against known ground-truth labels.

### Privacy-First Architecture

FlakeLens processes imported test reports locally in the browser without uploading them to a server.

- No account or authentication.
- No backend required for analysis.
- Browser-based report processing.
- Local data persistence using IndexedDB.
- Self-hosted fonts.
- Same-origin network restrictions.

## How It Works

**Import → Analyze → Classify → Rank → Investigate**

| Step | Description |
|---|---|
| 1. Import | Load Playwright JSON reports from multiple CI runs. |
| 2. Analyze | Examine test outcomes and execution history. |
| 3. Classify | Identify confirmed flakiness and distinguish it from unproven results. In v0, for your own reports each file counts as its own commit (see the v0 limitation above). |
| 4. Rank | Apply the v0 scoring engine to prioritize tests for investigation. |
| 5. Investigate | Review detailed execution histories and supporting evidence. |

### Why Same-Commit Evidence Matters

A test that fails in one CI run and passes in another is not necessarily flaky. The difference may result from changes in application code.

FlakeLens looks for inconsistent outcomes associated with the **same commit**, providing stronger evidence that a test is unstable.

This helps separate observed flakiness from potential regressions, although the underlying root cause may still require investigation.

In v0, same-commit evidence across runs shows in the built-in sample data. For your own reports, each imported file counts as its own commit, so a test is Flaky when it passes on a retry within one run.

## Detection Engine Evaluation

FlakeLens includes a synthetic evaluation environment that compares its detection engine against Playwright's built-in flaky test classification.

Playwright's baseline identifies a test as flaky when it fails and subsequently passes on retry within a single run.

FlakeLens evaluates historical execution outcomes across runs, allowing it to detect certain cases that single-run retry classification may miss. The lab data carries commit information, which imported files do not have in v0.

### Flake Lab Results

| Method | CI Runs | Precision | Recall | F1 Score |
|---|---:|---:|---:|---:|
| **FlakeLens Engine** | 4 | 1.00 | 1.00 | 1.00 |
| **FlakeLens Engine** | 8 | 1.00 | 1.00 | 1.00 |
| **FlakeLens Engine** | 12 | 1.00 | 1.00 | 1.00 |
| Playwright Baseline | 4 | 1.00 | 0.67 | 0.80 |
| Playwright Baseline | 8 | 1.00 | 0.67 | 0.80 |
| Playwright Baseline | 12 | 1.00 | 0.67 | 0.80 |

**Evaluation summary:** Within the controlled laboratory dataset, FlakeLens correctly identified all three known flaky tests, with no false positives, at each evaluated history length. The Playwright retry-based baseline identified two of the three.

### Evaluation Methodology

The evaluation uses:

- 9 synthetic test cases.
- 3 tests labeled as flaky.
- 12 CI runs across 6 commits.
- Chromium as the execution browser.
- Deliberately injected flaky behavior.
- Historical evaluations using 4, 8, and 12 runs.

**Important limitation:** These results come from a small, controlled synthetic dataset with known failure conditions. They demonstrate expected detection behavior within the lab and must not be interpreted as real-world detection accuracy or evidence of general superiority over Playwright.

The evaluation can be reproduced using:

`npm run eval:lab`

For the complete methodology, ground-truth definitions, and evaluation results, see [Flake Lab Detection Report](docs/eval/lab-detection.md).

## Privacy and Data Handling

**Your test reports remain in your browser.**

FlakeLens uses a local-first architecture designed to keep imported CI execution data under your control.

| Component | Implementation |
|---|---|
| Report analysis | Local browser processing |
| Persistent storage | IndexedDB |
| Report uploads | None |
| Backend processing | Not required |
| Sample data | Not persisted |
| Data removal | Clear all data |
| Network policy | Same-origin Content Security Policy |
| Fonts | Self-hosted |

### Local Data Storage

Imported reports are stored in the browser's IndexedDB database until explicitly removed.

To delete imported reports:

1. Navigate to **Loaded data**.
2. Click **Clear all data**.
3. Confirm the deletion.

Sample data is not saved to persistent storage.

Browser settings that clear site data may also remove locally stored reports.

### Automated Privacy Verification

FlakeLens includes an end-to-end privacy test:

`e2e/privacy.spec.ts`

The test checks that, during the covered default-mode workflow:

- HTTP requests remain within the application's origin.
- No WebSocket connections are opened.
- Fonts are loaded from the application itself.
- The application declares a restrictive Content Security Policy.

The Content Security Policy restricts connections to the application's own origin.

These checks provide automated coverage for the tested behavior but are not a comprehensive security audit.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Local Storage | IndexedDB, Dexie |
| State Management | Zustand |
| Data Validation | Zod |
| Unit Testing | Vitest |
| Property-Based Testing | fast-check |
| E2E Testing | Playwright |
| Accessibility Testing | axe-core with Playwright |
| Code Quality | ESLint, Prettier |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

## Local Development

### Prerequisites

- Node.js and npm
- Git
- Chromium browser binaries for Playwright-based testing

### Installation

Clone the repository:

```bash
git clone https://github.com/CliffordVillanoy/flakelens.git
cd flakelens
```

Install dependencies:

```bash
npm install
```

The installation also configures the repository's pre-push Git hook, which runs type checking, linting, and unit tests.

### Start the Development Server

```bash
npm run dev
```

Open the application at:

http://localhost:5173

### Build for Production

```bash
npm run build
```

The build command performs TypeScript validation and generates the production application using Vite.

## Testing and Quality Assurance

FlakeLens includes automated tests for its detection engine, application behavior, and privacy requirements.

### Unit, Property-Based, and Lab Acceptance Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### End-to-End and Accessibility Testing

Install Playwright Chromium:

```bash
npx playwright install chromium
```

Run the E2E test suite:

```bash
npm run e2e
```

This command builds the application before executing Playwright tests.

### Run the Flake Lab

```bash
npm run lab
```

This executes the controlled flaky test laboratory and requires Playwright Chromium.

### Regenerate the Evaluation Report

```bash
npm run eval:lab
```

Regenerates:

`docs/eval/lab-detection.md`

## Development Roadmap

FlakeLens follows an incremental development approach, prioritizing test reliability, reproducibility, and evidence-based functionality.

### v0 — Core Functionality

- [x] Flaky test scoring engine
- [x] Controlled Flake Lab
- [x] Browser-based application
- [x] Playwright JSON report import
- [x] Multiple CI run analysis
- [x] Ranked and grouped test results
- [x] Test execution history panel
- [x] Built-in sample data
- [x] Import notices and unimported-data downloads
- [x] IndexedDB local persistence
- [x] Clear all data functionality
- [x] Automated privacy verification
- [x] Synthetic detection evaluation

### Planned Enhancements

- [ ] Commit labels for imported files
- [ ] JUnit XML report import
- [ ] Individual imported-file removal
- [ ] Failure fingerprinting and cause grouping
- [ ] Rule-based root-cause classification
- [ ] AI-assisted explanations with supporting evidence
- [ ] Validation against real-world datasets

Additional enhancements will be prioritized based on development progress, technical feasibility, and user feedback.

## Documentation

For detailed technical information, implementation decisions, and evaluation methodology, refer to:

- [Project Specification](docs/SPEC.md)
- [Development Documentation](docs/dev/README.md)
- [Flake Lab Evaluation](docs/eval/lab-detection.md)

## Project Motivation

Flaky tests create uncertainty in automated test results. They can increase CI execution costs, slow down development workflows, and reduce confidence in automated quality gates.

A failed test does not always indicate a product defect, and a passing retry does not necessarily provide enough evidence to understand the underlying problem.

FlakeLens was created to help make flaky test investigation more systematic, transparent, and accessible.

Its goal is to provide QA Engineers, Automation Engineers, and SDETs with a lightweight solution for identifying inconsistent tests through historical execution evidence, without requiring complex infrastructure or external report processing.

**Less manual report comparison. More evidence-driven test investigation.**

## License

FlakeLens is released under the [MIT License](LICENSE).

---

<div align="center">

**FlakeLens — Local-first flaky test triage for Playwright.**

*Built with a focus on test reliability, developer experience, and privacy.*

</div>
