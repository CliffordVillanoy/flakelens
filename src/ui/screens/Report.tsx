import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, Download } from 'lucide-react';
import { t, type CopyKey } from '../copy';
import { useStore } from '../data/store';
import { FILES, buildReport, reportMarkdown, scopeRows, type ReportInput, type Scope } from '../data/exportData';
import { filterRows, groupRows, isLabel, RANK_SORT, sortRows, tableRows } from '../data/selectors';
import { toast, toastError } from '../components/Toasts';
import { primaryButton, secondaryButton } from '../components/buttons';
import { downloadFile } from '../lib/download';
import { navigate } from '../lib/router';
import { version } from '../../../package.json'; // a named import: the rest of package.json is left out of the build

// Board 14 "Report": the Markdown summary of a scope, as a preview and as the exact text. The page never changes data.
// The scope comes in the address (#/report?scope=view|all&status=&q=), so the Export menu is the one place that decides it.
const TOP_FLAKY = 10;
const urlStatus = (status: string) => (status === 'suspect' ? 'unproven' : status);

type Causes = NonNullable<ReportInput['causes']>;

export function Report({ query, onBrowse }: { query: URLSearchParams; onBrowse: () => void }) {
  const { dataset: ds, ranked, mode } = useStore();
  const scope: Scope = query.get('scope') === 'view' ? 'view' : 'all';
  const rawStatus = query.get('status') ?? 'all';
  const status = rawStatus === 'unproven' ? 'suspect' : rawStatus;
  const q = query.get('q') ?? '';
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const [causes, setCauses] = useState<Causes>(new Map());
  const now = useRef(new Date()).current;

  const rows = useMemo(() => tableRows(ds, ranked), [ds, ranked]);
  const scoped = useMemo(() => {
    const inOrder = (r: typeof rows) => groupRows(sortRows(r, RANK_SORT)).flatMap((g) => g.rows);
    return scopeRows(inOrder(rows), inOrder(filterRows(rows, { status, q })), scope);
  }, [rows, status, q, scope]);
  const input = (c: Causes): ReportInput => ({ rows: scoped, ds, sample: mode === 'sample', scope, version, now, causes: c });

  // The likely cause of the top Flaky tests, worked out by the failure-group code (its own chunk). Only medium and high confidence.
  const loadCauses = async (): Promise<Causes> => {
    const groups = await import('../data/groups');
    const out = new Map<string, { cause: string; level: 'medium' | 'high' }>();
    for (const r of scoped.filter((x) => x.score.label === 'flaky').slice(0, TOP_FLAKY)) {
      const group = groups.groupForTest(ds, r.score.testId);
      if (!group) continue;
      const c = groups.causeOf(ds, group);
      if (c.category === 'unknown' || c.confidence === 'low') continue;
      out.set(r.score.testId, { cause: t(`cause.${c.category}` as CopyKey), level: c.confidence });
    }
    return out;
  };
  useEffect(() => {
    let alive = true;
    void loadCauses().then((c) => alive && setCauses(c));
    return () => {
      alive = false;
    };
  }, [scoped, ds]);

  const model = useMemo(() => buildReport(input(causes)), [scoped, ds, mode, scope, causes]);
  const markdown = useMemo(() => reportMarkdown(model), [model]);
  const freshMarkdown = async () => reportMarkdown(buildReport(input(await loadCauses())));

  const download = async () => {
    downloadFile(FILES.md, 'text/markdown;charset=utf-8', await freshMarkdown());
    toast(t('toast.export.md', { count: scoped.length }));
  };
  const copy = async () => {
    const md = await freshMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      toast(t('toast.export.copied'));
    } catch {
      toastError(t('toast.export.copyFailed'), { label: t('report.download'), run: () => void download() });
    }
  };

  const back = (() => {
    const p = new URLSearchParams();
    if (isLabel(status)) p.set('status', urlStatus(status));
    if (q) p.set('q', q);
    const s = p.toString();
    return `#/tests${s ? `?${s}` : ''}`;
  })();
  const empty = mode === 'empty' || ds.tests.length === 0;
  const scopeText = scope === 'all' ? t('export.scope.all', { count: scoped.length }) : t('export.scope.view', { count: scoped.length });

  return (
    <div className="pg mx-auto flex w-full max-w-[860px] flex-col gap-4 px-6 py-5 max-sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <a href={back} className="inline-flex min-h-6 items-center gap-1 self-start text-[13px]" onClick={(e) => (e.preventDefault(), navigate(back))}>
            <ArrowLeft size={14} aria-hidden="true" />
            {t('report.back')}
          </a>
          <h1 className="m-0 text-2xl font-bold">{t('report.title')}</h1>
        </div>
        {!empty && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`${primaryButton} h-9 text-sm`} onClick={() => void copy()}>
              <Copy size={14} aria-hidden="true" />
              {t('report.copy')}
            </button>
            <button type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={() => void download()}>
              <Download size={14} aria-hidden="true" />
              {t('report.download')}
            </button>
          </div>
        )}
      </div>

      {empty ? (
        <div className="flex flex-col items-center gap-2.5 rounded-lg border border-border bg-card px-5 py-8 text-center">
          <h2 className="m-0 text-[15px] font-semibold">{t('report.noData.title')}</h2>
          <p className="m-0 text-sm text-muted-foreground">{t('report.noData.body')}</p>
          <button type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={onBrowse}>
            {t('report.noData.action')}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label={t('report.view')} className="inline-flex overflow-hidden rounded-md border border-control">
              {(['preview', 'source'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`h-8 px-3.5 text-[13px] font-semibold ${view === v ? 'bg-selection text-foreground' : 'bg-secondary text-fg-secondary hover:bg-surface-hover'}`}
                >
                  {t(`report.view.${v}`)}
                </button>
              ))}
            </div>
            <span className="text-sm text-fg-secondary">{scopeText}</span>
          </div>

          {mode === 'sample' && (
            <div role="status" className="rounded-md border-l-[3px] border-status-flaky bg-status-flaky-subtle px-3.5 py-2.5 text-sm text-status-flaky-text">
              {t('report.sample')}
            </div>
          )}

          {view === 'preview' ? (
            <article aria-label={model.title} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 max-sm:p-4">
              <div className="flex flex-col gap-1">
                <h2 className="m-0 text-xl font-semibold">{model.title}</h2>
                <p className="m-0 text-sm text-muted-foreground">{model.meta}</p>
              </div>
              <section className="flex flex-col gap-1.5">
                <h2 className="m-0 text-[17px] font-semibold">{model.summaryTitle}</h2>
                <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm">
                  <li>{model.counts}</li>
                  <li>{model.wasted}</li>
                </ul>
              </section>
              <section className="flex flex-col gap-2">
                <h2 className="m-0 text-[17px] font-semibold">{model.topTitle}</h2>
                {model.noFlaky && <p className="m-0 text-sm text-muted-foreground">{model.noFlaky}</p>}
                {model.items.length > 0 && (
                  <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-sm">
                    {model.items.map((it, i) => (
                      <li key={i}>
                        <div className="font-mono font-semibold break-words">{it.name}</div>
                        <div className="text-fg-secondary">{it.detail}</div>
                        {it.cause && <div className="text-fg-secondary">{it.cause}</div>}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              <p className="m-0 border-t border-border pt-3 text-[13px] text-muted-foreground">{model.footer}</p>
            </article>
          ) : (
            <pre
              data-testid="report-markdown"
              tabIndex={0}
              aria-label={t('report.view.source')}
              className="m-0 overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-[13px] leading-relaxed whitespace-pre select-text"
            >
              {markdown}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
