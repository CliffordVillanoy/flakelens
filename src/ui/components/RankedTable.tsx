import { useMemo, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Label } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import { groupRows, wastedText, type Row, type Sort, type SortKey } from '../data/selectors';
import { RunStrip } from './RunStrip';
import { StatusPill } from './StatusPill';
import { linkButton } from './buttons';
import type { Density } from './TableControls';

export const HEADER_PX = 40; // sticky column header
export const BAND_PX = 44; // sticky group label under it
const ROW_PX: Record<Density, number> = { comfortable: 56, compact: 32 }; // DESIGN.md "Ranked table spacing", "Table controls"
const COLLAPSED_BY_DEFAULT: Label[] = ['stable', 'insufficient'];
const FIRST_RUN_WHY = 3; // spec 13.1: the top three Flaky tests get a "why?" link

type Item = { kind: 'group'; label: Label; count: number; collapsed: boolean } | { kind: 'row'; row: Row };

export type ColumnKey = 'rank' | 'test' | 'status' | 'runs' | 'why' | 'wasted' | 'score' | 'mixed' | 'flip' | 'lastFailed' | 'project';
interface Column {
  key: ColumnKey;
  header: CopyKey;
  width: string; // grid track
  min: number; // px, for the table's minimum width
  locked?: boolean;
  optional?: boolean; // hidden by default (DESIGN.md "Table controls": optional columns)
  sort?: SortKey;
  firstDir?: Sort['dir'];
}

// Order and widths from DESIGN.md "Ranked table spacing"; optional columns follow Wasted time.
export const COLUMNS: Column[] = [
  { key: 'rank', header: 'tests.col.rank.label', width: '52px', min: 52 },
  { key: 'test', header: 'tests.col.test', width: 'minmax(280px,2.2fr)', min: 280, locked: true, sort: 'test', firstDir: 'asc' },
  { key: 'status', header: 'tests.col.status', width: '120px', min: 120, locked: true },
  { key: 'runs', header: 'tests.col.runs', width: '208px', min: 208 },
  { key: 'why', header: 'tests.col.why', width: 'minmax(260px,3fr)', min: 260 },
  { key: 'wasted', header: 'tests.col.wasted', width: '128px', min: 128, sort: 'wasted', firstDir: 'desc' },
  { key: 'score', header: 'tests.col.score', width: '112px', min: 112, optional: true },
  { key: 'mixed', header: 'tests.col.mixed', width: '120px', min: 120, optional: true },
  { key: 'flip', header: 'tests.col.flip', width: '96px', min: 96, optional: true },
  { key: 'lastFailed', header: 'tests.col.lastFailed', width: '112px', min: 112, optional: true },
  { key: 'project', header: 'tests.col.project', width: '120px', min: 120, optional: true },
];
export const DEFAULT_COLUMNS = COLUMNS.filter((c) => !c.optional).map((c) => c.key);

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function GroupBand({ label, count, collapsed, onShow }: { label: Label; count: number; collapsed: boolean; onShow: () => void }) {
  const text = t(`tests.group.${label}`, { n: count });
  const cut = text.indexOf(' · ', text.indexOf(' · ') + 1);
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-2.5 border-t border-border-muted bg-surface-hover px-4 py-2 text-[13px]">
      <span role="rowheader" className="flex flex-wrap items-baseline gap-x-2">
        <strong className="font-semibold">{text.slice(0, cut)}</strong>
        <span className="text-xs text-muted-foreground">{text.slice(cut)}</span>
      </span>
      {collapsed && (
        <span role="cell">
          <button type="button" aria-expanded="false" className={`${linkButton} h-7 px-2 text-[13px] font-semibold !text-link-hover`} onClick={onShow}>
            {t('tests.group.show', { count, group: t(`status.${label}`) })}
          </button>
        </span>
      )}
    </div>
  );
}

