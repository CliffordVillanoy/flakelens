import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Search } from 'lucide-react';
import { t } from '../copy';
import {
  LINE_H,
  MAX_QUERY,
  cutLine,
  lineCount,
  lineHeights,
  lineText,
  openLog,
  searchLog,
  windowAt,
  type QuotedLine,
} from '../data/log';
import { copyText } from '../lib/clipboard';
import { secondaryButton } from './buttons';

// Board 13 "Log viewer". Only the rows in view are drawn (never more than MAX_ROWS), so a 5 MB log stays responsive.
// Lines are found once and read one at a time (data/log.ts). Text is only ever drawn as text, with secrets masked.
const VIEW_H = 360;
const OVERSCAN = 8;
const MAX_ROWS = 150;
const GUTTER = 52;
const CHAR_W = 7.2; // a 12px mono character, for the height estimate of wrapped lines
const FALLBACK_W = 900;

const num = new Intl.NumberFormat('en');
const iconButton = 'inline-flex size-8 items-center justify-center rounded-md border border-control bg-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-disabled';

interface Segment {
  text: string;
  quote: boolean;
  hit: boolean;
  current: boolean;
}

// Splits one displayed line at the quoted words and at every search hit, so each piece is plain text in or out of a mark.
function segments(text: string, quote: string | null, needle: string, currentNth: number | null): Segment[] {
  const marks: { from: number; to: number; kind: 'quote' | 'hit'; nth: number }[] = [];
  if (quote) {
    const at = text.indexOf(quote);
    if (at !== -1) marks.push({ from: at, to: at + quote.length, kind: 'quote', nth: 0 });
  }
  if (needle !== '') {
    const lower = text.toLowerCase();
    let nth = 0;
    for (let at = lower.indexOf(needle); at !== -1; at = lower.indexOf(needle, at + needle.length)) marks.push({ from: at, to: at + needle.length, kind: 'hit', nth: nth++ });
  }
  if (marks.length === 0) return [{ text, quote: false, hit: false, current: false }];
  const cuts = [...new Set([0, text.length, ...marks.flatMap((m) => [m.from, m.to])])].sort((a, b) => a - b);
  const out: Segment[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const from = cuts[i]!;
    const to = cuts[i + 1]!;
    const inside = marks.filter((m) => m.from <= from && to <= m.to);
    const hit = inside.find((m) => m.kind === 'hit');
    out.push({ text: text.slice(from, to), quote: inside.some((m) => m.kind === 'quote'), hit: !!hit, current: !!hit && hit.nth === currentNth });
  }
  return out;
}

interface Props {
  raw: string; // the failure text of one attempt
  test: string; // for the region's accessible name
  run: string; // the same, e.g. "Run nightly-18-nov.json, attempt 1"
  evidence: QuotedLine[];
  jump?: { line: number; tick: number }; // a chip asked to go to this line
}

