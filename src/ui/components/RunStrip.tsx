import type { RunCell } from '@/engine/view';
import { t, type CopyKey } from '../copy';

const WORD: Record<RunCell['outcome'], CopyKey> = { pass: 'run.pass', retryPass: 'run.retryPass', fail: 'run.fail', skip: 'run.skip' };

// One run square (DESIGN.md "Run squares: shape cue"): passed solid green, failed hollow red (2px outline),
// passed on retry solid amber, skipped solid gray.
export function RunSquare({ outcome, size = 12 }: { outcome: RunCell['outcome']; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <title>{t(WORD[outcome])}</title>
      {outcome === 'fail' ? (
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="var(--status-failing)" strokeWidth="2" />
      ) : (
        <rect
          x="0.5"
          y="0.5"
          width="15"
          height="15"
          rx="3"
          fill={outcome === 'pass' ? 'var(--status-stable)' : outcome === 'retryPass' ? 'var(--status-flaky)' : 'var(--status-skip)'}
        />
      )}
    </svg>
  );
}

// The whole strip is one image with a label that spells out every run, oldest first.
export function RunStrip({ cells }: { cells: RunCell[] }) {
  const label = t('runs.label', { count: cells.length, list: cells.map((c) => t(WORD[c.outcome])).join(', ') });
  return (
    <span role="img" aria-label={label} className="flex items-center justify-center gap-[3px]">
      {cells.map((c) => (
        <RunSquare key={c.run.runId} outcome={c.outcome} />
      ))}
    </span>
  );
}

export function RunLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
      {(['pass', 'retryPass', 'fail', 'skip'] as const).map((o) => (
        <span key={o} className="inline-flex items-center gap-[5px]">
          <RunSquare outcome={o} size={10} />
          {t(WORD[o])}
        </span>
      ))}
    </div>
  );
}
