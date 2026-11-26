import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { it, expect } from 'vitest';

// Contrast of the pairs the v0 axe audit flagged (DESIGN.md "Contrast tokens fixed after the v0 axe audit"),
// computed from src/ui/styles.css, so a later token edit cannot bring them back under 4.5:1.
const css = readFileSync('src/ui/styles.css', 'utf8');
const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  expect(start, selector).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf('\n}', start));
};
const tokens = (selector: string) =>
  Object.fromEntries([...block(selector).matchAll(/--([a-z-]+): (#[0-9a-f]{6});/g)].map((m) => [m[1]!, m[2]!]));
const themes = { dark: tokens(':root'), light: tokens("[data-theme='light']") } as const;

const channel = (v: number) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};
const ratio = (fg: string, bg: string) => {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a! + 0.05) / (b! + 0.05);
};

it('the four fixed token values', () => {
  expect(themes.light['link']).toBe('#0860ca');
  expect(themes.dark['muted-foreground']).toBe('#a4abb4');
  expect(themes.light['muted-foreground']).toBe('#4f5a65');
  expect(themes.dark['status-skip']).toBe('#a4abb4'); // the skipped run square follows muted
  expect(themes.light['status-skip']).toBe('#4f5a65');
});

const pairs: [string, string][] = [
  ['link', 'surface-hover'], // link on row hover
  ['link', 'card'],
  ['muted-foreground', 'selection'], // muted text on the selected row
  ['muted-foreground', 'card'],
  ['muted-foreground', 'background'],
  ['status-flaky-text', 'card'], // amber text; the plain amber token is for graphics only
  ['status-flaky-text', 'status-flaky-subtle'],
  ['status-skip', 'card'],
];
for (const theme of ['dark', 'light'] as const) {
  it.each(pairs)(`${theme}: %s on %s is at least 4.5:1`, (fg, bg) => {
    const t = themes[theme];
    expect(t[fg], fg).toBeDefined();
    expect(t[bg], bg).toBeDefined();
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
}

it('plain amber (--status-flaky) is only used on icons, never as text colour', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      return statSync(p).isDirectory() ? files(p) : p.endsWith('.tsx') && !p.endsWith('.test.tsx') ? [p] : [];
    });
  const offenders = files('src/ui').flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .filter((l) => /text-status-flaky(?!-)/.test(l) && !/aria-hidden/.test(l))
      .map((l) => `${f}: ${l.trim()}`),
  );
  expect(offenders).toEqual([]);
});
