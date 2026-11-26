import { useState } from 'react';
import { CircleAlert, X } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import { loadedSummary } from '../data/loaded';
import { navigate } from '../lib/router';
import { reload } from '../lib/reload';
import { ClearDataDialog } from './ClearDataDialog';
import { secondaryButton } from './buttons';
import { toast } from './Toasts';

// Board 11: one banner at a time, in the page flow under the header at the content width. Order: failed (an error,
// role alert, no Dismiss), then skipped rows, then storage off (warnings: Dismiss lasts until the next page load).
export function StorageBanner() {
  const storage = useStore((s) => s.storage);
  const hasData = useStore((s) => s.mode !== 'empty');
  const skipped = useStore((s) => s.skippedRows);
  const dismissed = useStore((s) => s.dismissedBanners);
  const dataset = useStore((s) => s.dataset);
  const [confirming, setConfirming] = useState(false);

  const kind =
    storage === 'failed'
      ? 'failed'
      : storage === 'ok' && skipped > 0
        ? 'skipped'
        : storage === 'off' && hasData
          ? 'off'
          : null;
  const shown = kind !== null && (kind === 'failed' || !dismissed.includes(kind));
  const clear = async () => {
    setConfirming(false);
    await useStore.getState().clearAll();
    navigate('#/');
    toast(t('clear.done'));
  };

  if (!shown || kind === null) return null;
  const failed = kind === 'failed';
  const summary = loadedSummary(dataset);
  return (
    <>
      <div
        role={failed ? 'alert' : 'status'}
        className={`mx-auto mt-4 flex w-[calc(100%-48px)] max-w-[1232px] flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm max-sm:w-[calc(100%-32px)] ${failed ? 'border-danger-border bg-diff-del' : 'border-status-flaky bg-card'}`}
      >
        <CircleAlert size={18} className={`shrink-0 ${failed ? 'text-status-failing-text' : 'text-status-flaky'}`} aria-hidden="true" />
        <p className="m-0 min-w-0 flex-1">
          {kind === 'skipped' ? t('storage.skipped', { count: skipped }) : t(failed ? 'storage.fail' : 'storage.off')}
        </p>
        {failed && (
          <button type="button" className={`${secondaryButton} h-8 text-[13px]`} onClick={() => reload.now()}>
            {t('storage.reload')}
          </button>
        )}
        {kind === 'skipped' && (
          <button type="button" className={`${secondaryButton} h-8 text-[13px]`} onClick={() => setConfirming(true)}>
            {t('storage.skipped.action')}
          </button>
        )}
        {!failed && (
          <button
            type="button"
            aria-label={t('banner.dismiss')}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
            onClick={() => useStore.getState().dismissBanner(kind)}
          >
            <X size={16} className="text-fg-secondary" aria-hidden="true" />
          </button>
        )}
      </div>
      <ClearDataDialog
        open={confirming}
        files={summary.files}
        runs={summary.runs}
        onKeep={() => setConfirming(false)}
        onConfirm={() => void clear()}
      />
    </>
  );
}
