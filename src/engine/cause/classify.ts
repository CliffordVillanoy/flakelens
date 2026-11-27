import type { CauseConfidence, CauseId, EvidenceLine } from '../types';
import { CAUSE_RULES, MAX_LINE_CHARS, type CauseRule, type RuleCategory, type Weight } from './rules';

// classifyFailure (DEV-37): which cause is a failure text probably about, with the lines that say so.
//  - Works on ANSI-stripped text. Evidence is quoted from that text; verifyEvidence strips the same way.
//  - Reads at most MAX_TEXT_CHARS of the text, MAX_LINES lines, MAX_LINE_CHARS of each line (bounded work).
//  - Never forces a guess: no rule means 'unknown', low confidence, no evidence.

export const MAX_TEXT_CHARS = 100_000;
export const MAX_LINES = 1_000;
export const MAX_EVIDENCE = 5;
export const MAX_EVIDENCE_CHARS = 300;
const PROJECT_FRAMES = 2; // project frames added after the rule lines, when there is room

export interface ClassifyInput {
  message: string;
  stack?: string;
  /** The failure belongs to a group that failed in many tests of one run (DEV-36 environmentEvent). */
  environmentEvent?: boolean;
  /** Correlation hints, from the run metadata. They change confidence, never the quoted evidence. */
  correlation?: { oneBrowser?: boolean };
}
export type CauseHint = 'oneBrowser' | 'environmentEvent';
export interface CauseResult {
  category: CauseId;
  confidence: CauseConfidence;
  evidence: EvidenceLine[];
  hint?: CauseHint;
  /** The weight of the strongest rule that fired: the group level reads it. */
  topWeight?: Weight;
}

