import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import { countLine, datasetSummary, filterRows, health, isLabel, tableRows } from '../data/selectors';
import { DropZone } from '../components/DropZone';
import { ImportBanner } from '../components/ImportBanner';
import { ImportProgress } from '../components/ImportProgress';
import { RankedTable } from '../components/RankedTable';
import { RunLegend } from '../components/RunStrip';
import { SampleBanner } from '../components/SampleBanner';
import { StatusTabs } from '../components/StatusTabs';
import { TestHealth } from '../components/TestHealth';
import { getPref } from '../lib/prefs';
import { navigate, useRoute } from '../lib/router';

export { HEADER_PX, BAND_PX } from '../components/RankedTable';

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

const hashFor = (status: string, q: string) => {
  const p = new URLSearchParams();
  if (status !== 'all') p.set('status', status);
  if (q) p.set('q', q);
  const s = p.toString();
  return `#/tests${s ? `?${s}` : ''}`;
};

// Board 3 Tests: sample banner, import results, Test health, status tabs, search, legend, ranked table.
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
  const status = route.query.get('status') ?? 'all';
  const [q, setQ] = useState(route.query.get('q') ?? '');
  const [sampleHidden, setSampleHidden] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => setQ(route.query.get('q') ?? ''), [route.query]);
  // "/" focuses search; single-key shortcuts never fire while typing and can be switched off (pref).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !getPref('shortcuts', true)) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo(() => tableRows(s.dataset, s.ranked), [s.dataset, s.ranked]);
  const summary = useMemo(() => datasetSummary(s.dataset), [s.dataset]);
  const h = useMemo(() => health(rows), [rows]);
  const searched = useMemo(() => filterRows(rows, { status: 'all', q }), [rows, q]);
  const shown = useMemo(() => filterRows(searched, { status, q: '' }), [searched, status]);
  const tabCounts = useMemo(() => {
    const c = health(searched).counts;
    return { all: searched.length, ...c };
  }, [searched]);

  const failed = s.lastImport?.records.filter((r) => r.result === 'failed') ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[1232px] flex-col gap-3.5 px-6 py-4 max-sm:px-4">
      <h1 className="sr-only">{t('tests.h1')}</h1>
      {s.mode === 'sample' && !sampleHidden && (
        <SampleBanner dataset={s.dataset} onExit={onExitSample} onDismiss={() => setSampleHidden(true)} />
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

      <StatusTabs active={isLabel(status) ? status : 'all'} counts={tabCounts} onChange={(st) => navigate(hashFor(st, q))} />

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
              navigate(hashFor(isLabel(status) ? status : 'all', e.target.value), { replace: true });
            }}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div role="status" aria-live="polite" className="text-[13px] text-muted-foreground">
          {countLine(shown.length, isLabel(status) ? status : 'all', q)}
        </div>
      </div>

      <RunLegend />

      <RankedTable rows={shown} selectedId={route.testId} expandAll={isLabel(status) || q.trim() !== ''} />

      <div className="text-xs text-muted-foreground">{t('tests.keys')}</div>
    </div>
  );
}

