import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Columns3, Download, X } from 'lucide-react';
import { t, type CopyKey } from '../copy';
import { linkButton, secondaryButton } from './buttons';

// Board 8 "Table controls": filter chips, column picker, density switch and the Export menu.

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

interface MenuItem {
  title: CopyKey;
  hint: CopyKey;
  disabled?: boolean;
  run?: () => void;
}

// DESIGN.md "Export menu". Disabled items stay focusable (so people learn where CSV and JSON will live)
// but do nothing, by mouse or keyboard.
export function ExportMenu({ onCopyTop }: { onCopyTop: () => Promise<void> | void }) {
  const p = usePopover();
  const items: MenuItem[] = [
    { title: 'tests.export.copyTop', hint: 'tests.export.copyTop.hint', run: onCopyTop },
    { title: 'tests.export.csv', hint: 'tests.export.later', disabled: true },
    { title: 'tests.export.json', hint: 'tests.export.later', disabled: true },
  ];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    if (p.open) refs.current[0]?.focus();
  }, [p.open]);
  const move = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    refs.current[(i + step + items.length) % items.length]?.focus();
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
          className="absolute top-full right-0 z-30 mt-1.5 flex w-[294px] flex-col gap-0.5 rounded-lg border border-border bg-card p-1.5"
        >
          {items.map((it, i) => (
            <button
              key={it.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              aria-disabled={it.disabled || undefined}
              onKeyDown={(e) => move(e, i)}
              onClick={async () => {
                if (it.disabled) return;
                await it.run?.();
                p.setOpen(false);
                p.button.current?.focus();
              }}
              className={`flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left ${it.disabled ? 'cursor-not-allowed text-disabled' : 'hover:bg-surface-hover focus:bg-surface-hover'}`}
            >
              <span className="text-[13px] font-semibold">{t(it.title)}</span>
              <span className={`text-xs ${it.disabled ? '' : 'text-muted-foreground'}`}>{t(it.hint)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
