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

// Doc rows that are wrong on their face, reported to the UI/UX chat. The app keeps the right text.
const DOC_DEFECTS: Record<string, string> = {
  'tests.filters.search': 'the doc drops the closing quote: Search: "{query}',
};

it('every row of sections 9 and 10 can be parsed', () => {
  expect(parsed.filter((p) => !('key' in p)).map((p) => p.line)).toEqual([]);
  expect(parsed.length).toBeGreaterThanOrEqual(145);
});

it('copy.ts has exactly the wording of every plain row in sections 9 and 10', () => {
  const mismatches = parsed
    .filter((p): p is { key: string; qualifier: string | undefined; text: string; line: string } => 'key' in p && !p.qualifier)
    .filter((p) => !(p.key in DOC_DEFECTS))
    .filter((p) => (catalog as Record<string, string>)[p.key] !== p.text)
    .map((p) => `${p.key}: app "${(catalog as Record<string, string>)[p.key]}" vs doc "${p.text}"`);
  expect(mismatches).toEqual([]);
});

it('the known doc defects still differ from the app (remove the entry when the doc is fixed)', () => {
  for (const key of Object.keys(DOC_DEFECTS)) {
    const row = parsed.find((p) => 'key' in p && p.key === key) as { text: string };
    expect(row.text, key).not.toBe((catalog as Record<string, string>)[key]);
  }
});

it('the rows with a qualifier are handled on purpose', () => {
  // header.data: the link text is data.title in the app. clear.body: the doc gives the addition only.
  expect(catalog['data.title']).toBe('Loaded data');
  expect(catalog['clear.body'].endsWith('Your theme and display choices are kept.')).toBe(true);
  expect(parsed.filter((p) => 'qualifier' in p && p.qualifier).map((p) => (p as { key: string }).key).sort()).toEqual(['clear.body', 'header.data']);
});
