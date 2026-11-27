// Keeps the sample under 1 MB (DEV-37): Playwright puts the source code frame ("snippet") into every error and again into
// errors[]. The engine never reads it, and it is the biggest part of a failing result after the message and stack, so
// the lab drops it. Messages, stacks, call logs and stdout stay as Playwright wrote them.
export function trimReport(text) {
  const report = JSON.parse(text);
  const walk = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        for (const result of test.results ?? []) {
          if (result.error) delete result.error.snippet;
          for (const e of result.errors ?? []) delete e.snippet;
        }
    (suite.suites ?? []).forEach(walk);
  };
  (report.suites ?? []).forEach(walk);
  return JSON.stringify(report, undefined, 2);
}
