import { t } from '../copy';

// Board 12: the two views of the loaded data, Tests and Groups, as tabs with count pills (same look as the status tabs).
// They are links between two screens, so each is a link with aria-current, not a pressed button.
export function ViewTabs({ active, tests, groups }: { active: 'tests' | 'groups'; tests: number; groups: number | null }) {
  const tab = (name: 'tests' | 'groups', label: string, count: number | null) => {
    const on = active === name;
    return (
      <a
        href={`#/${name}`}
        aria-current={on ? 'page' : undefined}
        className={`-mb-px inline-flex h-10 items-center gap-2 border-0 border-b-2 bg-transparent px-3 text-sm no-underline hover:bg-surface-hover ${on ? 'border-link font-semibold text-foreground' : 'border-transparent text-fg-secondary'}`}
      >
        {label}
        {count !== null && (
          <span className="h-5 min-w-5 rounded-full bg-status-none-subtle px-[7px] text-xs leading-5 font-semibold text-foreground tabular-nums">{count}</span>
        )}
      </a>
    );
  };
  return (
    <nav aria-label={t('groups.tabs.label')} className="flex gap-1 border-b border-border">
      {tab('tests', t('tests.tab'), tests)}
      {tab('groups', t('groups.tab'), groups)}
    </nav>
  );
}
