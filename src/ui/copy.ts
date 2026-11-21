// Every user-facing string. Keys and copy follow docs/ux/04-ux-copy.md (section 4, with the
// renames in sections 6 to 8). Keys the doc writes as "a / b" or "[optional]" are split into one key each.
export const catalog = {
  // Global header
  'app.name': 'FlakeLens',
  'header.sampleTag': 'Sample data',
  'header.privacy': 'Nothing leaves this browser',
  'header.privacy.hint': 'FlakeLens makes 0 network requests unless you turn on a cloud provider.',
  'header.addFiles.sample': 'Add your files',
  'header.addFiles': 'Add files',
  'header.clearAll': 'Clear all data',
  'header.theme.toLight': 'Switch to light theme',
  'header.theme.toDark': 'Switch to dark theme',
  'header.help': 'Keyboard shortcuts and help',

  // Status display names (glossary; engine labels stay internal)
  'status.flaky': 'Flaky',
  'status.suspect': 'Unproven',
  'status.failing': 'Failing',
  'status.stable': 'Stable',
  'status.insufficient': 'Not enough data',
  'status.new': 'New',

  // Test health summary (replaces the header data chip)
  'health.title': 'Test health',
  'health.subtitle': '{tests} tests from {files} files · {runs} runs · {commits} commits',
  'health.notImported': '{n} results not imported',

  // Start (no data)
  'start.title': 'Find your flaky tests',
  'start.lead':
    'A flaky test passes and fails on the same code. Drop test reports from a few CI runs. You get a ranked list of flaky tests and why each one was flagged.',
  'start.drop.title': 'Drop Playwright JSON reports here',
  'start.drop.hint': 'Each file can hold one or more CI runs. More runs give better results.',
  'start.browse': 'Browse files',
  'start.sample': 'Try sample data',
  'start.privacy': 'Your files stay in this browser. Nothing is uploaded.',
  'start.help.title': 'How do I get a Playwright JSON report?',
  'start.help.step1': 'In CI, run your tests with the JSON reporter and save the file as an artifact:',
  'start.help.command': 'npx playwright test --reporter=json > results.json',
  'start.help.step2': 'Then download that file from your last 5 to 10 CI runs and drop them all here at once.',
  // Backticks mark inline code; rendered by <WithCode>.
  'start.help.oneRun': 'Only one run? Turn on retries, or add `--repeat-each=5` once, so a single run already shows flakiness.',

  // Import progress and results (spec 9.1)
  'import.reading': 'Reading {count, plural, one {# file} other {# files}}…',
  'import.file.done': 'Done',
  'import.file.waiting': 'Waiting',
  'import.cancel': 'Cancel import',
  'import.success': 'Imported {tests} tests from {runs} runs.',
  'import.added': 'Added {newRuns} runs. Now {tests} tests from {runs} runs.',
  'import.rankChange': '{count, plural, one {# new Flaky test} other {# new Flaky tests}} since your last import.',
  'import.rankChange.link': 'Show the {count} new Flaky tests',
  'import.partial':
    'Imported {tests} tests from {runs} runs. {count, plural, one {# result was} other {# results were}} not imported.',
  'import.partial.noStatus': '{count, plural, one {# result had} other {# results had}} no status: "{test}" (run {run})',
  'import.partial.noName': '{count, plural, one {# test had} other {# tests had}} no name (run {run}, position {pos})',
  'import.partial.badDuration': '{count} results had an unreadable duration. They were kept without it.',
  'import.partial.badDate': "{file}: the run start time couldn't be read, so this run keeps its import order.",
  'import.dupeIds': '{count} tests shared a name. They were told apart by project name and position.',
  'import.dupeRun': "This run was already loaded, so it wasn't counted twice.",
  'import.noCommit': 'No commit info found in {file}. Evidence across commits will be limited.',
  'import.fail.format':
    "{file} wasn't imported. It isn't a Playwright JSON report. JUnit XML support is planned for a later version.",
  'import.fail.unreadable': "{file} couldn't be read. It may be cut off. Try downloading it again.",
  'import.fail.tooBad': "{file} wasn't imported. Too much of it was unclear to rank tests reliably.",
  'import.fail.tooLarge': '{file} is larger than the {limit} limit. Try a file with fewer runs.',
  // Interim copy from the planning chat (DEV-13), pending UI/UX confirmation.
  'import.fail.timeout': "{file} took too long to read and wasn't imported. Try a smaller file or fewer runs.",
  'import.fail.crash': 'Something went wrong while reading your files. Nothing was changed. Try again.',
  'import.others': '{count, plural, one {# other file} other {# other files}} imported. You can drop another file here.',
  'import.viewNotices': 'View all notices',
  'import.region': 'Import reports',
  'import.result': 'Import result',
  'banner.dismiss': 'Dismiss',
  'import.downloadList': 'Download not-imported list',
  'import.formatHelp': 'Which format do I need?',

  // Leave sample dialog
  'leaveSample.title': 'Leave sample data?',
  'leaveSample.body':
    'Your {count, plural, one {file} other {# files}} will be analysed on their own. Sample data is never mixed with your runs.',
  'leaveSample.stay': 'Stay in sample',
  'leaveSample.confirm': 'Analyse my files',

  // Tests (ranked list)
  'tests.h1': 'Tests ranked by fix priority',
  'tests.banner.sample':
    'Sample data: {tests} tests from {runs} runs. {count} results were not imported (see why). Start with the top 3 Flaky tests. They gave different results on the same code.',
  'tests.banner.exitSample': 'Exit sample',
  'tests.filter.label': 'Filter by status',
  'tests.filter.all': 'All',
  'tests.filter.flaky': 'Flaky',
  'tests.filter.suspect': 'Unproven',
  'tests.filter.failing': 'Failing',
  'tests.wasted.title': 'Wasted CI time (Flaky)',
  'tests.wasted.estimate': '+ ~{min} min possible (Unproven, estimate)',
  'tests.search.placeholder': 'Search tests and files',
  'tests.moreColumns': 'More columns',
  'tests.legend':
    "Last 12 runs, oldest first: Passed · Passed on retry · Failed · Skipped (each square's tooltip shows its result)",
  'tests.col.rank': '#',
  'tests.col.rank.label': 'Rank',
  'tests.col.test': 'Test',
  'tests.col.status': 'Status',
  'tests.col.why': 'Evidence',
  'tests.col.wasted': 'Wasted time',
  'tests.col.wasted.hint':
    'CI minutes spent on failed attempts of commits where this test also passed. Sorts inside each group.',
  'tests.export': 'Export',
  'tests.export.copyTop': 'Copy top Flaky tests',
  'tests.export.copyTop.hint': 'Markdown list: rank, name, evidence, wasted minutes',
  'tests.export.csv': 'Download CSV',
  'tests.export.json': 'Download JSON',
  'tests.export.later': 'Coming in v1',
  'tests.group.show': 'Show {count} {group} tests',
  'tests.keys': 'j k move · Enter open · / search · ? all shortcuts',
  'tests.group.flaky': 'Flaky · {n} · Different results on the same commit',
  'tests.group.suspect': 'Unproven · {n} · Mixed results, never on the same commit. Could be flaky or a real bug',
  'tests.group.failing': 'Failing · {n} · Fails almost every run. Likely a real bug',
  'tests.group.stable': 'Stable · {n} · No sign of flakiness',
  'tests.group.insufficient': 'Not enough data · {n} · Too little history to judge',

  // Evidence sentences (number first)
  'why.mixed': '{m} of {g} commits had both a pass and a fail',
  'why.retry': 'Passed on retry in {r} of {n} runs',
  'why.suspect': 'Switched between pass and fail {f} times in {n} runs',
  'why.failing': 'Failed {x} of {n} runs',
  'why.failingWasFlaky': 'Failed {x} of {x} runs since {sha}. Flaky before that',
  'why.stable': 'Passed {n} of {n} runs',
  'why.insufficient': 'Only {count, plural, one {# attempt} other {# attempts}} loaded',

  // Wasted time cell
  'wasted.measured': '{min} min',
  'wasted.estimate': '~{min} min (est.)',
  'wasted.none': '—',

  // Test detail panel
  'panel.prev': 'Previous test',
  'panel.next': 'Next test',
  'panel.position': '{i} of {count} shown',
  'panel.copySummary': 'Copy summary',
  'panel.copySummary.done': 'Summary copied',
  'panel.close': 'Close panel',
  'panel.wasted': 'Wasted CI time {min} min',
  'panel.diffstat': '{passed} passed · {failed} failed attempts',
  'panel.history.title': 'Run history · {runs} runs on {commits} commits',
  'panel.history.filter.all': 'All attempts',
  'panel.history.filter.failures': 'Failures only',
  'panel.history.legend': 'Pass · Fail · Pass after retry · Skipped · Mixed commit: passed and failed on the same code',
  'panel.history.hint': 'Oldest on the left. Each column is one run. Stacked shapes are retries in that run.',
  'panel.history.runLabel': 'Run {n}, commit {sha}: {attempts}',
  'panel.history.runLabel.mixed': 'Run {n}, commit {sha}, mixed commit: {attempts}',
  'panel.note.title': 'What this means',
  'panel.note.next': 'What to check next',
  'panel.failure.title': 'Latest failure',
  'panel.failure.meta': 'Run {n} · commit {sha} · attempt {a} of {total} · {date}',
  'panel.failure.hunk': 'Run {n} · attempt {a} failed, attempt {b} passed · same commit',
  'panel.failure.sign.fail': 'fail',
  'panel.failure.sign.pass': 'pass',
  'panel.failure.passedAfter': 'Attempt {a} passed in {s} s on the same commit.',
  'panel.failure.prev': 'Show previous failure',
  'panel.failure.copy': 'Copy error message',
  'panel.score.title': 'How the score is built',
  'panel.score.score':
    'Flakiness score {s} of 100: how strongly the evidence points to flakiness. Higher means more certain.',
  'panel.score.mixed': 'Mixed commits {m} of {g}: commits where this test both passed and failed.',
  'panel.score.flip': 'Flip rate {f}: how often the result switched between pass and fail from one attempt to the next.',
  'panel.score.seen': 'First seen {first} · last failed {last}',

  // Status notes
  'note.flaky.means':
    'This test gave different results on the same code. The likely cause is in the test or its environment, not in a code change.',
  'note.flaky.next':
    "Waits and timing · Data or state shared between tests · Test order · Slow or unavailable services the test needs. Tip: while you investigate, quarantine it in CI so it can't block merges.",
  'note.suspect.means': 'Results are mixed, but never on the same commit. This could be a real bug, not flakiness.',
  'note.suspect.next': 'Code changes near the first failure · Run it again several times on one commit to confirm.',
  'note.failing.means': 'It fails almost every run. This is likely a real bug or a broken test, not flakiness.',
  'note.failing.next': 'The first commit where it started failing · Recent changes to the feature or the test.',
  'note.failingWasFlaky.means': 'It fails almost every run now. It was flaky before {sha}.',
  'note.failingWasFlaky.next': 'What changed at {sha} · Whether the flaky behaviour hid a real bug.',
  'note.stable.means': 'No sign of flakiness in the loaded runs.',
  'note.stable.next': 'Nothing needed.',
  'note.stable.nextLow': 'Nothing needed. With only {n} runs loaded, confidence is low.',
  'note.insufficient.means': 'There is too little history to judge this test.',
  'note.insufficient.next': 'Load more runs, ideally several on the same commit · Or turn on retries in CI.',

  // Loaded data
  'data.back': 'Back to tests',
  'data.title': 'Loaded data',
  'data.lead': 'Rankings use only these files. Everything stays in this browser.',
  'data.files': 'Files · {count}',
  'data.file.meta': 'Added {date} · {runs} runs, {tests} tests',
  'data.file.meta.notImported': 'Added {date} · {runs} runs, {tests} tests, {n} not imported',
  'data.file.ok': 'Imported',
  'data.file.partial': 'Partly imported',
  'data.notices': 'Notices · {count}',
  'data.download': 'Download not-imported list: CSV / JSON',
  'data.runs': 'Runs · {count}',
  'data.runs.col.run': 'Run',
  'data.runs.col.commit': 'Commit',
  'data.runs.col.branch': 'Branch',
  'data.runs.col.browser': 'Browser',
  'data.runs.col.time': 'Time',
  'data.runs.col.tests': 'Tests',
  'data.runs.showAll': 'Show all {count} runs',
  'data.remove.title': 'Remove data',
  'data.remove.body': 'Removing a single file comes in a later version. For now you can clear everything.',
  'data.remove.action': 'Clear all data',

  // Empty and edge states
  'empty.filter.title': 'No {status} tests in these {runs} runs',
  'empty.filter.body': 'Good news. More runs make this more certain.',
  'empty.filter.action': 'Show all tests',
  'empty.search.title': 'No test matches "{query}"',
  'empty.search.body': 'Search covers test names and file names.',
  'empty.search.suggest': 'Search for "{suggestion}" instead',
  'empty.search.clear': 'Clear search',
  'missing.test.title': "This test isn't in the loaded data",
  'missing.test.body': 'It may have been renamed, or its files were cleared.',
  'missing.test.action': 'Back to tests',
  'storage.fail':
    "Your saved data couldn't be read. Reload the page to try again. If it keeps happening, clear all data and import your files again.",
  'storage.off': "This browser won't keep your data after you close the tab. Results are still shown for now.",

  // Clear all data dialog
  'clear.title': 'Clear all data?',
  'clear.body': "This deletes {files} files, {runs} runs and all results from this browser. You can't undo this.",
  'clear.keep': 'Keep my data',
  'clear.confirm': 'Clear all data',
  'clear.done': 'All local data cleared',

  // Shortcuts sheet
  'keys.title': 'Keyboard shortcuts',
  'keys.toggle': 'Single-key shortcuts',
  'keys.toggle.hint': 'They never fire while you type in a text field.',
  'keys.list': 'j / k: Next / previous test · Enter: Open details · Esc: Close details · /: Search · ?: This sheet',
} as const satisfies Record<string, string>;

