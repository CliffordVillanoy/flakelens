import type { Label } from '@/engine/types';
import { t } from '../copy';

const TONE: Record<Label, string> = {
  flaky: 'bg-status-flaky-subtle text-status-flaky-text',
  suspect: 'bg-status-suspect-subtle text-status-suspect-text',
  failing: 'bg-status-failing-subtle text-status-failing-text',
  stable: 'bg-status-stable-subtle text-status-stable-text',
  insufficient: 'bg-status-none-subtle text-status-none',
};

// DESIGN.md "Status pills: label only" and "Status pill geometry": the word only, 22px high, min width 76px.
export function StatusPill({ label }: { label: Label }) {
  return (
    <span
      data-pill
      title={label === 'suspect' ? t('glossary.suspect') : undefined}
      className={`inline-flex h-[22px] min-w-[76px] items-center justify-center rounded-full px-2 text-xs leading-none font-semibold whitespace-nowrap ${TONE[label]}`}
    >
      {t(`status.${label}`)}
    </span>
  );
}
