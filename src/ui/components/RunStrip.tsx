import type { RunCell } from '@/engine/view';
import { t, type CopyKey } from '../copy';

const WORD: Record<RunCell['outcome'], CopyKey> = { pass: 'run.pass', retryPass: 'run.retryPass', fail: 'run.fail', skip: 'run.skip' };

// One run square (DESIGN.md "Run squares: failed is filled", 2026-11-27): all four are solid, the same 16-unit box with rx 3 and no
// inner mark. Passed green, failed red, passed on retry amber, skipped gray. Colour is not the only carrier of meaning:
// the tooltip below, the accessible name of the strip or column, and the Evidence text on the same row say it too.
const FILL: Record<RunCell['outcome'], string> = {
  pass: 'var(--status-stable)',
  fail: 'var(--status-failing)',
  retryPass: 'var(--status-flaky)',
  skip: 'var(--status-skip)',
};

export function RunSquare({ outcome, size = 12 }: { outcome: RunCell['outcome']; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <title>{t(WORD[outcome])}</title>
      <rect x="0.5" y="0.5" width="15" height="15" rx="3" fill={FILL[outcome]} />
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
