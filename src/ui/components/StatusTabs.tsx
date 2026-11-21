import type { Label } from '@/engine/types';
import { t, type CopyKey } from '../copy';

const TABS: { status: 'all' | Label; key: CopyKey; dot?: string }[] = [
  { status: 'all', key: 'tests.filter.all' },
  { status: 'flaky', key: 'tests.filter.flaky', dot: 'bg-status-flaky' },
  { status: 'suspect', key: 'tests.filter.suspect', dot: 'bg-status-suspect' },
  { status: 'failing', key: 'tests.filter.failing', dot: 'bg-status-failing' },
];

// DESIGN.md "Test health summary and status tabs": underline tabs with counter pills; count 0 is disabled.
export function StatusTabs({ active, counts, onChange }: { active: string; counts: Record<'all' | Label, number>; onChange: (s: string) => void }) {
  return (
    <div role="group" aria-label={t('tests.filter.label')} className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map(({ status, key, dot }) => {
        const pressed = active === status;
        const count = counts[status];
        return (
          <button
            key={status}
            type="button"
            aria-pressed={pressed}
            disabled={status !== 'all' && count === 0}
            title={status === 'suspect' ? t('glossary.suspect') : undefined}
            onClick={() => onChange(status)}
            className={`-mb-px inline-flex h-10 items-center gap-2 border-0 border-b-2 bg-transparent px-3 text-sm hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-disabled disabled:hover:bg-transparent ${pressed ? 'border-link font-semibold text-foreground' : 'border-transparent text-fg-secondary'}`}
          >
            {dot && <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />}
            {t(key)}
            <span className="h-5 min-w-5 rounded-full bg-status-none-subtle px-[7px] text-xs leading-5 font-semibold text-foreground tabular-nums">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
