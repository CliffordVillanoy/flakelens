import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import type { Label } from '@/engine/types';
import { countLine, datasetSummary, filterRows, groupRows, health, isLabel, RANK_SORT, sortRows, tableRows, topFlakyMarkdown, type Sort } from '../data/selectors';
import { DropZone } from '../components/DropZone';
import { ImportBanner } from '../components/ImportBanner';
import { ImportProgress } from '../components/ImportProgress';
import { COLUMNS, DEFAULT_COLUMNS, RankedTable, type ColumnKey } from '../components/RankedTable';
import { EmptyState } from '../components/EmptyState';
import { RunLegend } from '../components/RunStrip';
import { secondaryButton } from '../components/buttons';
import { suggestSearch } from '../data/loaded';
import { SampleBanner } from '../components/SampleBanner';
import { StatusTabs } from '../components/StatusTabs';
import { TestHealth } from '../components/TestHealth';
import { ColumnsMenu, DensityToggle, ExportMenu, FilterChips, type Density } from '../components/TableControls';
import { copyText } from '../lib/clipboard';
import { shortcutsSheet, useShortcuts } from '../lib/shortcuts';
import { MissingTest, TestPanel } from './TestPanel';
import { getPref, setPref } from '../lib/prefs';
import { navigate, useRoute } from '../lib/router';

export { HEADER_PX, BAND_PX } from '../components/RankedTable';

// The address bar uses the name the app shows (unproven); the engine label stays 'suspect', and old links with it still work.
const urlStatus = (status: string) => (status === 'suspect' ? 'unproven' : status);
const hashFor = (status: string, q: string) => {
  const p = new URLSearchParams();
  if (status !== 'all') p.set('status', urlStatus(status));
  if (q) p.set('q', q);
  const s = p.toString();
  return `#/tests${s ? `?${s}` : ''}`;
};

