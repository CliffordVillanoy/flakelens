import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Columns3, Download, X } from 'lucide-react';
import { t } from '../copy';
import type { Scope } from '../data/exportData';
import { linkButton, secondaryButton } from './buttons';

// Board 8 "Table controls": filter chips, column picker, density switch and the Export menu (board 14).

export function FilterChips({ chips, onClear }: { chips: { label: string; onRemove: () => void }[]; onClear: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div role="group" aria-label={t('tests.filters')} className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c.label} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-control bg-secondary py-0 pr-1 pl-2.5 text-[13px]">
          {c.label}
          <button
            type="button"
            aria-label={t('tests.filters.remove', { filter: c.label })}
            className="inline-flex size-6 items-center justify-center rounded-full hover:bg-surface-hover"
            onClick={c.onRemove}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </span>
      ))}
      <button type="button" className={`${linkButton} h-7 px-2 text-[13px] font-semibold`} onClick={onClear}>
        {t('tests.filters.clear')}
      </button>
    </div>
  );
}

// Closes a popover on Escape or a click outside it, and returns focus to its button on Escape.
function usePopover() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    setOpen(false);
    button.current?.focus();
  };
  return { open, setOpen, box, button, onKeyDown };
}

export interface ColumnOption {
  key: string;
  label: string;
  locked?: boolean;
}

