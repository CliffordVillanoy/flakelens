import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { catalog } from './copy';

// docs/ux/04-ux-copy.md sections 9 and 10 are the confirmed wording. This test parses their tables and fails when
// src/ui/copy.ts differs, so the doc and the app cannot drift. Rows it cannot parse are listed by the last test.
const doc = readFileSync('docs/ux/04-ux-copy.md', 'utf8');
const start = doc.indexOf('## 9. ');
const end = doc.indexOf('## 11. ');
const rows = doc
  .slice(start, end)
  .split('\n')
  .filter((l) => l.startsWith('| `'));

// | `key` | Text | note |  (the cell text may hold \| for a pipe)
const CELL = /^\| `([^`]+)` ?(\([^|]*\))? \| (.*?) \|(?: [^|]*\|)?\s*$/;
const parsed = rows.map((line) => {
  const m = CELL.exec(line);
  return m ? { key: m[1]!, qualifier: m[2], text: m[3]!.replaceAll(String.fromCharCode(92) + '|', '|'), line } : { line };
});

// Keys where a board (canvas v77 to v80) or docs/ux/12-simplification-pass.md gives SHORTER text than the doc, so the
// board wins in the app (DEV-29). Each entry is the text the app shows. The UI/UX chat updates the doc; the entry then
// fails ("the doc caught up") and is removed here.
const BOARD_WINS: Record<string, string> = {
};

// Doc rows for keys the app no longer has, because nothing shows them any more (DEV-29). The doc rows can go.
const RETIRED = ['tests.legend.title', 'tests.banner.sample.seeWhy', 'data.file.meta.notImported', 'header.privacy', 'header.privacy.hint', 'header.privacy.short']; // the last three: DEV-34

it('every row of sections 9 and 10 can be parsed', () => {
  expect(parsed.filter((p) => !('key' in p)).map((p) => p.line)).toEqual([]);
  expect(parsed.length).toBeGreaterThanOrEqual(140);
});

it('copy.ts has exactly the wording of every plain row in sections 9 and 10', () => {
  const mismatches = parsed
    .filter((p): p is { key: string; qualifier: string | undefined; text: string; line: string } => 'key' in p && !p.qualifier)
    .filter((p) => !(p.key in BOARD_WINS) && !RETIRED.includes(p.key) && !p.text?.startsWith('Retired'))
    .filter((p) => (catalog as Record<string, string>)[p.key] !== p.text)
    .map((p) => `${p.key}: app "${(catalog as Record<string, string>)[p.key]}" vs doc "${p.text}"`);
  expect(mismatches).toEqual([]);
});

it('board-wins keys: the app shows the board text, shorter than the doc (remove the entry when the doc catches up)', () => {
  for (const [key, text] of Object.entries(BOARD_WINS)) {
    const row = parsed.find((p) => 'key' in p && p.key === key) as { text: string } | undefined;
    expect(row, key).toBeDefined();
    expect((catalog as Record<string, string>)[key], key).toBe(text);
    expect(row!.text, `${key}: the doc caught up, remove it from BOARD_WINS`).not.toBe(text);
    expect(text.length, key).toBeLessThan(row!.text.length);
  }
});

it('rows the doc marks "Retired" are gone from the app', () => {
  const retiredRows = parsed.filter((p): p is { key: string; qualifier: string | undefined; text: string; line: string } => 'key' in p && !!p.text?.startsWith('Retired'));
  expect(retiredRows.length).toBeGreaterThan(0);
  for (const p of retiredRows) expect(p.key in catalog, p.key).toBe(false);
});

it('retired keys are gone from the app (remove the entry when the doc row is removed)', () => {
  for (const key of RETIRED) expect(key in catalog, key).toBe(false);
});

it('the rows with a qualifier are handled on purpose', () => {
  // header.data: the link text is data.title in the app. clear.body: the doc gives the addition only.
  expect(catalog['data.title']).toBe('Loaded data');
  expect(catalog['clear.body'].endsWith('Your theme and display choices are kept.')).toBe(true);
  expect(parsed.filter((p) => 'qualifier' in p && p.qualifier).map((p) => (p as { key: string }).key).sort()).toEqual(['clear.body', 'header.data']);
});
