// One place for turning imported text (test names, file names) into text that is safe to put in an export.
// Names come from the user's own reports, so they can hold newlines, tabs or a leading "=" on purpose.

// C0 controls (newline, tab, NUL ...), DEL and the Unicode line and paragraph separators. Written as code
// points on purpose: a regex or string with these characters in the source is fragile and trips the linter.
const LINE_SEPARATOR = 0x2028;
const PARAGRAPH_SEPARATOR = 0x2029;
const isControl = (code: number) => code < 0x20 || code === 0x7f || code === LINE_SEPARATOR || code === PARAGRAPH_SEPARATOR;

/**
 * Control characters (newlines, tabs, line separators) become one space each run, and the ends are trimmed,
 * so no field can start a new line, row or cell, and a leading-character check sees the real first character.
 */
export function cleanText(s: string): string {
  let out = '';
  let inRun = false;
  for (const ch of s) {
    if (isControl(ch.codePointAt(0)!)) {
      if (!inRun) out += ' ';
      inRun = true;
    } else {
      out += ch;
      inRun = false;
    }
  }
  return out.trim();
}

// A zero-width space, written as a code point (a raw invisible character in source is lost by editors and tools).
const ZWSP = String.fromCharCode(0x200b);

/**
 * Stops GitHub-style Markdown from turning text into a link when an export is pasted: a zero-width space goes
 * after a URL scheme colon (http://, ftp://, mailto:), after "www" and after the "@" of an address. The text reads
 * the same and copies back the same once the invisible characters are removed.
 */
// The scheme length is capped (real schemes are far shorter) so the scan cannot rerun to the end of a long
// hostile string from every word boundary, which was quadratic.
export const breakAutolinks = (s: string) =>
  s
    // The schemes a renderer links are broken wherever they sit, even glued to a word before them (no \b).
    .replace(/(?:https?|ftp):(?=\/\/)|(?:mailto|xmpp):/gi, (m) => m + ZWSP)
    // Any other scheme://, length-capped so the scan stays linear; already-broken ones no longer match.
    .replace(/\b[a-z][a-z0-9+.-]{0,31}:(?=\/\/)/gi, (m) => m + ZWSP)
    .replace(/www\./gi, () => 'www' + ZWSP + '.')
    .replace(/(?<=[^\s@])@(?=[^\s@])/g, '@' + ZWSP); // inside an address only: a leading @ is not one

/** Markdown: escape what would change the meaning, break auto-links, and neutralise a leading = + - @ a spreadsheet would run as a formula. */
export const escapeMd = (s: string) =>
  breakAutolinks(cleanText(s))
    .replace(/[\\`|*_[\]<>]/g, '\\$&')
    .replace(/^[=+\-@]/, '\\$&');

/**
 * One CSV cell. Text is cleaned, a leading = + - @ gets a single quote so a spreadsheet shows it as text, and
 * a cell with a comma, quote or line break is quoted with inner quotes doubled. Numbers are written as they are.
 */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const text = cleanText(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

/** A CSV file body: UTF-8 byte-order mark (so Excel reads accents), a header row, CRLF line ends. */
export const toCsv = (header: string[], rows: (string | number)[][]) =>
  BYTE_ORDER_MARK + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
