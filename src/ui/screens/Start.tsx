import { useRef, useState } from 'react';
import { CircleX, Lock } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import { DropZone } from '../components/DropZone';
import { ImportProgress } from '../components/ImportProgress';
import { WithCode } from '../components/WithCode';
import { secondaryButton } from '../components/buttons';
import { navigate } from '../lib/router';

// Board 1 (Start, no data) and board 2 states A and C (parsing, failed files). IA flow F1 and F2.
export function Start({ onFiles, onBrowse }: { onFiles: (files: File[]) => void; onBrowse: () => void }) {
  const importing = useStore((s) => s.importing);
  const lastImport = useStore((s) => s.lastImport);
  const importError = useStore((s) => s.importError);
  const cancelImport = useStore((s) => s.cancelImport);
  const startSample = useStore((s) => s.startSample);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleFailed, setSampleFailed] = useState(false);
  const help = useRef<HTMLDetailsElement>(null);

  const failed = lastImport?.records.filter((r) => r.result === 'failed') ?? [];
  const trySample = async () => {
    setLoadingSample(true);
    setSampleFailed(false);
    try {
      await startSample();
      navigate('#/tests');
    } catch {
      setSampleFailed(true); // network error, bad manifest or a missing file: say so and offer Retry
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="flex w-full max-w-[720px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-bold">{t('start.title')}</h1>
          <p className="m-0 text-[15px] text-muted-foreground">{t('start.lead')}</p>
        </div>

        {importing ? (
          <ImportProgress files={importing.files} done={importing.done} onCancel={cancelImport} />
        ) : (
          <DropZone
            onFiles={onFiles}
            onBrowse={onBrowse}
            failed={failed}
            others={(lastImport?.records.length ?? 0) - failed.length}
            error={importError}
            onFormatHelp={() => {
              help.current!.open = true;
              help.current!.scrollIntoView?.({ block: 'nearest' });
              help.current!.querySelector('summary')?.focus();
            }}
          />
        )}

        {/* The sample is the way out for people with no reports: a quiet link under the box, not a second button (DEV-48). */}
        {!importing && failed.length === 0 && !importError && (
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex min-h-6 items-center rounded-sm px-1.5 py-1 text-sm text-link underline underline-offset-2 hover:text-link-hover disabled:cursor-wait disabled:opacity-70"
              onClick={trySample}
              disabled={loadingSample}
              aria-busy={loadingSample}
            >
              {t('start.sample')}
            </button>
          </div>
        )}

        {sampleFailed && (
          <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-md border border-danger-border bg-diff-del p-3 text-sm">
            <CircleX size={18} className="shrink-0 text-status-failing-text" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t('sample.fail')}</span>
            <button type="button" className={`${secondaryButton} h-8 px-3 text-[13px]`} onClick={trySample}>
              {t('sample.retry')}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-status-stable">
          <Lock size={16} aria-hidden="true" />
          {t('start.privacy')}
        </div>

        <details ref={help} open className="py-1">
          <summary className="cursor-pointer text-sm font-semibold">{t('start.help.title')}</summary>
          <div className="mt-3 flex flex-col gap-2.5 text-sm text-fg-secondary">
            <div>{t('start.help.step1')}</div>
            <div className="rounded-md border border-border bg-background px-3 py-2.5">
              <code>{t('start.help.command')}</code>
            </div>
            <div>{t('start.help.step2')}</div>
            <div>{t('start.help.junit')}</div>
            <div>
              <WithCode text={t('start.help.oneRun')} />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