function HeaderCell({ col, sort, onSort }: { col: Column; sort: Sort; onSort: (s: Sort) => void }) {
  const align = col.key === 'test' ? '' : 'text-center';
  if (col.key === 'rank')
    return (
      <div role="columnheader" className="px-4 text-center">
        <span aria-hidden="true">{t('tests.col.rank')}</span>
        <span className="sr-only">{t('tests.col.rank.label')}</span>
      </div>
    );
  if (!col.sort)
    return (
      <div role="columnheader" className={`px-4 ${align}`}>
        {t(col.header)}
      </div>
    );
  // none, then the natural first direction, then the other, then back to the default rank order.
  const active = sort.key === col.sort;
  const next: Sort = !active
    ? { key: col.sort, dir: col.firstDir! }
    : sort.dir === col.firstDir
      ? { key: col.sort, dir: col.firstDir === 'asc' ? 'desc' : 'asc' }
      : { key: 'rank', dir: 'asc' };
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <div
      role="columnheader"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 ${align}`}
      title={col.key === 'wasted' ? t('tests.col.wasted.hint') : undefined}
    >
      <button
        type="button"
        onClick={() => onSort(next)}
        className="inline-flex h-7 items-center gap-1 rounded-md border-0 bg-transparent p-0 font-semibold text-inherit hover:text-foreground"
      >
        <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
        {t(col.header)}
      </button>
    </div>
  );
}

interface Props {
  rows: Row[];
  selectedId?: string;
  expandAll: boolean;
  columns: ColumnKey[];
  density: Density;
  sort: Sort;
  onSort: (s: Sort) => void;
  query?: string; // the list's filters ("?status=flaky&q=x"), kept in row links so the panel opens with them
}

export function RankedTable({ rows, selectedId, expandAll, columns, density, sort, onSort, query = '' }: Props) {
  const [shown, setShown] = useState<Set<Label>>(new Set());
  const cols = COLUMNS.filter((c) => c.locked || columns.includes(c.key));
  const grid = { gridTemplateColumns: cols.map((c) => c.width).join(' ') };
  const minWidth = cols.reduce((n, c) => n + c.min + 8, 0);
  const items = useMemo<Item[]>(
    () =>
      groupRows(rows).flatMap(({ label, rows: rs }) => {
        const collapsed = !expandAll && COLLAPSED_BY_DEFAULT.includes(label) && !shown.has(label);
        const band: Item = { kind: 'group', label, count: rs.length, collapsed };
        return collapsed ? [band] : [band, ...rs.map((row): Item => ({ kind: 'row', row }))];
      }),
    [rows, expandAll, shown],
  );

  const scroller = useRef<HTMLDivElement>(null);
  const estimate = (i: number) => (items[i]?.kind === 'group' ? BAND_PX : ROW_PX[density]);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    estimateSize: estimate,
    // A hidden list (the phone-width panel hides it) measures 0px; keep the estimate instead of caching 0.
    measureElement: (el) => Math.round(el.getBoundingClientRect().height) || estimate(Number((el as HTMLElement).dataset.index)),
    getItemKey: (i) => {
      const it = items[i]!;
      return it.kind === 'group' ? `g:${it.label}` : it.row.score.testId;
    },
    overscan: 8,
    initialRect: { width: 1200, height: 800 },
  });
  const virtual = v.getVirtualItems();

  // Sticky group label: once a group's rows scroll under the header, repeat its band there.
  let current: (Item & { kind: 'group' }) | undefined;
  const first = v.range?.startIndex ?? 0;
  for (let i = Math.min(first, items.length - 1); items[first]?.kind === 'row' && i >= 0; i--) {
    const it = items[i]!;
    if (it.kind === 'group') {
      current = it;
      break;
    }
  }
  const visibleRows = virtual.map((x) => items[x.index]!).filter((it): it is Item & { kind: 'row' } => it.kind === 'row');
  const ordinal = (it: Item & { kind: 'row' }) => rows.indexOf(it.row) + 1;

  return (
    <div className="flex flex-col gap-2">
      <div
        id="results"
        tabIndex={-1}
        ref={scroller}
        // Focus and scrollIntoView keep rows clear of the sticky header and group label.
        style={{ scrollPaddingTop: `${HEADER_PX + BAND_PX}px` }}
        className="max-h-[calc(100vh-120px)] overflow-auto rounded-lg border border-border bg-card"
      >
        <div
          role="table"
          aria-label={t('tests.h1')}
          aria-rowcount={items.length + 1}
          data-density={density}
          style={{ minWidth }}
          className={`ranked-table ${density === 'compact' ? 'text-[13px]' : 'text-sm'}`}
        >
          <div
            role="row"
            aria-rowindex={1}
            style={grid}
            className="ranked-head sticky top-0 z-20 grid h-10 items-center gap-x-2 border-b border-border bg-card text-xs font-semibold text-fg-secondary"
          >
            {cols.map((c) => (
              <HeaderCell key={c.key} col={c} sort={sort} onSort={onSort} />
            ))}
          </div>
          {current && (
            <div aria-hidden="true" className="ranked-sticky sticky z-10 h-0" style={{ top: HEADER_PX }}>
              <GroupBand label={current.label} count={current.count} collapsed={false} onShow={() => {}} />
            </div>
          )}
          <div role="rowgroup" className="relative" style={{ height: v.getTotalSize() }}>
            {virtual.map((x) => {
              const it = items[x.index]!;
              return (
                <div
                  key={x.key}
                  data-index={x.index}
                  ref={v.measureElement}
                  role="row"
                  aria-rowindex={x.index + 2}
                  className="absolute inset-x-0 top-0"
                  style={{ transform: `translateY(${x.start}px)` }}
                >
                  {it.kind === 'group' ? (
                    <GroupBand
                      label={it.label}
                      count={it.count}
                      collapsed={it.collapsed}
                      onShow={() => setShown((s) => new Set(s).add(it.label))}
                    />
                  ) : (
                    <TestRow
                      row={it.row}
                      cols={cols}
                      grid={grid}
                      density={density}
                      query={query}
                      selected={it.row.score.testId === selectedId}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {visibleRows.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {t('tests.rows', { a: ordinal(visibleRows[0]!), b: ordinal(visibleRows.at(-1)!), n: rows.length })}
        </div>
      )}
    </div>
  );
}

function TestRow({
  row,
  cols,
  grid,
  density,
  selected,
  query,
}: {
  row: Row;
  cols: Column[];
  grid: { gridTemplateColumns: string };
  density: Density;
  selected: boolean;
  query: string;
}) {
  const { score, test, cells, evidence, flakyRank } = row;
  // Rank is the fix-priority position, shown for Flaky rows as on board 3; the top three get "why?".
  const why = flakyRank !== null && flakyRank <= FIRST_RUN_WHY;
  const href = `#/tests/${encodeURIComponent(score.testId)}${query}`;
  const compact = density === 'compact';
  const pad = compact ? 'px-3 py-1' : 'px-4 py-3';
  const cell: Record<ColumnKey, () => ReactNode> = {
    rank: () => flakyRank ?? '',
    test: () => (
      <>
        <a
          href={href}
          data-test-id={score.testId}
          // Compact hides the file path; it stays available on hover.
          title={compact ? `${test.title}\n${test.file}` : test.title}
          aria-current={selected ? 'true' : undefined}
          className="truncate font-medium text-foreground no-underline after:absolute after:inset-0 after:content-[''] hover:text-foreground"
        >
          {test.title}
        </a>
        {!compact && (
          <span title={test.file} className={`truncate font-mono text-xs ${selected ? 'text-fg-secondary' : 'text-muted-foreground'}`}>
            {test.file}
          </span>
        )}
      </>
    ),
    status: () => <StatusPill label={score.label} />,
    runs: () => <RunStrip cells={cells} />,
    why: () => (
      <>
        {t(evidence.key, evidence.params)}
        {why && (
          <>
            {' '}
            <a href={href} className="relative z-10 font-semibold">
              {t('tests.why')}
              <span className="sr-only"> {test.title}</span>
            </a>
          </>
        )}
      </>
    ),
    wasted: () => wastedText(score),
    score: () => Math.round(score.score),
    mixed: () => t('cell.fraction', { a: score.mixedCommits, b: row.commits }),
    flip: () => score.flipRate.toFixed(2),
    lastFailed: () => (row.lastFailedAt ? dateFormat.format(new Date(row.lastFailedAt)) : t('wasted.none')),
    project: () => test.project || t('wasted.none'),
  };
  const cls: Partial<Record<ColumnKey, string>> = {
    rank: 'text-center text-muted-foreground tabular-nums',
    test: 'flex min-w-0 flex-col gap-0.5',
    status: 'text-center',
    why: `text-center leading-[1.45] text-fg-secondary ${compact ? 'truncate' : ''}`,
    wasted: 'text-center tabular-nums',
  };
  return (
    <div
      // Bring the whole row, not just its link, clear of the sticky header and group label.
      onFocus={(e) => e.currentTarget.scrollIntoView?.({ block: 'nearest' })}
      style={grid}
      className={`ranked-row relative grid items-center gap-x-2 border-t border-border-muted ${compact ? 'min-h-8' : 'min-h-14'} ${selected ? 'bg-selection font-semibold' : 'hover:bg-surface-hover'}`}
    >
      {cols.map((c) => (
        <div
          key={c.key}
          role="cell"
          title={c.key === 'why' && evidence.key === 'why.mixed' ? t('glossary.mixedCommit') : undefined}
          className={`c-${c.key} ${c.optional ? 'c-opt text-center tabular-nums' : ''} ${pad} ${cls[c.key] ?? ''}`}
        >
          {cell[c.key]()}
        </div>
      ))}
    </div>
  );
}
