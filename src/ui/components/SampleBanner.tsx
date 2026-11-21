import { Info, X } from 'lucide-react';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { linkButton } from './buttons';

// Board 3: sample mode is announced here, and left from here (DESIGN.md, Header actions).
export function SampleBanner({ dataset, onExit, onDismiss }: { dataset: Dataset; onExit: () => void; onDismiss: () => void }) {
  const notImported = dataset.imports.reduce((n, i) => n + i.counts.notImported, 0);
  const text = t('tests.banner.sample', { tests: dataset.tests.length, runs: dataset.runs.length, count: notImported });
  const seeWhy = t('tests.banner.sample.seeWhy');
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-accent-border bg-accent px-3.5 py-2.5 text-sm">
      <Info size={18} className="shrink-0 text-link-hover" aria-hidden="true" />
      <p className="m-0 flex-1">
        {/* "(see why)" in the copy opens Loaded data, where the not-imported results are listed (board 3). */}
        {text.split(seeWhy).map((part, i) => (
          <span key={i}>
            {i > 0 && <a href="#/data">{seeWhy}</a>}
            {part}
          </span>
        ))}{' '}
        <button type="button" className={`${linkButton} font-semibold`} onClick={onExit}>
          {t('tests.banner.exitSample')}
        </button>
      </p>
      <button
        type="button"
        aria-label={t('banner.dismiss')}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover"
        onClick={onDismiss}
      >
        <X size={16} className="text-fg-secondary" aria-hidden="true" />
      </button>
    </div>
  );
}
