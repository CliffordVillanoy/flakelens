import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Label } from '@/engine/types';
import { t } from '../copy';
import { groupRows, wastedText, type Row } from '../data/selectors';
import { RunStrip } from './RunStrip';
import { StatusPill } from './StatusPill';
import { linkButton } from './buttons';

export const HEADER_PX = 40; // sticky column header
export const BAND_PX = 44; // sticky group label under it
const ROW_PX = 56; // Comfortable rows (DESIGN.md "Ranked table spacing")
// Columns: rank 52, Test minmax(280, 2.2fr), Status 120, Last 12 runs 208, Evidence minmax(260, 3fr), Wasted 128.
const GRID = 'grid grid-cols-[52px_minmax(280px,2.2fr)_120px_208px_minmax(260px,3fr)_128px] gap-x-2';
const CELL = 'px-4 py-3';
const COLLAPSED_BY_DEFAULT: Label[] = ['stable', 'insufficient'];

type Item = { kind: 'group'; label: Label; count: number; collapsed: boolean } | { kind: 'row'; row: Row; rank: number | null };

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
        <button type="button" aria-expanded="false" className={`${linkButton} h-7 px-2 text-[13px] font-semibold`} onClick={onShow}>
          {t('tests.group.show', { count, group: t(`status.${label}`) })}
        </button>
      )}
    </div>
  );
}

export function RankedTable({ rows, selectedId, expandAll }: { rows: Row[]; selectedId?: string; expandAll: boolean }) {
  const [shown, setShown] = useState<Set<Label>>(new Set());
  const items = useMemo<Item[]>(
    () =>
      groupRows(rows).flatMap(({ label, rows: rs }) => {
        const collapsed = !expandAll && COLLAPSED_BY_DEFAULT.includes(label) && !shown.has(label);
        const band: Item = { kind: 'group', label, count: rs.length, collapsed };
        // Rank is the fix-priority position, shown for Flaky rows as on board 3.
        return collapsed ? [band] : [band, ...rs.map((row, i): Item => ({ kind: 'row', row, rank: label === 'flaky' ? i + 1 : null }))];
      }),
    [rows, expandAll, shown],
  );

  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    estimateSize: (i) => (items[i]!.kind === 'group' ? BAND_PX : ROW_PX),
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
        ref={scroller}
        // Focus and scrollIntoView keep rows clear of the sticky header and group label.
        style={{ scrollPaddingTop: `${HEADER_PX + BAND_PX}px` }}
        className="max-h-[calc(100vh-120px)] overflow-auto rounded-lg border border-border bg-card"
      >
        <div role="table" aria-label={t('tests.h1')} aria-rowcount={items.length + 1} className="ranked-table min-w-[1160px] text-sm">
          <div
            role="row"
            aria-rowindex={1}
            className={`ranked-head sticky top-0 z-20 h-10 items-center border-b border-border bg-card text-xs font-semibold text-fg-secondary ${GRID}`}
          >
            <div role="columnheader" className="px-4 text-center">
              <span aria-hidden="true">{t('tests.col.rank')}</span>
              <span className="sr-only">{t('tests.col.rank.label')}</span>
            </div>
            <div role="columnheader" className="px-4">
              {t('tests.col.test')}
            </div>
            <div role="columnheader" className="px-4 text-center">
              {t('tests.col.status')}
            </div>
            <div role="columnheader" className="px-4 text-center">
              {t('tests.col.runs')}
            </div>
            <div role="columnheader" className="px-4 text-center">
              {t('tests.col.why')}
            </div>
            <div role="columnheader" className="px-4 text-center" title={t('tests.col.wasted.hint')}>
              {t('tests.col.wasted')}
            </div>
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
                    <TestRow row={it.row} rank={it.rank} selected={it.row.score.testId === selectedId} />
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

function TestRow({ row, rank, selected }: { row: Row; rank: number | null; selected: boolean }) {
  const { score, test, cells, evidence } = row;
  const name = test.title;
  return (
    <div
      // Bring the whole row, not just its link, clear of the sticky header and group label.
      onFocus={(e) => e.currentTarget.scrollIntoView?.({ block: 'nearest' })}
      className={`ranked-row relative min-h-14 items-center border-t border-border-muted ${GRID} ${selected ? 'bg-selection font-semibold' : 'hover:bg-surface-hover'}`}
    >
      <div role="cell" className={`c-rank ${CELL} text-center text-muted-foreground tabular-nums`}>
        {rank ?? ''}
      </div>
      <div role="cell" className={`c-test ${CELL} flex min-w-0 flex-col gap-0.5`}>
        <a
          href={`#/tests/${encodeURIComponent(score.testId)}`}
          title={name}
          aria-current={selected ? 'true' : undefined}
          className="truncate font-medium text-foreground no-underline after:absolute after:inset-0 after:content-[''] hover:text-foreground"
        >
          {name}
        </a>
        <span title={test.file} className="truncate font-mono text-xs text-muted-foreground">
          {test.file}
        </span>
      </div>
      <div role="cell" className={`c-status ${CELL} text-center`}>
        <StatusPill label={score.label} />
      </div>
      <div role="cell" className={`c-runs ${CELL}`}>
        <RunStrip cells={cells} />
      </div>
      <div
        role="cell"
        title={evidence.key === 'why.mixed' ? t('glossary.mixedCommit') : undefined}
        className={`c-why ${CELL} text-center leading-[1.45] text-fg-secondary`}
      >
        {t(evidence.key, evidence.params)}
      </div>
      <div role="cell" className={`c-wasted ${CELL} text-center tabular-nums`}>
        {wastedText(score)}
      </div>
    </div>
  );
}
