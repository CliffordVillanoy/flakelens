// Every user-facing string. Keys and copy follow docs/ux/04-ux-copy.md (section 4, with the
// renames in sections 6 to 8). Keys the doc writes as "a / b" or "[optional]" are split into one key each.
export const catalog = {
  // Global header
  'app.name': 'FlakeLens',
  'header.sampleTag': 'Sample data',
  'header.privacy': 'Nothing leaves this browser',
  // Section 10 of docs/ux/04-ux-copy.md (decision 5): the phone-width line; the full line is its tooltip and name.
  'header.privacy.short': 'Local only',
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
  'health.subtitle': '{tests} tests · {runs} runs',
  'health.notImported': '{n} results not imported',

  // Start (no data)
  'start.title': 'Find your flaky tests',
  'start.lead': 'A flaky test passes and fails on the same code. Drop your test reports to rank them.',
  'start.drop.title': 'Drop Playwright JSON reports here',
  'start.drop.hint': 'More runs give better results.',
  'start.browse': 'Browse files',
  'start.sample': 'Try sample data',
  // Interim (DEV-31), to be confirmed by the UI/UX chat: the sample files could not be fetched or read.
  'sample.fail': "The sample data couldn't be loaded.",
  'sample.retry': 'Try again',
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
  'import.success': 'Imported {tests, plural, one {# test} other {# tests}} from {runs, plural, one {# run} other {# runs}}.',
  'import.added': 'Added {newRuns, plural, one {# run} other {# runs}}. Now {tests, plural, one {# test} other {# tests}} from {runs, plural, one {# run} other {# runs}}.',
  'import.rankChange': '{count, plural, one {# new Flaky test} other {# new Flaky tests}} since your last import.',
  'import.rankChange.link': 'Show the {count} new Flaky tests',
  'import.partial':
    'Imported {tests, plural, one {# test} other {# tests}} from {runs, plural, one {# run} other {# runs}}. {count, plural, one {# result was} other {# results were}} not imported.',
  'import.partial.noStatus': '{count, plural, one {# result had} other {# results had}} no status: "{test}" (run {run})',
  'import.partial.noName': '{count, plural, one {# test had} other {# tests had}} no name (run {run}, position {pos})',
  'import.partial.badDuration': '{count} results had an unreadable duration. They were kept without it.',
  'import.partial.badDate': "{file}: the run start time couldn't be read, so this run keeps its import order.",
  'import.dupeIds': '{count} tests shared a name. They were told apart by project name and position.',
  'import.dupeRun': "This run was already loaded, so it wasn't counted twice.",
  'import.noCommit.many': 'No commit info found in {count} files. Evidence across commits will be limited.',
  'import.progress.reading': 'Reading…',
  'import.noCommit': 'No commit info found in {file}. Evidence across commits will be limited.',
  'import.fail.format':
    "{file} wasn't imported. It isn't a Playwright JSON report. JUnit XML support is planned for a later version.",
  'import.fail.unreadable': "{file} couldn't be read. It may be cut off. Try downloading it again.",
  'import.fail.tooBad': "{file} wasn't imported. Too much of it was unclear to rank tests reliably.",
  'import.fail.tooLarge': '{file} is larger than the {limit} limit. Try a file with fewer runs.',
  // Interim copy from the planning chat (DEV-13), pending UI/UX confirmation.
  'import.fail.timeout': "{file} took too long to read and wasn't imported. Try a smaller file or fewer runs.",
  // Interim keys (DEV-21), to be confirmed by the UI/UX chat.
  'import.fail.tooMany': "That's more than {limit} files at once. Drop fewer files, or split them into batches.",
  'import.fail.tooBig': 'These files add up to more than {limit}. Drop fewer files at a time.',
  'import.fail.crash': "FlakeLens couldn't finish reading your files, and nothing was changed. Try again, or try fewer files.",
  'import.others': '{count, plural, one {# other file} other {# other files}} imported. You can drop another file here.',
  'import.viewNotices': 'View all notices',
  'import.region': 'Import reports',
  'import.result': 'Import result',
  'banner.dismiss': 'Dismiss',
  'import.downloadList': 'Download not-imported list',
  'import.formatHelp': 'Which format do I need?',

  // Leave sample dialog
  'leaveSample.title': 'Leave sample data?',
  'leaveSample.body': 'Your {count, plural, one {file is} other {# files are}} analysed on {count, plural, one {its} other {their}} own.',
  'leaveSample.stay': 'Stay in sample',
  'leaveSample.confirm': 'Analyse my files',

  // Tests (ranked list)
  'tests.h1': 'Tests ranked by fix priority',
  // Simplification pass (docs/ux/12-simplification-pass.md): one sentence; the not-imported link is in the health box.
  'tests.banner.sample': 'Sample data. Start with the top 3 Flaky tests.',
  'tests.banner.exitSample': 'Exit sample',
  'tests.filter.label': 'Filter by status',
  'tests.filter.all': 'All',
  'tests.filter.flaky': 'Flaky',
  'tests.filter.suspect': 'Unproven',
  'tests.filter.failing': 'Failing',
  'tests.wasted.title': 'Wasted CI time',
  'tests.wasted.estimate': '+ ~{min} min possible',
  // Interim: the reason moved out of the line into a tooltip.
  'tests.wasted.estimate.hint': 'An estimate, from Unproven tests.',
  'tests.search.placeholder': 'Search tests and files',
  'tests.moreColumns': 'More columns',
  'tests.col.rank': '#',
  'tests.col.rank.label': 'Rank',
  'tests.col.test': 'Test',
  'tests.col.status': 'Status',
  'tests.col.runs': 'Last 12 runs',
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
  // tests.count (04-ux-copy section 6) composed as four whole sentences, so plurals and word order stay translatable.
  'tests.count.all': 'Showing all {count, plural, one {# test} other {# tests}}, grouped by status, {sort}',
  'tests.count.status': 'Showing {count, plural, one {# {status} test} other {# {status} tests}}, grouped by status, {sort}',
  'tests.count.search':
    'Showing {count, plural, one {# test} other {# tests}} matching "{query}", grouped by status, {sort}',
  'tests.count.statusSearch':
    'Showing {count, plural, one {# {status} test} other {# {status} tests}} matching "{query}", grouped by status, {sort}',
  'sort.rank': 'most urgent first',
  'sort.wasted': 'sorted by wasted time',
  'sort.test': 'sorted by test name',
  // Table controls (board 8). Interim copy where 04-ux-copy has no key yet; flagged for the UI/UX chat.
  'tests.columns': 'Columns',
  'tests.columns.title': 'Choose columns',
  'tests.columns.locked': '(always shown)',
  'tests.columns.reset': 'Reset to default',
  'tests.columns.saved': 'Saved in this browser',
  'tests.col.score': 'Flakiness score',
  'tests.col.mixed': 'Mixed commits',
  'tests.col.flip': 'Flip rate',
  'tests.col.lastFailed': 'Last failed',
  'tests.col.project': 'Project',
  'cell.fraction': '{a} of {b}',
  'tests.density': 'Row density',
  'tests.density.compact': 'Compact',
  'tests.density.comfortable': 'Comfortable',
  'tests.filters': 'Active filters',
  'tests.filters.status': 'Status: {status}',
  'tests.filters.search': 'Search: "{query}"',
  'tests.filters.remove': 'Remove filter {filter}',
  'tests.filters.clear': 'Clear filters',
  'tests.rows': 'Rows {a} to {b} of {n}',
  'tests.health.scope': 'All {n} tests',
  'tests.health.label': 'Status of {tests, plural, one {# test} other {# tests}}: {list}',
  'run.pass': 'Passed',
  'run.retryPass': 'Passed on retry',
  'run.fail': 'Failed',
  'run.skip': 'Skipped',
  'runs.label': 'Last {count} runs, oldest first: {list}',
  'glossary.suspect': 'Mixed results, but never on the same commit. Could be flaky or a real bug',
  'glossary.mixedCommit': 'A commit where the test both passed and failed',
  'glossary.wasted': 'Minutes of failed attempts on commits where the test also passed',
  'tests.keys': 'j k move · Enter open · / search · ? all shortcuts',
  'tests.group.flaky': 'Flaky · {n} · Different results on the same commit',
  'tests.group.suspect': 'Unproven · {n} · Mixed results, never on the same commit. Could be flaky or a real bug',
  'tests.group.failing': 'Failing · {n} · Fails almost every run. Likely a real bug',
  'tests.group.stable': 'Stable · {n} · No sign of flakiness',
  'tests.group.insufficient': 'Not enough data · {n} · Too little history to judge',

  // Evidence sentences (number first)
  'why.mixed': '{m} of {g} commits had mixed results',
  'why.retry': 'Passed on retry in {r} of {n} runs',
  'why.suspect': 'Switched pass and fail {f} times in {n} runs',
  'why.failing': 'Failed {x} of {n} runs',
  'why.failingWasFlaky': 'Failed {x} of {x} runs since {sha}',
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
  'panel.history.title':
    'Run history · {runs, plural, one {# run} other {# runs}} on {commits, plural, one {# commit} other {# commits}}',
  'panel.history.legend.mixed': 'Mixed commit',
  'panel.failure.metaNoDate': 'Run {n} · commit {sha} · attempt {a} of {total}',
  'panel.wasted.label': 'Wasted CI time',
  'panel.close.hint': 'Close panel (Esc)',
  'panel.history.filter.all': 'All attempts',
  'panel.history.filter.failures': 'Failures only',
  'panel.history.runLabel': 'Run {n}, commit {sha}: {attempts}',
  'panel.history.runLabel.mixed': 'Run {n}, commit {sha}, mixed commit: {attempts}',
  'panel.fileBar': '{file} · project {project}',
  'panel.history.list': 'Runs grouped by commit, oldest first',
  'panel.history.show': 'Show',
  'panel.failure.diff': 'Latest failure as a diff: failed attempt, then the retry that passed',
  'run.attempt.pass': 'pass',
  'run.attempt.fail': 'fail',
  'run.attempt.retry': 'passed on retry',
  'run.attempt.skip': 'skipped',
  // Copy summary (04-ux-copy "Copy summary"), one key per line.
  'summary.title': '{name} ({file})',
  'summary.status': 'Status: {status}. {evidence}.',
  'summary.wasted': 'Wasted CI time: {min} min across {runs, plural, one {# run} other {# runs}}.',
  'summary.failure': 'Latest failure: run {n}, commit {sha}: {message}',
  'summary.footer': 'Analysed locally with FlakeLens. Likely cause, not proof.',
  // Interim copy from the planning chat (DEV-16), pending UI/UX confirmation.
  'toast.copyFailed': "Couldn't copy. Your browser blocked clipboard access. Select the text and copy it yourself.",
  'panel.note.title': 'What this means',
  'panel.note.next': 'What to check next',
  // Interim (Test detail board): the closed block with the other checks and the quarantine tip.
  'panel.note.more': 'More to check',
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
  // One sentence (Test detail board, docs/ux/12 rule 2); pinned in copy-sync.test.ts BOARD_WINS.
  'note.flaky.means': 'This test gave different results on the same code.',
  'note.flaky.next':
    "Waits and timing · Data or state shared between tests · Test order · Slow or unavailable services the test needs. Tip: while you investigate, quarantine it in CI so it can't block merges.",
  'note.suspect.means': 'Results are mixed but never on the same commit, so it could be flaky or a real bug.',
  'note.suspect.next': 'Code changes near the first failure · Run it again several times on one commit to confirm.',
  'note.failing.means': 'It fails almost every run, so it is likely a real bug or a broken test.',
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
  'data.summary': '{files, plural, one {# file} other {# files}} · {runs, plural, one {# run} other {# runs}} · last added {date}',
  'data.files': 'Files · {count}',
  'data.file.meta': '{runs, plural, one {# run} other {# runs}} · {tests, plural, one {# test} other {# tests}}',
  'data.file.ok': 'Imported',
  'data.file.partial': 'Partly imported',
  // Interim copy (DEV-17): a file that could not be imported at all still has a row.
  'data.file.failed': "Couldn't import",
  'data.notices': 'Notices · {count}',
  'data.download.csv': 'CSV',
  'data.download.json': 'JSON',
  'data.runs': 'Runs · {count}',
  'data.runs.label': 'Runs',
  'data.runs.col.run': 'Run',
  'data.runs.col.commit': 'Commit',
  'data.runs.col.branch': 'Branch',
  'data.runs.col.browser': 'Browser',
  'data.runs.col.time': 'Time',
  'data.runs.col.tests': 'Tests',
  'data.runs.showAll': 'Show all {count} runs',
  'data.remove.action': 'Clear all data',

  // Commit or label per file (DEV-32; copy doc section 11, trimmed by the second sweep, section 7b of the simplification pass)
  'files.commit.label': 'Commit or label',
  'files.commit.source.report': 'From the report',
  'files.commit.source.none': 'No commit info',
  'files.commit.source.user': 'Your label',
  'files.commit.source.readonly': 'Read-only',
  'files.commit.hint.none': 'No commit info found. This file counts as its own commit.',
  'files.commit.hint.shared': 'Also used by {count, plural, one {# other file} other {# other files}}.',
  'files.commit.counter': '{n} / 100',
  'files.commit.tooLong': 'Labels can be up to 100 characters. Typing stops at the limit.',
  'files.commit.save': 'Save label',
  'files.commit.cancel': 'Cancel',
  'files.commit.remove': 'Remove label',
  'files.commit.saved': 'Label saved. Rankings updated.',
  'files.commit.removed': 'Label removed. Rankings updated.',
  'files.commit.saveFailed': "Couldn't save the label. Your browser blocked storage, so the label would be lost when you close the tab.",
  'files.commit.readonly': 'Read-only in sample data.',
  // Interim copy (DEV-32, UI/UX to confirm): the board shows these but the copy doc has no key for them.
  'files.commit.empty': 'Add a commit or label',
  'files.commit.retry': 'Try again',
  'files.commit.keys': 'Enter saves. Esc cancels.',
  // Settings (DEV-33, copy doc section 12). Hints under labels are retired (rule 8); the shortcut keys are a tooltip.
  'settings.title': 'Settings',
  'settings.back': 'Back to tests',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.shortcuts': 'Single-key shortcuts',
  'settings.rules.title': 'How rankings are decided',
  'settings.data.title': 'Your data',
  'settings.about.title': 'About',
  // Interim copy (DEV-33, UI/UX to confirm): wording the board shows but the copy doc has no key for, or shortens.
  'settings.theme.dark': 'Dark',
  'settings.theme.light': 'Light',
  'settings.shortcuts.tip': 'j, k, /, ? and Enter work when you are not typing in a field.',
  'settings.rules.note': 'These are starting values, not calibrated yet.',
  'settings.rules.show': 'Show thresholds',
  'settings.rules.failing': 'Fails {rate}% or more of its last {window} runs.',
  'settings.rules.unproven': 'Has at least {min} attempts and switches between pass and fail at least {flips} times in {window}.',
  'settings.rules.insufficient': 'Fewer than {min} attempts, unless it passed on retry.',
  'settings.rules.rejected.name': 'File rejected',
  'settings.rules.rejected': 'More than half of its records are unclear, so rankings would mislead.',
  'settings.about.version': 'FlakeLens {version}',
  'settings.about.source': 'Source code',
  'settings.about.report': 'Report an issue',
  'settings.about.security': 'Security policy',
  'settings.about.license': 'MIT licence',
  // Remove one file (DEV-33, copy doc section 12; file.remove.undoHint is retired, rule 8)
  'file.remove': 'Remove',
  'file.remove.title': 'Remove {file}?',
  'file.remove.body': 'This removes the file and everything that came only from it. Rankings are recalculated.',
  'file.remove.runs': '{count, plural, one {# run and its attempts} other {# runs and their attempts}}',
  'file.remove.tests': '{count, plural, one {# test changes status or evidence} other {# tests change status or evidence}}',
  'file.remove.label': 'the commit label "{label}"',
  'file.remove.shared':
    'This removes {removed, plural, one {1 run} other {# runs}}. {kept, plural, one {1 run in this file is} other {# runs in this file are}} also in {other}, so {kept, plural, one {it stays} other {they stay}}.',
  'file.remove.last': 'This is your last file. Removing it clears all results and takes you back to the start screen.',
  'file.remove.keep': 'Keep file',
  'file.remove.confirm': 'Remove file',
  'toast.fileRemoved': '{file} removed. Rankings updated.',
  'toast.fileRemoved.last': '{file} removed. All results cleared.',
  'toast.fileRestored': '{file} restored. Rankings updated.',
  'toast.undo': 'Undo',
  'import.noCommit.link': 'Add a commit label',
  'runs.commit.labelTag': 'label',

  // Empty and edge states
  'empty.filter.title': 'No {status} tests in {runs, plural, one {this # run} other {these # runs}}',
  'empty.filter.body': 'More runs make this more certain.',
  'empty.filter.action': 'Show all tests',
  'empty.search.title': 'No test matches "{query}"',
  'empty.search.body': 'Search covers test names and file names.',
  'empty.search.suggest': 'Search for "{suggestion}" instead',
  'empty.search.clear': 'Clear search',
  'missing.test.title': "This test isn't in the loaded data",
  'missing.test.body': 'It may have been renamed, or its files were cleared.',
  'missing.test.action': 'Back to tests',
  'storage.fail':
    "Your saved data couldn't be read. Reload to try again. If it keeps happening, clear all data and re-import.",
  'storage.reload': 'Reload page',
  'storage.skipped.action': 'Clear all data',
  // Interim key (DEV-20), to be confirmed by the UI/UX chat.
  'storage.skipped':
    "{count, plural, one {# saved import} other {# saved imports}} couldn't be read and {count, plural, one {was} other {were}} skipped. Clear all data to remove {count, plural, one {it} other {them}}.",
  'storage.off': "This browser won't keep your data after you close the tab. Results are still shown for now.",

  // Clear all data dialog
  'clear.title': 'Clear all data?',
  'clear.body':
    "This deletes {files, plural, one {# file} other {# files}}, {runs, plural, one {# run} other {# runs}} and all results from this browser. You can't undo this. Your theme and display choices are kept.",
  'clear.keep': 'Keep my data',
  'clear.confirm': 'Clear all data',
  'clear.done': 'All local data cleared',

  // Shortcuts sheet
  'keys.title': 'Keyboard shortcuts',
  'keys.close': 'Close',
  // Interim copy (DEV-18), pending UI/UX confirmation.
  'skip.results': 'Skip to results',
  'keys.toggle': 'Single-key shortcuts',
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