export type CopyKey = keyof typeof catalog;
type Params = Record<string, string | number>;

const plural = new Intl.PluralRules('en');

// Index of the "}" that closes the "{" at `open`.
function closing(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return i;
  }
  throw new Error(`Unbalanced braces in "${s}"`);
}

function param(key: string, name: string, params: Params): string | number {
  const v = params[name];
  if (v !== undefined) return v;
  // Fail loudly in dev and tests; in production show the raw placeholder rather than crash.
  if (!import.meta.env.PROD) throw new Error(`t('${key}'): missing param "${name}"`);
  return `{${name}}`;
}

// Supports {name} and {name, plural, one {…} other {…}} with "#" for the number (ICU subset).
function format(key: string, s: string, params: Params): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') {
      out += s[i];
      continue;
    }
    const end = closing(s, i);
    const body = s.slice(i + 1, end);
    const m = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(body);
    if (!m) out += String(param(key, body.trim(), params));
    else {
      const n = Number(param(key, m[1]!, params));
      const branches = new Map<string, string>();
      const rest = m[2]!;
      for (let j = 0; j < rest.length; ) {
        const sel = /^\s*(=?\w+)\s*\{/.exec(rest.slice(j));
        if (!sel) break;
        const open = j + sel[0].length - 1;
        const close = closing(rest, open);
        branches.set(sel[1]!, rest.slice(open + 1, close));
        j = close + 1;
      }
      const branch = branches.get(`=${n}`) ?? branches.get(plural.select(n)) ?? branches.get('other') ?? '';
      out += format(key, branch.replaceAll('#', String(n)), params);
    }
    i = end;
  }
  return out;
}

export function t(key: CopyKey, params: Params = {}): string {
  return format(key, catalog[key], params);
}