export function LogViewer({ raw, test, run, evidence, jump }: Props) {
  const log = useMemo(() => openLog(raw), [raw]);
  const total = lineCount(log);
  const region = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_W);
  const [wrap, setWrap] = useState(true);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [cur, setCur] = useState(0);
  const [current, setCurrent] = useState<number | null>(null); // the line Copy line copies
  const [target, setTarget] = useState<number | null>(null); // the line a chip jumped to: gets the focus ring
  const [focusLine, setFocusLine] = useState<{ line: number; tick: number } | null>(null);
  const [sync, setSync] = useState(0); // bumped when the scroll position was set by code, so the element follows

  const found = useMemo(() => evidence.filter((e) => e.found), [evidence]);
  const quoteAt = useMemo(() => new Map(found.map((e) => [e.line, e.text])), [found]);
  const search = useMemo(() => searchLog(log, deferred), [log, deferred]);
  const needle = deferred.slice(0, MAX_QUERY).toLowerCase();
  const cols = Math.max(20, Math.floor((width - GUTTER - 24) / CHAR_W));
  const heights = useMemo(() => lineHeights(log, { wrap, cols, expanded }), [log, wrap, cols, expanded]);
  const win = windowAt(heights, scrollTop, VIEW_H, OVERSCAN, MAX_ROWS);
  const seen = windowAt(heights, scrollTop, VIEW_H, 0, MAX_ROWS);

  useLayoutEffect(() => {
    const el = region.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || FALLBACK_W);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = (line: number, opts: { focus?: boolean; ring?: boolean } = {}) => {
    const at = Math.max(0, Math.min(heights.total - VIEW_H, heights.starts[Math.max(0, Math.min(total, line) - 1)]! - 2 * LINE_H));
    setScrollTop(at);
    setSync((n) => n + 1);
    setCurrent(line);
    if (opts.ring) setTarget(line);
    if (opts.focus) setFocusLine((f) => ({ line, tick: (f?.tick ?? 0) + 1 }));
  };

  // The element follows a position set by code (a jump, a match, Home and End), not one the person scrolled to.
  useLayoutEffect(() => {
    if (sync > 0 && region.current && region.current.scrollTop !== scrollTop) region.current.scrollTop = scrollTop;
  }, [sync]);

  // A new log opens at its first quoted line, or at the top.
  useEffect(() => {
    setExpanded(new Set());
    setTarget(null);
    setCurrent(null);
    setScrollTop(0);
    setSync((n) => n + 1);
    const first = found[0]?.line;
    if (first) goTo(first);
  }, [log]);

  useEffect(() => {
    if (jump) goTo(jump.line, { focus: true, ring: true });
  }, [jump?.tick]);

  useEffect(() => {
    if (!focusLine) return;
    region.current?.querySelector<HTMLElement>(`[data-line="${focusLine.line}"]`)?.focus({ preventScroll: true });
  }, [focusLine]);

  useEffect(() => {
    setCur(0);
    if (search.matches.length > 0) goTo(search.matches[0]!.line);
  }, [search]);

  const step = (by: 1 | -1) => {
    const n = search.matches.length;
    if (n === 0) return;
    const next = (cur + by + n) % n;
    setCur(next);
    goTo(search.matches[next]!.line);
  };

  const count =
    deferred === ''
      ? ''
      : search.matches.length === 0
        ? t('log.matches.none')
        : t(search.capped ? 'log.matches.capped' : 'log.matches', { current: num.format(cur + 1), total: num.format(search.matches.length) });

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const copyCurrent = () => {
    const line = current ?? found[0]?.line ?? 1;
    void copyText(cutLine(lineText(log, line - 1), true).text, t('log.copyLine.done'));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Home') {
      e.preventDefault();
      setScrollTop(0);
      setSync((n) => n + 1);
    } else if (e.key === 'End') {
      e.preventDefault();
      setScrollTop(Math.max(0, heights.total - VIEW_H));
      setSync((n) => n + 1);
    }
  };

  const rows = [];
  const currentMatch = search.matches[cur];
  for (let i = win.from; i < win.to; i++) {
    const line = i + 1;
    const rawLine = lineText(log, i);
    const cut = cutLine(rawLine, false);
    const open = expanded.has(i) && cut.more > 0;
    const shown = open ? cutLine(rawLine, true).text : cut.text;
    const quote = quoteAt.get(line) ?? null;
    const parts = segments(shown, quote, needle, currentMatch?.line === line ? currentMatch.nth : null);
    const isTarget = target === line;
    rows.push(
      <div
        key={line}
        data-line={line}
        data-evidence={quote !== null ? '' : undefined}
        tabIndex={-1}
        onClick={() => setCurrent(line)}
        className={`flex min-h-5 border-l-[3px] leading-5 outline-none ${quote !== null ? 'border-accent-border bg-accent' : 'border-transparent'} ${current === line && quote === null ? 'bg-surface-hover' : ''} ${isTarget ? 'ring-2 ring-link ring-inset' : ''}`}
      >
        <span data-gutter aria-hidden="true" className="w-[52px] shrink-0 pr-3 text-right text-muted-foreground tabular-nums select-none">
          {line}
        </span>
        <span className={`min-w-0 flex-1 pr-3 ${wrap ? 'break-words whitespace-pre-wrap' : 'whitespace-pre'}`}>
          {parts.map((p, k) =>
            p.quote || p.hit ? (
              <mark
                key={k}
                className={`text-foreground ${p.quote ? 'bg-selection underline decoration-dotted underline-offset-2' : 'bg-status-flaky-subtle'} ${p.current ? 'outline-2 outline-link' : ''}`}
              >
                {p.text}
              </mark>
            ) : (
              <span key={k}>{p.text}</span>
            ),
          )}
          {cut.more > 0 && (
            <button
              type="button"
              className="ml-2 rounded-sm px-1 font-sans text-xs text-link underline"
              onClick={(e) => {
                e.stopPropagation();
                toggle(i);
              }}
            >
              {open ? t('log.showLess') : t('log.showMore', { count: num.format(cut.more) })}
            </button>
          )}
        </span>
      </div>,
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <label className="flex h-8 min-w-0 flex-[1_1_180px] items-center gap-2 rounded-md border border-input bg-background px-2 focus-within:border-link">
          <Search size={14} className="text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            aria-label={t('log.search')}
            placeholder={t('log.search')}
            value={query}
            maxLength={MAX_QUERY}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                step(e.shiftKey ? -1 : 1);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setQuery('');
              }
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
          />
        </label>
        <span role="status" className="min-w-[4.5rem] text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
        <button type="button" className={iconButton} aria-label={t('log.prev')} disabled={search.matches.length === 0} onClick={() => step(-1)}>
          <ChevronUp size={16} aria-hidden="true" />
        </button>
        <button type="button" className={iconButton} aria-label={t('log.next')} disabled={search.matches.length === 0} onClick={() => step(1)}>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={wrap}
          className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-[13px] hover:bg-surface-hover"
          onClick={() => setWrap((w) => !w)}
        >
          <span aria-hidden="true" className={`inline-flex h-4 w-7 items-center rounded-full border border-control px-0.5 ${wrap ? 'justify-end bg-primary' : 'justify-start bg-secondary'}`}>
            <span className="size-3 rounded-full bg-foreground" />
          </span>
          {t('log.wrap')}
        </button>
        <button type="button" className={`${secondaryButton} h-8 px-2.5 text-[13px]`} onClick={copyCurrent}>
          <Copy size={14} aria-hidden="true" />
          {t('log.copyLine')}
        </button>
      </div>
      <div
        ref={region}
        role="region"
        aria-label={t('log.region', { test, run })}
        tabIndex={0}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onKeyDown={onKey}
        style={{ height: Math.min(VIEW_H, Math.max(LINE_H, heights.total)) }}
        className="overflow-auto bg-background font-mono text-xs"
      >
        <div style={{ paddingTop: heights.starts[win.from], paddingBottom: heights.total - heights.starts[win.to]!, minWidth: wrap ? undefined : 'max-content' }}>{rows}</div>
      </div>
      <div className="border-t border-border bg-card px-3 py-1.5 text-xs text-muted-foreground tabular-nums" title={total > MAX_ROWS ? t('log.large') : undefined}>
        {t('log.range', { from: num.format(Math.min(total, seen.from + 1)), to: num.format(Math.min(total, seen.to)), total: num.format(total) })}
      </div>
    </div>
  );
}

