import { useSyncExternalStore } from 'react';
import { Database, Moon, Settings, Sun } from 'lucide-react';
import { t } from '../copy';
import { currentTheme, setTheme, subscribeTheme, type Theme } from '../lib/theme';

export type DataMode = 'none' | 'sample' | 'own';

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md border border-control bg-secondary text-[13px] font-semibold hover:bg-surface-hover';

// Boards 1 and 3: Start shows only the logo and the theme and help buttons; with data loaded "Add your files"
// (sample) or "Add files" (own data) joins them. The privacy statement lives on Start, not here (DEV-34).
export function Header({
  mode,
  onAddFiles,
  onHelp,
  attention = false,
  onDataPage = false,
  onSettingsPage = false,
}: {
  mode: DataMode;
  onAddFiles?: () => void;
  onHelp?: () => void;
  onSettingsPage?: boolean; // already on Settings, same pattern as the Loaded data link
  onDataPage?: boolean; // already on Loaded data: its own heading says so, the link would repeat it
  attention?: boolean; // the last import has a warning or error notice: an amber dot on Loaded data
}) {
  const theme: Theme = useSyncExternalStore(subscribeTheme, currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const toggleLabel = t(next === 'light' ? 'header.theme.toLight' : 'header.theme.toDark');

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-2.5 max-sm:px-4">
      <div className="flex flex-wrap items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}brand/flakelens-${theme}.svg`}
          alt={t('app.name')}
          className="block h-7 w-auto"
        />
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        {mode === 'own' && !onDataPage && (
          // The one always-visible way to Loaded data, where Clear all data lives (SPEC: always one click away).
          <a
            href="#/data"
            aria-describedby={attention ? 'data-attention-note' : undefined}
            className="relative inline-flex h-8 items-center gap-1.5 rounded-md bg-transparent px-2.5 text-[13px] font-semibold text-foreground no-underline hover:bg-surface-hover"
          >
            <Database size={14} aria-hidden="true" />
            {t('data.title')}
            {attention && (
              <>
                <span data-attention aria-hidden="true" className="absolute right-1 top-1 size-2 rounded-full bg-status-flaky" />
                <span id="data-attention-note" hidden>
                  {t('import.viewNotices')}
                </span>
              </>
            )}
          </a>
        )}
        {mode !== 'none' && !onSettingsPage && (
          <a
            href="#/settings"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-transparent px-2.5 text-[13px] font-semibold text-foreground no-underline hover:bg-surface-hover"
          >
            <Settings size={14} aria-hidden="true" />
            {t('settings.title')}
          </a>
        )}
        {mode !== 'none' && (
          <button
            type="button"
            onClick={onAddFiles}
            className="h-8 rounded-md bg-primary px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed"
          >
            {t(mode === 'sample' ? 'header.addFiles.sample' : 'header.addFiles')}
          </button>
        )}
        <button
          type="button"
          aria-label={toggleLabel}
          title={toggleLabel}
          className={iconButton}
          onClick={() => setTheme(next)}
        >
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
        <button type="button" aria-label={t('header.help')} className={iconButton} onClick={onHelp}>
          ?
        </button>
      </div>
    </header>
  );
}
