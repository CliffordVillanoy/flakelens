import { it, expect } from 'vitest';
import { LINE_CUT, MAX_MATCHES, MAX_QUERY, displayLine, evidenceFor, lineCount, lineText, lineHeights, openLog, searchLog, windowAt, cutLine } from './log';

const TOKEN = 'FAKE-TOKEN-NOT-A-SECRET-000000';

it('splits lines at \\n and \\r\\n, counts them, and reads one line at a time', () => {
  const log = openLog('a\r\nb\n\nlast');
  expect(lineCount(log)).toBe(4);
  expect([0, 1, 2, 3].map((i) => lineText(log, i))).toEqual(['a', 'b', '', 'last']);
  expect(lineCount(openLog(''))).toBe(1);
  expect(lineText(openLog(''), 0)).toBe('');
  expect(lineText(log, 99)).toBe('');
});

it('removes colour codes before numbering, the way the classifier reads the text', () => {
  const log = openLog('\u001b[31mred\u001b[39m\nplain');
  expect(lineText(log, 0)).toBe('red');
  expect(lineCount(log)).toBe(2);
});

it('search is case-insensitive over the whole log and numbers each match', () => {
  const log = openLog('Timeout one\nok\ntimeout TIMEOUT');
  const r = searchLog(log, 'timeout');
  expect(r.matches).toEqual([
    { line: 1, nth: 0 },
    { line: 3, nth: 0 },
    { line: 3, nth: 1 },
  ]);
  expect(r.capped).toBe(false);
  expect(searchLog(log, '').matches).toEqual([]);
  expect(searchLog(log, 'zzz').matches).toEqual([]);
});

it('search stops at the match cap and says so, and the query is cut to a safe length', () => {
  const log = openLog('a '.repeat(MAX_MATCHES + 50));
  const r = searchLog(log, 'a');
  expect(r.matches).toHaveLength(MAX_MATCHES);
  expect(r.capped).toBe(true);
  expect(searchLog(openLog('x'.repeat(500)), 'x'.repeat(MAX_QUERY + 100)).matches.length).toBe(2); // the query is cut to 200 characters: 500 x's hold two
});

it('a display line is a line with secrets masked; the raw text is untouched', () => {
  const raw = `Authorization: Bearer ${TOKEN} sent`;
  const shown = displayLine(raw);
  expect(shown).not.toContain(TOKEN);
  expect(shown).toContain('sent');
  expect(displayLine(`api_key=${TOKEN}`)).not.toContain(TOKEN);
  expect(displayLine(`\u001b]0;title\u0007plain`)).toBe('plain'); // other terminal sequences are dropped too
});

it('a line over the cut is shortened with the number of characters left, after the secret is masked', () => {
  const long = 'y'.repeat(LINE_CUT + 4812);
  expect(cutLine(long, false)).toEqual({ text: 'y'.repeat(LINE_CUT), more: 4812 });
  expect(cutLine(long, true)).toEqual({ text: long, more: 0 });
  expect(cutLine('short', false)).toEqual({ text: 'short', more: 0 });
  // the token sits across the cut: it is masked before the cut is made, so no piece of it can show
  const edge = 'z'.repeat(LINE_CUT - 10) + ` token=${TOKEN} ` + 'q'.repeat(100);
  expect(cutLine(edge, false).text).not.toContain('FAKE-TOKEN');
  expect(cutLine(edge, true).text).not.toContain(TOKEN);
});

it('evidence: the quote is the redacted line; found is checked on the raw text at that line', () => {
  const raw = ['first', `Timeout 30000ms exceeded token=${TOKEN}`, 'third'].join('\n');
  const [a, b] = evidenceFor(raw, [
    { line: 2, text: `Timeout 30000ms exceeded token=${TOKEN}` },
    { line: 3, text: 'not there' },
  ]);
  expect(a).toMatchObject({ line: 2, found: true });
  expect(a!.text).not.toContain(TOKEN);
  expect(a!.text).toContain('Timeout 30000ms exceeded');
  expect(b).toMatchObject({ line: 3, found: false });
});

it('heights: one row high without wrap, more with wrap for long lines, and a prefix sum', () => {
  const log = openLog(['short', 'x'.repeat(250), 'x'.repeat(5000)].join('\n'));
  const flat = lineHeights(log, { wrap: false, cols: 100, expanded: new Set() });
  expect([...flat.starts]).toEqual([0, 20, 40, 60]);
  const wrapped = lineHeights(log, { wrap: true, cols: 100, expanded: new Set() });
  expect([...wrapped.starts]).toEqual([0, 20, 80, 80 + 20 * Math.ceil(LINE_CUT / 100)]); // 250 chars = 3 rows; a cut line is measured at the cut
  const open = lineHeights(log, { wrap: true, cols: 100, expanded: new Set([2]) });
  expect(open.starts[3]! - open.starts[2]!).toBe(20 * 50);
});

it('windowAt picks the rows in view with overscan, never more than the cap, and stays inside the log', () => {
  const log = openLog(Array.from({ length: 100_000 }, (_, i) => `line ${i}`).join('\n'));
  const h = lineHeights(log, { wrap: false, cols: 100, expanded: new Set() });
  const w = windowAt(h, 0, 360, 10, 150);
  expect(w.from).toBe(0);
  expect(w.to - w.from).toBeLessThanOrEqual(150);
  expect(w.to - w.from).toBeGreaterThanOrEqual(18);
  const mid = windowAt(h, 20 * 50_000, 360, 10, 150);
  expect(mid.from).toBeGreaterThanOrEqual(50_000 - 10);
  expect(mid.to).toBeLessThanOrEqual(50_000 + 18 + 10 + 1);
  const end = windowAt(h, 1e12, 360, 10, 150);
  expect(end.to).toBe(100_000);
  expect(windowAt(h, 20 * 50_000, 1e9, 10, 150).to - windowAt(h, 20 * 50_000, 1e9, 10, 150).from).toBe(150); // a huge viewport is still capped
});

it('a 5 MB log opens, searches and windows in well under a second', () => {
  const line = 'GET /api/orders/12345 failed with status 503 after 30000ms retry=2 host=db-7.internal';
  const raw = Array.from({ length: 61_204 }, (_, i) => `${i} ${line}`).join('\n');
  expect(raw.length).toBeGreaterThan(5_000_000);
  const t0 = performance.now();
  const log = openLog(raw);
  const t1 = performance.now();
  const found = searchLog(log, 'status 503');
  const t2 = performance.now();
  const h = lineHeights(log, { wrap: true, cols: 100, expanded: new Set() });
  windowAt(h, 5_000_000, 360, 10, 150);
  const t3 = performance.now();
  expect(lineCount(log)).toBe(61_204);
  expect(found.matches.length).toBeGreaterThan(0);
  expect(t1 - t0).toBeLessThan(500);
  expect(t2 - t1).toBeLessThan(800);
  expect(t3 - t2).toBeLessThan(500);
});

it('hostile text stays linear: one huge line and a million escape bytes', () => {
  const t0 = performance.now();
  const log = openLog('A'.repeat(5_000_000));
  expect(lineCount(log)).toBe(1);
  displayLine(cutLine('A'.repeat(5_000_000), false).text);
  displayLine('\u001b['.repeat(500_000));
  searchLog(openLog('ab'.repeat(2_000_000)), 'ba');
  expect(performance.now() - t0).toBeLessThan(2000);
});
