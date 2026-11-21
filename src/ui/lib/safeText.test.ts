import { it, expect } from 'vitest';
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
