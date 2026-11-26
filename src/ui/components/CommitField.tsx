import { useId, useState } from 'react';
import { CircleAlert, Lock, X } from 'lucide-react';
import { MAX_LABEL } from '@/engine/dataset';
import { t } from '../copy';
import { useStore } from '../data/store';
import type { FileRow } from '../data/loaded';
import { primaryButton, secondaryButton, linkButton } from './buttons';

type Source = 'readonly' | 'user' | 'report' | 'none';

// Board 9: the field that says which commit a file belongs to. Files with the same label count as one commit.
export function CommitField({ f, readOnly }: { f: FileRow; readOnly: boolean }) {
  const id = useId();
  const setLabel = useStore((s) => s.setCommitLabel);
  const failed = useStore((s) => s.labelFailed.includes(f.importId));
  const [draft, setDraft] = useState<string | null>(null);
  const [done, setDone] = useState<'saved' | 'removed' | null>(null);

  const source: Source = readOnly ? 'readonly' : f.label !== null ? 'user' : f.commit !== null ? 'report' : 'none';
  const saved = f.label ?? '';
  const value = readOnly ? (f.commit ?? '') : (draft ?? saved);
  const editing = draft !== null && draft !== saved;

  const save = async (next: string) => {
    setDraft(null);
    setDone(next.trim() === '' ? 'removed' : 'saved');
    await setLabel(f.importId, next);
  };
  const cancel = () => {
    setDraft(null);
    setDone(null);
  };

  return (
    <div className="flex basis-full flex-col gap-1.5" data-commit-field>
      <div className="flex items-center justify-between gap-2 text-xs">
        <label htmlFor={id} className="font-semibold">
          {t('files.commit.label')}
        </label>
        <span className={source === 'none' ? 'text-status-flaky-text' : 'text-muted-foreground'}>{t(`files.commit.source.${source}`)}</span>
      </div>
      <div className="relative">
        {readOnly && <Lock size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        <input
          id={id}
          type="text"
          data-source={source}
          value={value}
          readOnly={readOnly}
          maxLength={MAX_LABEL}
          placeholder={f.reportCommit ?? t('files.commit.empty')}
          aria-describedby={`${id}-keys`}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setDraft(e.target.value);
            setDone(null);
          }}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === 'Enter') {
              e.preventDefault();
              if (editing) void save(value);
            } else if (e.key === 'Escape' && editing) {
              e.preventDefault();
              e.stopPropagation();
              cancel();
            }
          }}
          className={`box-border h-9 w-full rounded-md border border-control px-2.5 font-mono text-[13px] focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary ${
            readOnly ? 'bg-surface pl-8 text-muted-foreground' : 'bg-background'
          } ${source === 'user' && !editing ? 'pr-9' : ''}`}
        />
        <span id={`${id}-keys`} className="sr-only">
          {t('files.commit.keys')}
        </span>
        {!readOnly && !editing && f.label !== null && (
          <button
            type="button"
            aria-label={t('files.commit.remove')}
            className="absolute right-1.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md hover:bg-surface-hover"
            onClick={() => void save('')}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={`${primaryButton} h-8 text-[13px]`} onClick={() => void save(value)}>
            {t('files.commit.save')}
          </button>
          <button type="button" className={`${secondaryButton} h-8 text-[13px]`} onClick={cancel}>
            {t('files.commit.cancel')}
          </button>
          <span className={`ml-auto text-xs tabular-nums ${value.length >= MAX_LABEL ? 'text-status-failing-text' : 'text-muted-foreground'}`}>
            {t('files.commit.counter', { n: value.length })}
          </span>
        </div>
      )}
      {value.length >= MAX_LABEL && !readOnly && <div className="text-xs text-status-failing-text">{t('files.commit.tooLong')}</div>}

      {source === 'none' && !editing && (
        <div className="flex items-start gap-1.5 text-xs text-status-flaky-text">
          <CircleAlert size={14} aria-hidden="true" className="mt-px shrink-0" />
          {t('files.commit.hint.none')}
        </div>
      )}
      {source === 'readonly' && <div className="text-xs text-muted-foreground">{t('files.commit.readonly')}</div>}
      {source === 'user' && f.sharedWith > 0 && (
        <div className="text-xs text-muted-foreground">{t('files.commit.hint.shared', { count: f.sharedWith })}</div>
      )}

      <div role="status" className="text-xs text-status-stable-text empty:hidden">
        {done && !failed ? t(done === 'saved' ? 'files.commit.saved' : 'files.commit.removed') : null}
      </div>
      {failed && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive bg-status-failing-subtle px-3 py-2 text-xs text-status-failing-text">
          <span className="min-w-0 flex-1">{t('files.commit.saveFailed')}</span>
          <button type="button" className={`${linkButton} text-xs font-semibold`} onClick={() => void save(saved)}>
            {t('files.commit.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
