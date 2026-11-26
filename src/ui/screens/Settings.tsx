import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { DEFAULT_CONFIG } from '@/engine/config';
import { t } from '../copy';
import { useStore } from '../data/store';
import { loadedSummary } from '../data/loaded';
import { ClearDataDialog } from '../components/ClearDataDialog';
import { toast } from '../components/Toasts';
import { dangerButton } from '../components/buttons';
import { getPref, setPref } from '../lib/prefs';
import { navigate } from '../lib/router';
import { currentTheme, setTheme, subscribeTheme, type Theme } from '../lib/theme';
import { version } from '../../../package.json'; // a named import: the rest of package.json is left out of the build

const REPO = 'https://github.com/CliffordVillanoy/flakelens';
const LINKS = [
  { key: 'settings.about.source', href: REPO },
  { key: 'settings.about.report', href: `${REPO}/issues/new/choose` },
  { key: 'settings.about.security', href: `${REPO}/security/policy` },
  { key: 'settings.about.license', href: `${REPO}/blob/main/LICENSE` },
] as const;

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`s-${title}`} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h2 id={`s-${title}`} className="m-0 text-[17px] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, id, children, title }: { label: string; id: string; children: ReactNode; title?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" title={title}>
      <span id={id} className="text-sm">
        {label}
      </span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; text: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-md border border-input bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded-sm px-3 text-[13px] ${value === o.value ? 'bg-selection font-semibold text-link-hover' : 'hover:bg-surface-hover'}`}
        >
          {o.text}
        </button>
      ))}
    </div>
  );
}

// Board 10, state 1: one 720px column of boxed sections. Choices save the moment they change.
export function Settings() {
  const { dataset: ds, mode } = useStore();
  const theme: Theme = useSyncExternalStore(subscribeTheme, currentTheme);
  const [density, setDensityState] = useState<'comfortable' | 'compact'>(() => (getPref<string>('density', 'comfortable') === 'compact' ? 'compact' : 'comfortable'));
  const [shortcuts, setShortcuts] = useState(() => getPref<boolean>('shortcuts', true) !== false);
  const [confirming, setConfirming] = useState(false);
  const summary = loadedSummary(ds);
  const empty = ds.imports.length === 0;
  const c = DEFAULT_CONFIG;

  const clear = async () => {
    setConfirming(false);
    await useStore.getState().clearAll();
    navigate('#/');
    toast(t('clear.done'));
  };

  const rules: { name: string; config: string; text: string }[] = [
    { name: t('status.failing'), config: 'failingRate', text: t('settings.rules.failing', { rate: Math.round(c.failingRate * 100), window: c.failingWindow }) },
    {
      name: t('status.suspect'),
      config: 'suspectMinFlipRate',
      text: t('settings.rules.unproven', { min: c.suspectMinAttempts, flips: Math.round(c.suspectMinFlipRate * c.failingWindow), window: c.failingWindow }),
    },
    { name: t('status.insufficient'), config: 'minAttempts', text: t('settings.rules.insufficient', { min: c.minAttempts }) },
    { name: t('settings.rules.rejected.name'), config: 'maxBadShare', text: t('settings.rules.rejected') },
  ];

  return (
    <div className="pg mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
      <div className="flex flex-col gap-1.5">
        <a href={mode === 'empty' ? '#/' : '#/tests'} className="inline-flex min-h-6 items-center gap-1 self-start text-[13px]">
          <ArrowLeft size={14} aria-hidden="true" />
          {t('settings.back')}
        </a>
        <h1 className="m-0 text-2xl font-bold">{t('settings.title')}</h1>
      </div>

      <Section title={t('settings.appearance')}>
        <Row label={t('settings.theme')} id="theme-label">
          <Segmented
            label={t('settings.theme')}
            value={theme}
            options={[
              { value: 'dark', text: t('settings.theme.dark') },
              { value: 'light', text: t('settings.theme.light') },
            ]}
            onChange={setTheme}
          />
        </Row>
        <Row label={t('tests.density')} id="density-label">
          <Segmented
            label={t('tests.density')}
            value={density}
            options={[
              { value: 'compact', text: t('tests.density.compact') },
              { value: 'comfortable', text: t('tests.density.comfortable') },
            ]}
            onChange={(d) => {
              setDensityState(d);
              setPref('density', d);
            }}
          />
        </Row>
        <Row label={t('settings.shortcuts')} id="shortcuts-label" title={t('settings.shortcuts.tip')}>
          <button
            type="button"
            role="switch"
            aria-checked={shortcuts}
            aria-labelledby="shortcuts-label"
            onClick={() => {
              setShortcuts(!shortcuts);
              setPref('shortcuts', !shortcuts);
            }}
            className={`relative h-5 w-9 shrink-0 rounded-full border ${shortcuts ? 'border-primary bg-primary' : 'border-control bg-transparent'}`}
          >
            <span className={`absolute top-0.5 size-3.5 rounded-full transition-[left] ${shortcuts ? 'left-[18px] bg-white' : 'left-0.5 bg-muted-foreground'}`} />
          </button>
        </Row>
      </Section>

      <Section title={t('settings.rules.title')}>
        <p className="m-0 text-sm">{t('settings.rules.note')}</p>
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-link">{t('settings.rules.show')}</summary>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0 text-sm">
            {rules.map((r) => (
              <li key={r.config} title={r.config}>
                <span className="font-semibold">{r.name}</span>
                {' · '}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        </details>
      </Section>

      <Section title={t('settings.data.title')}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm">
            {t('data.summary', { files: summary.files, runs: summary.runs, date: summary.lastAdded ? day.format(new Date(summary.lastAdded)) : t('wasted.none') })}
          </span>
          <button type="button" disabled={empty} className={`${dangerButton} h-9 text-sm`} onClick={() => setConfirming(true)}>
            {t('data.remove.action')}
          </button>
        </div>
      </Section>

      <Section title={t('settings.about.title')}>
        <div className="text-sm font-semibold">{t('settings.about.version', { version })}</div>
        <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm">
          {LINKS.map((l) => (
            <li key={l.key}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                {t(l.key)}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <ClearDataDialog open={confirming} files={summary.files} runs={summary.runs} onKeep={() => setConfirming(false)} onConfirm={() => void clear()} />
    </div>
  );
}