const ESC = 27;
/** Removes ANSI colour sequences, in one pass. */
export function plainText(text: string): string {
  if (text.indexOf(String.fromCharCode(ESC)) === -1) return text;
  const out: string[] = [];
  let copied = 0;
  let i = 0;
  while (i < text.length) {
    if (text.charCodeAt(i) === ESC && text.charCodeAt(i + 1) === 91 /* [ */) {
      let j = i + 2;
      while (j < text.length && j - i < 24) {
        const c = text.charCodeAt(j);
        if ((c >= 48 && c <= 57) || c === 59 || c === 63) j++;
        else break;
      }
      const end = text.charCodeAt(j);
      if (end >= 64 && end <= 126) {
        out.push(text.slice(copied, i));
        copied = j + 1;
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  out.push(text.slice(copied));
  return out.join('');
}

/** The text the classifier reads and the log viewer shows: the stack when it starts with the message, else both. */
export function failureText(message: string, stack: string): string {
  if (stack === '') return message;
  if (message === '' || stack.startsWith(message.slice(0, 200))) return stack;
  return `${message}\n${stack}`;
}

const isLibraryFrame = (line: string) =>
  /^\s*at\s/.test(line) && (/node_modules[\\/]/.test(line) || /\bnode:[a-z]/.test(line) || /\((?:<anonymous>|native)\)/.test(line));
const isProjectFrame = (line: string) => /^\s*at\s/.test(line) && !isLibraryFrame(line);

/** Splits into lines the way verifyEvidence does (\n or \r\n), reading at most MAX_LINES lines. */
function linesOf(text: string, max: number): string[] {
  const out: string[] = [];
  let start = 0;
  while (out.length < max && start <= text.length) {
    const nl = text.indexOf('\n', start);
    const end = nl === -1 ? text.length : nl;
    out.push(text.slice(start, end > start && text.charCodeAt(end - 1) === 13 ? end - 1 : end));
    if (nl === -1) break;
    start = nl + 1;
  }
  return out;
}

const WEIGHT_POINTS: Record<Weight, number> = { high: 3, medium: 2, low: 1 };
const LEVELS: CauseConfidence[] = ['low', 'medium', 'high'];
const up = (c: CauseConfidence): CauseConfidence => LEVELS[Math.min(2, LEVELS.indexOf(c) + 1)]!;
const down = (c: CauseConfidence): CauseConfidence => LEVELS[Math.max(0, LEVELS.indexOf(c) - 1)]!;
// More specific causes first: they win a tie over the generic ones.
const ORDER: RuleCategory[] = ['locator', 'network', 'environment', 'infrastructure', 'time', 'sharedState', 'order', 'concurrency', 'timing'];
// A strong sign of one of these in an environment event means the test, not the environment.
const TEST_SPECIFIC = new Set<RuleCategory>(['locator', 'order', 'sharedState', 'time', 'concurrency']);
const OUTSIDE = new Set<RuleCategory>(['network', 'infrastructure']);

interface Hit {
  rule: CauseRule;
  line: number; // 1-based
  text: string;
}

const quote = (line: string): string => {
  const t = line.trim();
  return t.length > MAX_EVIDENCE_CHARS ? t.slice(0, MAX_EVIDENCE_CHARS).trim() : t;
};

export function classifyFailure(input: ClassifyInput): CauseResult {
  const full = plainText(failureText(input.message ?? '', input.stack ?? ''));
  const text = full.length > MAX_TEXT_CHARS ? full.slice(0, MAX_TEXT_CHARS) : full;
  const lines = linesOf(text, MAX_LINES);

  // 1. every rule against every line that is not a library frame; keep the first line each rule matches
  const firstHit = new Map<string, Hit>();
  const projectFrames: Hit[] = [];
  lines.forEach((raw, i) => {
    if (isLibraryFrame(raw)) return;
    const line = raw.length > MAX_LINE_CHARS ? raw.slice(0, MAX_LINE_CHARS) : raw;
    if (isProjectFrame(line) && projectFrames.length < PROJECT_FRAMES) projectFrames.push({ rule: CAUSE_RULES[0]!, line: i + 1, text: quote(raw) });
    for (const rule of CAUSE_RULES) {
      if (firstHit.has(rule.id)) continue;
      if (rule.pattern.test(line)) firstHit.set(rule.id, { rule, line: i + 1, text: quote(raw) });
    }
  });

  // 2. score the categories
  const byCategory = new Map<RuleCategory, Hit[]>();
  for (const h of firstHit.values()) {
    const list = byCategory.get(h.rule.category);
    if (list) list.push(h);
    else byCategory.set(h.rule.category, [h]);
  }
  const score = (hits: Hit[]) => Math.min(6, hits.reduce((n, h) => n + WEIGHT_POINTS[h.rule.weight], 0));
  const top = (hits: Hit[]) => hits.reduce<Weight>((w, h) => (WEIGHT_POINTS[h.rule.weight] > WEIGHT_POINTS[w] ? h.rule.weight : w), 'low');
  const ranked = [...byCategory.entries()].sort((a, b) => score(b[1]) - score(a[1]) || ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));

  let category: CauseId = 'unknown';
  let hits: Hit[] = [];
  let confidence: CauseConfidence = 'low';
  let hint: CauseHint | undefined;

  if (ranked.length > 0) {
    category = ranked[0]![0];
    hits = ranked[0]![1];
    confidence = ({ high: 'high', medium: 'medium', low: 'low' } as const)[top(hits)];
    if (hits.length >= 2) confidence = up(confidence); // two different rules agree
    if (ranked.length > 1 && score(ranked[1]![1]) >= score(hits) - 1) confidence = down(confidence); // a close second cause
  }

  // 3. an environment event is infrastructure unless a stronger, test-specific rule fires
  if (input.environmentEvent) {
    const strong = category !== 'unknown' && TEST_SPECIFIC.has(category as RuleCategory) && top(hits) === 'high';
    if (!strong) {
      const outside = [...byCategory.entries()].filter(([c]) => OUTSIDE.has(c)).flatMap(([, h]) => h);
      category = 'infrastructure';
      hits = outside;
      confidence = outside.length > 0 ? 'high' : 'medium';
      if (outside.length === 0) {
        const first = lines.findIndex((l) => l.trim() !== '' && !isLibraryFrame(l));
        if (first !== -1) hits = [{ rule: CAUSE_RULES[0]!, line: first + 1, text: quote(lines[first]!) }];
        confidence = 'low';
      }
      hint = 'environmentEvent';
    }
  }

  // 4. correlation changes confidence only
  if (input.correlation?.oneBrowser && category !== 'unknown' && ['locator', 'timing', 'environment'].includes(category)) {
    confidence = up(confidence);
    hint ??= 'oneBrowser';
  }

  if (category === 'unknown') return { category, confidence: 'low', evidence: [] };

  // 5. evidence: the rule lines (strongest first), then project frames, at most MAX_EVIDENCE, in line order
  const chosen = new Map<number, string>();
  for (const h of [...hits].sort((a, b) => WEIGHT_POINTS[b.rule.weight] - WEIGHT_POINTS[a.rule.weight] || a.line - b.line)) {
    if (chosen.size >= MAX_EVIDENCE) break;
    if (h.text !== '') chosen.set(h.line, h.text);
  }
  for (const f of projectFrames) if (chosen.size < MAX_EVIDENCE && !chosen.has(f.line) && f.text !== '') chosen.set(f.line, f.text);
  const evidence = [...chosen.entries()].sort((a, b) => a[0] - b[0]).map(([line, t]) => ({ line, text: t }));

  const result: CauseResult = { category, confidence, evidence, topWeight: top(hits) };
  if (hint) result.hint = hint;
  return result;
}

/**
 * For each quoted line: does the log really hold that text at that 1-based line? (Board 13: "Quoted from the log" or
 * "Not found in the log".) Reads the log the way the classifier does: ANSI removed, lines split at \n or \r\n.
 */
export function verifyEvidence(logText: string, evidence: readonly EvidenceLine[]): boolean[] {
  const text = plainText(logText);
  const lines = evidence.some((e) => e.line > MAX_LINES) ? linesOf(text, Number.MAX_SAFE_INTEGER) : linesOf(text, MAX_LINES);
  return evidence.map((e) => {
    if (!Number.isInteger(e.line) || e.line < 1 || e.text === '') return false;
    const line = lines[e.line - 1];
    return line !== undefined && line.includes(e.text);
  });
}
