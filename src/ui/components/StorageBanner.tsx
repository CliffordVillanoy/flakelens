import { CircleAlert } from 'lucide-react';
import { t } from '../copy';
import { useStore } from '../data/store';
import { reload } from '../lib/reload';
import { secondaryButton } from './buttons';

// Storage trouble is said plainly and never blocks the page. "off" (private mode or blocked IndexedDB) only
// matters once there is data to lose; "failed" (saved data unreadable) always offers a reload.
export function StorageBanner() {
  const storage = useStore((s) => s.storage);
  const hasData = useStore((s) => s.mode !== 'empty');
  if (storage === 'ok' || (storage === 'off' && !hasData)) return null;
  const failed = storage === 'failed';
  return (
    <div
      role={failed ? 'alert' : 'status'}
      className={`mx-auto mt-4 flex w-[calc(100%-48px)] max-w-[1232px] flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm max-sm:w-[calc(100%-32px)] ${failed ? 'border-danger-border bg-diff-del' : 'border-status-flaky bg-card'}`}
    >
      <CircleAlert size={18} className={`shrink-0 ${failed ? 'text-status-failing' : 'text-status-flaky'}`} aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1">{t(failed ? 'storage.fail' : 'storage.off')}</p>
      {failed && (
        <button type="button" className={`${secondaryButton} h-8 text-[13px]`} onClick={() => reload.now()}>
          {t('storage.reload')}
        </button>
      )}
    </div>
  );
}
