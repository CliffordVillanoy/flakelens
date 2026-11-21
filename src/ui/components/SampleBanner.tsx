import { Info } from 'lucide-react';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { linkButton } from './buttons';

// Sample mode is announced here, and left from here (DESIGN.md, Header actions).
export function SampleBanner({ dataset, onExit }: { dataset: Dataset; onExit: () => void }) {
  const notImported = dataset.imports.reduce((n, i) => n + i.counts.notImported, 0);
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-accent-border bg-accent px-4 py-3 text-sm">
      <Info size={16} className="mt-0.5 shrink-0 text-link" aria-hidden="true" />
      <p className="m-0">
        {t('tests.banner.sample', { tests: dataset.tests.length, runs: dataset.runs.length, count: notImported })}{' '}
        <button type="button" className={linkButton} onClick={onExit}>
          {t('tests.banner.exitSample')}
        </button>
      </p>
    </div>
  );
}
