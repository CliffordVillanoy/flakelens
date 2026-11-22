import { readFileSync } from 'node:fs';
import { marked } from 'marked';
import { describe, it, expect } from 'vitest';
import { cleanText, csvCell, escapeMd, toCsv } from './safeText';

const BS = String.fromCharCode(92);
const NUL = String.fromCharCode(0);
const LINE_SEP = String.fromCharCode(0x2028);
const BOM = String.fromCharCode(0xfeff);

it('cleanText turns control characters into spaces and trims', () => {
  expect(cleanText('ok\n=HYPERLINK("x")')).toBe('ok =HYPERLINK("x")');
  expect(cleanText('\t+cmd')).toBe('+cmd');
  expect(cleanText(`a\r\n-b${NUL}c${LINE_SEP}d`)).toBe('a -b c d');
  expect(cleanText('plain')).toBe('plain');
});

it('escapeMd escapes Markdown characters and a leading = + - @', () => {
  expect(escapeMd('a | b `c`')).toBe(`a ${BS}| b ${BS}\`c${BS}\``);
  for (const ch of ['=', '+', '-', '@']) expect(escapeMd(`${ch}SUM(A1)`)).toBe(`${BS}${ch}SUM(A1)`);
  expect(escapeMd('x-y')).toBe('x-y');
  expect(escapeMd('\t+cmd')).toBe(`${BS}+cmd`);
  expect(escapeMd('name\n2. fake line')).toBe('name 2. fake line');
});

it('csvCell prefixes a leading = + - @ with a single quote so a spreadsheet never runs it as a formula', () => {
  for (const ch of ['=', '+', '-', '@']) expect(csvCell(`${ch}1+1`)).toBe(`'${ch}1+1`);
  expect(csvCell('\t=cmd')).toBe("'=cmd"); // a leading tab or newline cannot hide the formula character
  expect(csvCell('x\n=cmd')).toBe('x =cmd'); // a newline cannot start a new row or cell
  expect(csvCell('a-b')).toBe('a-b');
});

it('csvCell quotes cells with commas or quotes and doubles inner quotes', () => {
  expect(csvCell('a, b')).toBe('"a, b"');
  expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  expect(csvCell('a,"b"')).toBe('"a,""b"""');
  expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
});

it('csvCell passes numbers through unchanged, including negatives', () => {
  expect(csvCell(12)).toBe('12');
  expect(csvCell(-3)).toBe('-3');
});

it('toCsv writes a byte-order mark, a header row, CRLF rows and every row', () => {
  const csv = toCsv(['file', 'reason'], [
    ['a.json', 'x, y'],
    ['b.json', '=cmd|calc'],
  ]);
  expect(csv).toBe(`${BOM}file,reason\r\na.json,"x, y"\r\nb.json,'=cmd|calc`);
  expect(csv.split('\r\n')).toHaveLength(3);
});

// A real GitHub-flavoured renderer: pasted exports must not turn names from a hostile report into links.
describe('escapeMd and auto-linking (S-7)', () => {
  const render = (md: string) => marked.parse(md, { gfm: true, async: false });
  const JOINER = String.fromCharCode(0x200b);
  const inputs = ['http://x.test', 'HTTPS://X.TEST', 'ftp://x.test', 'www.x.test', 'mailto:a@x.test', 'a@x.test'];

  it.each(inputs)('%s is not rendered as a link, alone or inside a sentence', (url) => {
    for (const text of [url, `see ${url} now`, `| ${url} |`]) {
      expect(render(escapeMd(text))).not.toMatch(/<a[\s>]/i);
    }
  });

  it('the control: the same inputs ARE links without the helper', () => {
    for (const url of inputs) expect(render(url)).toMatch(/<a[\s>]/i);
  });

  it.each(inputs)('%s stays readable: without the invisible joiners it is the original text', (url) => {
    expect(escapeMd(`see ${url} now`).replaceAll(JOINER, '')).toBe(`see ${url} now`);
  });

  it('breaks nothing else: plain words, version numbers and times are untouched', () => {
    for (const s of ['checkout flow', 'v1.2.3', 'at 10:30', 'a.b.c', 'shop.spec.ts › cart']) expect(escapeMd(s)).toBe(s);
  });

  it('the invisible joiner is written as an escape in the source, never typed raw', () => {
    const src = readFileSync('src/ui/lib/safeText.ts', 'utf8');
    for (const ch of src) {
      const c = ch.codePointAt(0)!;
      expect(c < 0x20 ? c === 0x0a || c === 0x09 : c !== 0x7f && !(c >= 0x200b && c <= 0x200f) && c !== 0xfeff && c !== 0x2028 && c !== 0x2029).toBe(true);
    }
  });
});

// Hostile names can be megabytes long (the file cap is 50 MB), so escapeMd must stay linear. The limit is 500 ms,
// far above the few ms it takes, so a slow CI machine cannot make this flaky while a quadratic scan (seconds) still fails.
describe('escapeMd stays fast on long hostile text', () => {
  const timed = (s: string) => {
    const start = performance.now();
    escapeMd(s);
    return performance.now() - start;
  };
  it.each([
    ['a. x 100000', 'a.'.repeat(100_000)],
    ['a+ x 100000', 'a+'.repeat(100_000)],
    ['a- x 100000', 'a-'.repeat(100_000)],
    ['a1. x 60000', 'a1.'.repeat(60_000)],
    ['x@ x 100000', 'x@'.repeat(100_000)],
    ['www. x 50000', 'www.'.repeat(50_000)],
    ['35-letter fake scheme x 5000', 'abcdefghijklmnopqrstuvwxyzabcdefghi:// x.test '.repeat(5_000)],
  ])('%s takes under 500 ms', (label, text) => {
    const ms = timed(text);
    expect(ms).toBeLessThan(500);
  });

  it('a real long scheme is still broken, so it does not become a link', () => {
    expect(marked.parse(escapeMd('git+ssh://x.test'), { gfm: true, async: false })).not.toMatch(/<a[\s>]/i);
    expect(escapeMd('git+ssh://x.test').replaceAll(String.fromCharCode(0x200b), '')).toBe('git+ssh://x.test');
  });
});

describe('a long word glued in front of a scheme is still not a link', () => {
  const prefix = 'a'.repeat(40);
  it.each(['http://x.test', 'https://x.test', 'HTTP://X.TEST', 'ftp://x.test', 'www.x.test'])('%s after 40 letters', (url) => {
    for (const text of [prefix + url, `${prefix}_${url}`, `(${prefix}${url})`]) {
      expect(marked.parse(escapeMd(text), { gfm: true, async: false })).not.toMatch(/<a[\s>]/i);
    }
  });
  it('the control: marked does link them without the helper', () => {
    expect(marked.parse(prefix + 'https://x.test', { gfm: true, async: false })).toMatch(/<a[\s>]/i);
  });
});
