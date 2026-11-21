import { useState } from 'react';
import { Lock, Moon, Sun } from 'lucide-react';
import { t } from '../copy';
import { currentTheme, setTheme, type Theme } from '../lib/theme';

export type DataMode = 'none' | 'sample' | 'own';

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md border border-control bg-secondary text-[13px] font-semibold hover:bg-surface-hover';

// Boards 1 and 3: Start shows only the logo and the theme and help buttons; with data loaded the
// privacy line and "Add your files" (sample) or "Add files" (own data) join them.
export function Header({ mode, onAddFiles, onHelp }: { mode: DataMode; onAddFiles?: () => void; onHelp?: () => void }) {
  const [theme, setThemeState] = useState<Theme>(currentTheme);
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
        {mode !== 'none' && (
          <span title={t('header.privacy.hint')} className="inline-flex items-center gap-1.5 text-xs text-status-stable">
            <Lock size={14} aria-hidden="true" />
            <span>{t('header.privacy')}</span>
          </span>
        )}
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
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
          onClick={() => {
            setTheme(next);
            setThemeState(next);
          }}
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