export function ColumnsMenu({
  options,
  visible,
  onToggle,
  onReset,
}: {
  options: ColumnOption[];
  visible: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const p = usePopover();
  return (
    <div ref={p.box} className="relative" onKeyDown={p.onKeyDown}>
      <button
        ref={p.button}
        type="button"
        aria-haspopup="true"
        aria-expanded={p.open}
        className={`${secondaryButton} h-9 border-input text-[13px]`}
        onClick={() => p.setOpen(!p.open)}
      >
        <Columns3 size={14} aria-hidden="true" />
        {t('tests.columns')}
      </button>
      {p.open && (
        <div
          role="dialog"
          aria-label={t('tests.columns.title')}
          className="absolute top-full left-0 z-30 mt-1.5 flex w-[286px] flex-col gap-0.5 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          {options.map((o) => (
            <label key={o.key} className={`flex h-7 items-center gap-2 text-[13px] ${o.locked ? 'text-disabled' : ''}`}>
              <input
                type="checkbox"
                className="size-4"
                checked={o.locked || visible.has(o.key)}
                disabled={o.locked}
                onChange={() => onToggle(o.key)}
              />
              {o.label}
              {o.locked && <span className="text-xs">{t('tests.columns.locked')}</span>}
            </label>
          ))}
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <button type="button" className={`${linkButton} h-7 px-2 text-[13px] font-semibold`} onClick={onReset}>
              {t('tests.columns.reset')}
            </button>
            <span className="self-center text-xs text-muted-foreground">{t('tests.columns.saved')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export type Density = 'comfortable' | 'compact';

interface Entry {
  key: string;
  label: string;
  title?: string; // the explanation, as a tooltip (rule 8: no hint text on the menu)
  radio?: boolean;
  checked?: boolean;
  disabled?: boolean;
  run: () => Promise<void> | void;
  keepOpen?: boolean;
}

export interface ExportMenuProps {
  scope: Scope;
  onScope: (scope: Scope) => void;
  viewCount: number;
  allCount: number;
  tab: string; // the name of the tab in view, for the tooltip
  q: string;
  onCopyTop: () => Promise<void> | void;
  onCsv: () => void;
  onJson: () => void;
  onReport: () => void;
}

// DESIGN.md "Export menu" (board 14): the scope comes first because it changes every item below it. Scope choices are
// menuitemradio inside a named group (the ARIA way to put a choice in a menu). The menu shows no hint lines; the
// explanations are tooltips. With nothing in the view the file items are off and the reason is written beside them.
export function ExportMenu(props: ExportMenuProps) {
  const p = usePopover();
  const { scope, viewCount, allCount, q } = props;
  const empty = scope === 'view' && viewCount === 0;
  const entries: Entry[] = [
    {
      key: 'view',
      label: t('export.scope.view', { count: viewCount }),
      title: q.trim() ? t('export.scope.view.hint', { tab: props.tab, q: q.trim() }) : t('export.scope.view.hint.noSearch', { tab: props.tab }),
      radio: true,
      checked: scope === 'view',
      run: () => props.onScope('view'),
      keepOpen: true,
    },
    { key: 'all', label: t('export.scope.all', { count: allCount }), title: t('export.scope.all.hint'), radio: true, checked: scope === 'all', run: () => props.onScope('all'), keepOpen: true },
    { key: 'copy', label: t('tests.export.copyTop'), title: t('tests.export.copyTop.hint'), run: props.onCopyTop },
    { key: 'csv', label: t('tests.export.csv'), title: t('export.csv.hint'), disabled: empty, run: props.onCsv },
    { key: 'json', label: t('tests.export.json'), title: t('export.json.hint'), disabled: empty, run: props.onJson },
    { key: 'report', label: t('export.report'), title: t('export.report.hint'), disabled: empty, run: props.onReport },
  ];
  // The action that fixes an empty view is one more menu item, placed under the reason.
  const exportAll: Entry = { key: 'exportAll', label: t('export.empty.all'), run: () => props.onScope('all'), keepOpen: true };
  const order = empty ? [...entries.slice(0, 2), exportAll, ...entries.slice(2)] : entries;

  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (p.open) refs.current[0]?.focus();
  }, [p.open]);
  const move = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    refs.current[(i + step + order.length) % order.length]?.focus();
  };
  const button = (it: Entry) => {
    const i = order.indexOf(it);
    return (
      <button
        key={it.key}
        ref={(el) => {
          refs.current[i] = el;
        }}
        type="button"
        role={it.radio ? 'menuitemradio' : 'menuitem'}
        aria-checked={it.radio ? it.checked : undefined}
        aria-disabled={it.disabled || undefined}
        title={it.title}
        onKeyDown={(e) => move(e, i)}
        onClick={async () => {
          if (it.disabled) return;
          await it.run();
          if (it.keepOpen) return;
          p.setOpen(false);
          p.button.current?.focus();
        }}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] ${it.disabled ? 'cursor-not-allowed text-disabled' : 'hover:bg-surface-hover focus:bg-surface-hover'} ${it.radio ? '' : 'font-semibold'}`}
      >
        {it.radio && (
          <span aria-hidden="true" className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full border ${it.checked ? 'border-link' : 'border-input'}`}>
            {it.checked && <span className="size-2 rounded-full bg-link" />}
          </span>
        )}
        {it.label}
      </button>
    );
  };

  return (
    <div ref={p.box} className="relative" onKeyDown={p.onKeyDown}>
      <button
        ref={p.button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={p.open}
        className={`${secondaryButton} h-9 border-input text-[13px]`}
        onClick={() => p.setOpen(!p.open)}
      >
        <Download size={14} aria-hidden="true" />
        {t('tests.export')}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {p.open && (
        <div
          role="menu"
          aria-label={t('tests.export')}
          className="absolute top-full right-0 z-30 mt-1.5 flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-lg border border-border bg-card p-1.5"
        >
          <div role="group" aria-label={t('export.scope')} className="flex flex-col gap-0.5">
            <div aria-hidden="true" className="px-3 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground">
              {t('export.scope')}
            </div>
            {button(entries[0]!)}
            {button(entries[1]!)}
          </div>
          {empty && (
            <div className="flex flex-col gap-0.5 px-3 py-2 text-[13px]">
              <span className="font-semibold">{t('export.empty.title')}</span>
              <span className="text-fg-secondary">{q.trim() ? t('export.empty.body', { q: q.trim() }) : t('export.empty.bodyNoSearch')}</span>
              {button(exportAll)}
            </div>
          )}
          <div role="separator" className="my-1 border-t border-border" />
          {entries.slice(2).map(button)}
        </div>
      )}
    </div>
  );
}
