import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { t } from '../copy';
import { setPref } from '../lib/prefs';
import { shortcutsEnabled, shortcutsSheet, useSheetOpen } from '../lib/shortcuts';
import { Modal } from './Modal';

// "j / k: Next / previous test · Enter: Open details · …" from the copy catalog, split into key and meaning.
const KEYS = t('keys.list')
  .split(' · ')
  .map((entry) => {
    const at = entry.indexOf(': ');
    return { key: entry.slice(0, at), text: entry.slice(at + 2) };
  });

// Board 6 state F. The switch uses the saved "shortcuts" preference and works at once: the key handler reads it on every press.
export function ShortcutsSheet() {
  const open = useSheetOpen();
  const id = useId();
  const first = useRef<HTMLInputElement>(null);
  const [on, setOn] = useState(shortcutsEnabled);
  useEffect(() => {
    if (open) setOn(shortcutsEnabled());
  }, [open]);

  return (
    <Modal open={open} onClose={shortcutsSheet.close} labelledBy={`${id}-title`} initialFocus={first}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="m-0 text-xl font-semibold">
            {t('keys.title')}
          </h2>
          <button
            type="button"
            aria-label={t('keys.close')}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
            onClick={shortcutsSheet.close}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          {t('keys.toggle')}
          <input
            ref={first}
            type="checkbox"
            className="m-0 size-4"
            checked={on}
            onChange={(e) => {
              setOn(e.target.checked);
              setPref('shortcuts', e.target.checked);
            }}
          />
        </label>
        <dl className="m-0 grid grid-cols-[70px_1fr] items-baseline gap-x-3 gap-y-1.5 text-sm">
          {KEYS.map((k) => (
            <div key={k.key} className="contents">
              <dt>
                <kbd className="block">{k.key}</kbd>
              </dt>
              <dd className="m-0">{k.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