// Board 3 Tests: sample banner, import results, Test health, status tabs, search, legend, ranked table.
const ANNOUNCE_DELAY_MS = 500;
/** The value, once it has stayed the same for `ms`. The first value is returned at once. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

export function Tests({
  onFiles = () => {},
  onBrowse = () => {},
  onExitSample = () => {},
}: {
  onFiles?: (files: File[]) => void;
  onBrowse?: () => void;
  onExitSample?: () => void;
}) {
  const route = useRoute();
  const s = useStore();
  const rawStatus = route.query.get('status') ?? 'all';
  const status = rawStatus === 'unproven' ? 'suspect' : rawStatus;
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [sampleHidden, setSampleHidden] = useState(false);
  // Per-browser preferences (DESIGN.md "Table controls"); sorting is per visit.
  const [columns, setColumns] = useState<ColumnKey[]>(() => {
    const saved = getPref<unknown>('columns', DEFAULT_COLUMNS);
    return Array.isArray(saved) ? saved.filter((k): k is ColumnKey => COLUMNS.some((c) => c.key === k)) : DEFAULT_COLUMNS;
  });
  const [density, setDensity] = useState<Density>(() => (getPref<string>('density', 'comfortable') === 'compact' ? 'compact' : 'comfortable'));
  const [sort, setSort] = useState<Sort>(RANK_SORT);
  const saveColumns = (next: ColumnKey[]) => {
    setColumns(next);
    setPref('columns', next);
  };
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => setQ(route.query.get('q') ?? ''), [route.query]);
  const rows = useMemo(() => tableRows(s.dataset, s.ranked), [s.dataset, s.ranked]);
  const summary = useMemo(() => datasetSummary(s.dataset), [s.dataset]);
  const h = useMemo(() => health(rows), [rows]);
  const searched = useMemo(() => filterRows(rows, { status: 'all', q }), [rows, q]);
  const shown = useMemo(() => sortRows(filterRows(searched, { status, q: '' }), sort), [searched, status, sort]);
  const tabCounts = useMemo(() => {
    const c = health(searched).counts;
    return { all: searched.length, ...c };
  }, [searched]);

  // The live count is read out once typing has settled, not on every keystroke.
  const countText = countLine(shown.length, isLabel(status) ? status : 'all', q, sort);
  const announced = useSettled(countText, ANNOUNCE_DELAY_MS);

  const failed = s.lastImport?.records.filter((r) => r.result === 'failed') ?? [];

  // Detail panel (board 4). The list's filters travel in the links, so opening a test keeps them.
  // Changing a filter keeps an open panel open: its URL carries the test id and the new filters.
  const listHash = (st: string, query: string) => {
    const h = hashFor(st, query);
    return route.name === 'test' ? `#/tests/${encodeURIComponent(route.testId!)}${h.slice('#/tests'.length)}` : h;
  };
  const listQuery = hashFor(isLabel(status) ? status : 'all', q).slice('#/tests'.length);
  const testHref = (id: string) => `#/tests/${encodeURIComponent(id)}${listQuery}`;
  const order = useMemo(() => groupRows(shown).flatMap((g) => g.rows), [shown]); // the shown order, group by group
  const openRow = route.testId === undefined ? undefined : rows.find((r) => r.score.testId === route.testId);
  const at = openRow ? order.findIndex((r) => r.score.testId === openRow.score.testId) : -1;
  const panelOpen = route.name === 'test';
  const closeHref = `#/tests${listQuery}`;

  // Closing returns focus to the row that was open.
  const lastOpen = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (route.name === 'tests' && lastOpen.current !== undefined) {
      const id = lastOpen.current;
      [...document.querySelectorAll<HTMLElement>('[data-test-id]')].find((a) => a.dataset.testId === id)?.focus();
    }
    lastOpen.current = route.name === 'test' ? route.testId : undefined;
  }, [route.name, route.testId]);

  // Single-key shortcuts (IA section 5): never in text fields, switchable off. "?" is a hook DEV-17 fills.
  const move = (step: 1 | -1) => {
    if (panelOpen) {
      const next = order[at + step];
      if (at !== -1 && next) navigate(testHref(next.score.testId));
      return;
    }
    const links = [...document.querySelectorAll<HTMLElement>('.ranked-row a[data-test-id]')];
    const here = links.indexOf(document.activeElement as HTMLElement);
    links[here === -1 ? (step === 1 ? 0 : links.length - 1) : here + step]?.focus();
  };
  useShortcuts({
    '/': () => search.current?.focus(),
    j: () => move(1),
    k: () => move(-1),
    '?': () => shortcutsSheet.open(),
    Escape: () => panelOpen && navigate(closeHref),
  });

  return (
    <div className="pg mx-auto flex w-full max-w-[1232px] flex-col gap-3.5 px-6 py-4">
      <h1 className="sr-only">{t('tests.h1')}</h1>
      <div className="listpane flex flex-col gap-3.5" data-panel={panelOpen}>
      {s.mode === 'sample' && !sampleHidden && (
        <SampleBanner onExit={onExitSample} onDismiss={() => setSampleHidden(true)} />
      )}
      {s.importing && <ImportProgress files={s.importing.files} done={s.importing.done} onCancel={s.cancelImport} />}
      {!s.importing && (failed.length > 0 || s.importError) && (
        <DropZone
          onFiles={onFiles}
          onBrowse={onBrowse}
          failed={failed}
          others={(s.lastImport?.records.length ?? 0) - failed.length}
          error={s.importError}
        />
      )}
      {s.lastImport && (
        <ImportBanner
          summary={s.lastImport}
          totals={{ tests: s.dataset.tests.length, runs: s.dataset.runs.length }}
          onDismiss={s.dismissImport}
        />
      )}

      <TestHealth summary={summary} h={h} />

      <StatusTabs active={isLabel(status) ? status : 'all'} counts={tabCounts} onChange={(st) => navigate(listHash(st, q))} />

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-9 flex-[1_1_280px] items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-link">
          <Search size={16} className="text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">{t('tests.search.placeholder')}</span>
          <input
            ref={search}
            type="search"
            value={q}
            placeholder={t('tests.search.placeholder')}
            aria-keyshortcuts="/"
            onChange={(e) => {
              setQ(e.target.value);
              navigate(listHash(isLabel(status) ? status : 'all', e.target.value), { replace: true });
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <ColumnsMenu
          options={COLUMNS.map((c) => ({ key: c.key, label: t(c.header), locked: c.locked }))}
          visible={new Set(columns)}
          onToggle={(k) => saveColumns(columns.includes(k as ColumnKey) ? columns.filter((c) => c !== k) : [...columns, k as ColumnKey])}
          onReset={() => saveColumns(DEFAULT_COLUMNS)}
        />
        <DensityToggle
          value={density}
          onChange={(d) => {
            setDensity(d);
            setPref('density', d);
          }}
        />
        <ExportMenu
          onCopyTop={() => copyText(topFlakyMarkdown(rows), t('panel.copySummary.done'))}
        />
        <div role="status" aria-live="polite" className="sr-only">
          {announced}
        </div>
      </div>

      <FilterChips
        chips={[
          ...(isLabel(status)
            ? [{ label: t('tests.filters.status', { status: t(`status.${status}`) }), onRemove: () => navigate(listHash('all', q)) }]
            : []),
          ...(q.trim()
            ? [{ label: t('tests.filters.search', { query: q.trim() }), onRemove: () => navigate(listHash(isLabel(status) ? status : 'all', '')) }]
            : []),
        ]}
        onClear={() => navigate(listHash('all', ''))}
      />

      <RunLegend />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="listpane min-w-0 flex-[1_1_420px]" data-panel={panelOpen}>
          {shown.length === 0 && rows.length > 0 ? (
            <NoRows
              q={q.trim()}
              status={isLabel(status) ? status : null}
              runs={s.dataset.runs.length}
              suggestion={q.trim() ? suggestSearch(rows, q) : null}
              onSearch={(next) => navigate(listHash(isLabel(status) ? status : 'all', next))}
              onShowAll={() => navigate(listHash('all', q))}
            />
          ) : (
          <RankedTable
            rows={shown}
            selectedId={route.testId}
            expandAll={isLabel(status) || q.trim() !== ''}
            // With a panel open the list keeps just rank, test and status, as on board 4.
            columns={panelOpen ? ['rank'] : columns}
            density={density}
            sort={sort}
            onSort={setSort}
            query={listQuery}
          />
          )}
        </div>
        {panelOpen &&
          (openRow ? (
            <TestPanel
              key={openRow.score.testId}
              row={openRow}
              ds={s.dataset}
              position={
                at === -1
                  ? null
                  : {
                      index: at + 1,
                      count: order.length,
                      prev: order[at - 1] && testHref(order[at - 1]!.score.testId),
                      next: order[at + 1] && testHref(order[at + 1]!.score.testId),
                    }
              }
              closeHref={closeHref}
            />
          ) : (
            <MissingTest listHref="#/tests" />
          ))}
      </div>

      <div className="listpane text-xs text-muted-foreground" data-panel={panelOpen}>
        {t('tests.keys')}
      </div>
    </div>
  );
}


// Board 6 states A and B: no row matches the search, or the status filter has no tests.
function NoRows({
  q,
  status,
  runs,
  suggestion,
  onSearch,
  onShowAll,
}: {
  q: string;
  status: Label | null;
  runs: number;
  suggestion: string | null;
  onSearch: (q: string) => void;
  onShowAll: () => void;
}) {
  const button = `${secondaryButton} h-9 px-3.5 text-sm`;
  if (q)
    return (
      <EmptyState title={t('empty.search.title', { query: q })} body={t('empty.search.body')}>
        {suggestion && (
          <button type="button" className={button} onClick={() => onSearch(suggestion)}>
            {t('empty.search.suggest', { suggestion })}
          </button>
        )}
        <button type="button" className={button} onClick={() => onSearch('')}>
          {t('empty.search.clear')}
        </button>
      </EmptyState>
    );
  return (
    <EmptyState
      title={t('empty.filter.title', { status: status ? t(`status.${status}`) : '', runs })}
      body={status === 'flaky' ? t('empty.filter.body') : undefined}
    >
      <button type="button" className={button} onClick={onShowAll}>
        {t('empty.filter.action')}
      </button>
    </EmptyState>
  );
}
