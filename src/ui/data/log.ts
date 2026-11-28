import { plainText, verifyEvidence } from '@/engine/cause/classify';
import { redactSecrets } from '@/engine/group/normalize';
import type { EvidenceLine } from '@/engine/types';
import { stripAnsi } from './selectors';

// The log viewer's data side (DEV-41, board 13). A log can be 5 MB, so nothing here copies the text per line: lines are
// found once (one pass, offsets in a typed array) and read one at a time when a row is drawn. Every loop is linear in the
// text, and the search and the row cut have caps. Text is only ever drawn as text; secrets are masked at display and
// copy time (displayLine, cutLine), and verifyEvidence keeps reading the raw text.

export const LINE_H = 20; // px per drawn row (12px mono, line height 1.7)
export const LINE_CUT = 2_000; // a longer line is cut here with "Show more"
export const DISPLAY_CAP = 50_000; // the most of one line that is ever shown or copied (redactSecrets reads this much)
export const MAX_MATCHES = 10_000;
export const MAX_QUERY = 200;

export interface OpenLog {
  text: string; // colour codes removed, line breaks kept
  starts: Int32Array; // start offset of each line
  count: number;
}

/** Removes colour codes (the way the classifier reads the text, so line numbers agree) and finds the lines once. */
export function openLog(raw: string): OpenLog {
  const text = plainText(raw);
  let count = 1;
  for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) count++;
  const starts = new Int32Array(count);
  let i = 1;
  for (let at = text.indexOf('\n'); at !== -1; at = text.indexOf('\n', at + 1)) starts[i++] = at + 1;
  return { text, starts, count };
}

export const lineCount = (log: OpenLog) => log.count;

/** Line `i` (0-based) without its line break; empty when there is no such line. */
export function lineText(log: OpenLog, i: number): string {
  if (i < 0 || i >= log.count) return '';
  const from = log.starts[i]!;
  let to = i + 1 < log.count ? log.starts[i + 1]! - 1 : log.text.length;
  if (to > from && log.text.charCodeAt(to - 1) === 13) to--;
  return log.text.slice(from, to);
}

/** The text of a line as it may be shown or copied: other terminal sequences dropped, secrets masked, at most DISPLAY_CAP. */
export const displayLine = (raw: string): string => redactSecrets(stripAnsi(raw.length > DISPLAY_CAP ? raw.slice(0, DISPLAY_CAP) : raw));

/** Masked first, then cut, so no piece of a secret can survive a cut. `more` is how many characters "Show more" reveals. */
export function cutLine(raw: string, expanded: boolean): { text: string; more: number } {
  const full = displayLine(raw);
  if (expanded || full.length <= LINE_CUT) return { text: full, more: 0 };
  return { text: full.slice(0, LINE_CUT), more: full.length - LINE_CUT };
}

export interface Match {
  line: number; // 1-based
  nth: number; // which occurrence in that line, 0-based
}

/** Every case-insensitive occurrence in the whole log, in order, up to MAX_MATCHES. */
export function searchLog(log: OpenLog, query: string, cap = MAX_MATCHES): { matches: Match[]; capped: boolean } {
  const needle = query.slice(0, MAX_QUERY).toLowerCase();
  const matches: Match[] = [];
  if (needle === '') return { matches, capped: false };
  for (let i = 0; i < log.count; i++) {
    const line = lineText(log, i).toLowerCase();
    let nth = 0;
    for (let at = line.indexOf(needle); at !== -1; at = line.indexOf(needle, at + needle.length)) {
      if (matches.length >= cap) return { matches, capped: true };
      matches.push({ line: i + 1, nth: nth++ });
    }
  }
  return { matches, capped: false };
}

export interface QuotedLine {
  line: number;
  text: string; // masked: this is what the chip shows
  found: boolean; // the log really holds the quoted text at that line
}

/** The evidence lines of a failure, checked against the raw text and masked for display. */
export function evidenceFor(raw: string, lines: readonly EvidenceLine[]): QuotedLine[] {
  const found = verifyEvidence(raw, lines);
  return lines.map((e, i) => ({ line: e.line, text: displayLine(e.text), found: found[i]! }));
}

export interface Heights {
  starts: Float64Array; // pixel offset of each line, with the total at the end
  total: number;
}

/** Row heights as a prefix sum. With wrap on a line takes one row per `cols` characters (an estimate; the row is drawn at its natural height). */
export function lineHeights(log: OpenLog, o: { wrap: boolean; cols: number; expanded: ReadonlySet<number> }): Heights {
  const starts = new Float64Array(log.count + 1);
  const cols = Math.max(1, o.cols);
  for (let i = 0; i < log.count; i++) {
    let rows = 1;
    if (o.wrap) {
      let len = (i + 1 < log.count ? log.starts[i + 1]! - 1 : log.text.length) - log.starts[i]!;
      len = Math.min(len, o.expanded.has(i) ? DISPLAY_CAP : LINE_CUT);
      rows = Math.max(1, Math.ceil(len / cols));
    }
    starts[i + 1] = starts[i]! + rows * LINE_H;
  }
  return { starts, total: starts[log.count]! };
}

// The largest i with starts[i] <= y.
function rowAt(h: Heights, y: number): number {
  let lo = 0;
  let hi = h.starts.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (h.starts[mid]! <= y) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** The rows to draw for a scroll position: those in view plus a few above and below, never more than `max`. */
export function windowAt(h: Heights, scrollTop: number, viewH: number, overscan: number, max: number): { from: number; to: number } {
  const count = h.starts.length - 1;
  const top = Math.max(0, scrollTop);
  const from = Math.max(0, rowAt(h, top) - overscan);
  let to = Math.min(count, rowAt(h, top + viewH) + 1 + overscan);
  if (to - from > max) to = from + max;
  return { from, to };
}
