import { useId } from 'react';
import { t } from '../copy';
import type { CorrBox } from '../data/full';

// Board 13 "Correlations". Plain words first (the sentence), the numbers second (rate bars with counts), the method last
// (a closed block). The strongest finding is open, other findings are closed; no clear link, not enough data and a missing
// dimension are quiet text boxes. Strength is a word, never a bare p-value. A link is a clue, never a cause.
function Strength({ word }: { word: string }) {
  return <span className="inline-flex h-[22px] items-center rounded-full border border-border px-2 text-xs font-semibold">{word}</span>;
}

function Bars({ box }: { box: CorrBox }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {box.bars.map((b) => (
        <li key={b.value} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-[13px] max-sm:grid-cols-[minmax(0,6rem)_1fr]">
          <span className="min-w-0 truncate" title={b.value}>
            {b.value}
          </span>
          <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <span className={`block h-full rounded-full ${b.highlighted ? 'bg-status-failing' : 'bg-muted-foreground'}`} style={{ width: `${b.pct}%` }} />
          </span>
          <span className="text-muted-foreground tabular-nums max-sm:col-span-2">{b.counts}</span>
        </li>
      ))}
    </ul>
  );
}

function Finding({ box }: { box: CorrBox }) {
  const body = (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm">{box.text}</p>
      <Bars box={box} />
      <details className="text-[13px]">
        <summary className="cursor-pointer font-semibold">{t('corr.how')}</summary>
        <p className="m-0 mt-1.5 text-fg-secondary">{box.how}</p>
      </details>
    </div>
  );
  const name = (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold">{box.label}</span>
      <Strength word={box.strengthLabel!} />
    </span>
  );
  if (box.open)
    return (
      <div data-corr={box.dimension} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        {name}
        {body}
      </div>
    );
  return (
    <details data-corr={box.dimension} className="rounded-lg border border-border bg-card p-4">
      <summary className="cursor-pointer">{name}</summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}

function Quiet({ box }: { box: CorrBox }) {
  const notEnough = box.status === 'notEnough';
  return (
    <div data-corr={box.dimension} className={`flex flex-col gap-1 rounded-lg bg-background px-4 py-3 ${notEnough ? 'border-l-[3px] border-muted-foreground' : ''}`}>
      <span className="text-sm font-semibold">{box.label}</span>
      <span className="text-sm text-fg-secondary">{box.text}</span>
    </div>
  );
}

export function Correlations({ boxes }: { boxes: CorrBox[] }) {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="m-0 text-[17px] font-semibold">
        {t('corr.title')}
      </h2>
      {boxes.map((b) => (b.status === 'finding' ? <Finding key={b.dimension} box={b} /> : <Quiet key={b.dimension} box={b} />))}
    </section>
  );
}
