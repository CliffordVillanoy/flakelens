import { CircleAlert } from 'lucide-react';
import type { Label } from '@/engine/types';
import { t } from '../copy';
import { formatMinutes, GROUP_ORDER, type datasetSummary, type health } from '../data/selectors';

const BAR: Record<Label, string> = {
  flaky: 'bg-status-flaky',
  suspect: 'bg-status-suspect',
  failing: 'bg-status-failing',
  stable: 'bg-status-stable',
  insufficient: 'bg-input',
};

// DESIGN.md "Test health summary": title row, stacked distribution bar (one accessible name), legend.
export function TestHealth({ summary, h }: { summary: ReturnType<typeof datasetSummary>; h: ReturnType<typeof health> }) {
  const list = GROUP_ORDER.map((l) => `${h.counts[l]} ${t(`status.${l}`)}`).join(', ');
  return (
    <section aria-labelledby="health-title" className="flex flex-col gap-3 rounded-lg border border-border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 id="health-title" className="m-0 text-[15px] font-semibold">
            {t('health.title')}
          </h2>
          <span className="text-[13px] text-muted-foreground">{t('health.subtitle', summary)}</span>
          {/* The tabs follow the search; this box does not. */}
          <span className="text-xs text-muted-foreground">{t('tests.health.scope', { n: h.total })}</span>
          {summary.notImported > 0 && (
            <a href="#/data" className="inline-flex items-center gap-[5px] text-[13px] text-status-flaky-text">
              <CircleAlert size={14} aria-hidden="true" />
              {t('health.notImported', { n: summary.notImported })}
            </a>
          )}
        </div>
        <span className="text-[13px] text-fg-secondary" title={t('glossary.wasted')}>
          {t('tests.wasted.title')}{' '}
          <strong className="text-[15px] text-foreground tabular-nums">{t('wasted.measured', { min: formatMinutes(h.wastedMs) })}</strong>
          {h.possibleMs > 0 && (
            <span className="text-muted-foreground" title={t('tests.wasted.estimate.hint')}>
              {' '}
              {t('tests.wasted.estimate', { min: formatMinutes(h.possibleMs) })}
            </span>
          )}
        </span>
      </div>
      <div role="img" aria-label={t('tests.health.label', { tests: h.total, list })} className="flex h-2 gap-0.5 overflow-hidden rounded-sm">
        {GROUP_ORDER.filter((l) => h.counts[l] > 0).map((l) => (
          <span key={l} className={`min-w-1.5 ${BAR[l]}`} style={{ flex: `${h.counts[l]} 1 0` }} />
        ))}
      </div>
    </section>
  );
}
