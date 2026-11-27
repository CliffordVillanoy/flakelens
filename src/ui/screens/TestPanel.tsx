import { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Copy, X } from 'lucide-react';
import type { Dataset } from '@/engine/types';
import { t } from '../copy';
import { failuresFor, summaryText, wastedText, type Row } from '../data/selectors';
import { FileHeaderBar, LatestFailure, RunHistory, ScoreDetails, StatusNote, type CauseTip } from '../components/PanelParts';
import { useGroupsModule } from '../lib/useGroups';
import { StatusPill } from '../components/StatusPill';
import { secondaryButton } from '../components/buttons';
import { copyText } from '../lib/clipboard';
import { navigate } from '../lib/router';

const iconButton = 'inline-flex size-8 items-center justify-center rounded-md border border-control bg-secondary hover:bg-surface-hover disabled:cursor-not-allowed disabled:text-disabled';

interface Props {
  row: Row;
  ds: Dataset;
  position: { index: number; count: number; prev?: string; next?: string } | null; // index is 1-based; hrefs of neighbours
  closeHref: string;
}

// Board 4 "Test detail": opens beside the list (full screen at 640px and below). Focus moves to the title on
// open (IA section 5); the screen restores it to the row on close.
export function TestPanel({ row, ds, position, closeHref }: Props) {
  const { score, test } = row;
  const title = useRef<HTMLHeadingElement>(null);
  const failures = failuresFor(ds, score.testId);
  const latest = failures.at(-1);
  const attempts = ds.attempts.filter((a) => a.testId === score.testId);
  const passed = attempts.filter((a) => a.status === 'pass').length;
  const failed = attempts.filter((a) => a.status === 'fail').length;
  const wasted = wastedText(score);

  // The likely cause of the group this test's latest failure belongs to (DEV-37). A tip only at medium or high confidence;
  // low and unknown add nothing, and nothing is highlighted.
  const groups = useGroupsModule();
  const cause = useMemo(() => {
    if (!groups || failures.length === 0) return null;
    const group = groups.groupForTest(ds, score.testId);
    if (!group) return null;
    const c = groups.causeOf(ds, group);
    if (c.category === 'unknown' || c.confidence === 'low') return null;
    return { group, category: c.category, level: c.confidence };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, ds, score.testId]);
  const tip: CauseTip | null = cause ? { category: cause.category, level: cause.level, fingerprint: cause.group.fingerprint, count: cause.group.count } : null;
  const highlight = useMemo(
    () => (groups && cause ? (f: { message: string; stack: string }) => groups.evidenceTexts(f, cause.group, cause.category) : undefined),
    [groups, cause],
  );

  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    // The panel opens scrolled to the latest failure.
    document.querySelector('[data-latest-failure]')?.scrollIntoView?.({ block: 'nearest' });
  }, [score.testId]);

  return (
    <aside
      aria-labelledby="panel-title"
      className="test-panel flex max-h-[calc(100vh-24px)] flex-[1_1_520px] flex-col gap-5 self-start overflow-y-auto border-l border-border bg-card px-6 pt-4 pb-6 max-w-[600px] max-sm:max-w-none max-sm:border-l-0 max-sm:px-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label={t('panel.prev')}
            aria-keyshortcuts="k"
            className={iconButton}
            disabled={!position?.prev}
            onClick={() => position?.prev && navigate(position.prev)}
          >
            <ChevronUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={t('panel.next')}
            aria-keyshortcuts="j"
            className={iconButton}
            disabled={!position?.next}
            onClick={() => position?.next && navigate(position.next)}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {position && <span className="text-xs text-muted-foreground">{t('panel.position', { i: position.index, count: position.count })}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className={`${secondaryButton} h-8 px-2.5 text-[13px]`}
            onClick={() => void copyText(summaryText(row, latest), t('panel.copySummary.done'))}
          >
            <Copy size={14} aria-hidden="true" />
            {t('panel.copySummary')}
          </button>
          <a
            href={closeHref}
            aria-label={t('panel.close')}
            title={t('panel.close.hint')}
            aria-keyshortcuts="Escape"
            className={`${iconButton} text-foreground`}
          >
            <X size={16} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 id="panel-title" ref={title} tabIndex={-1} className="m-0 text-xl font-semibold break-words outline-none">
          {test.title}
        </h2>
        <FileHeaderBar file={test.file} project={test.project} passed={passed} failed={failed} />
        <div className="flex flex-wrap items-center gap-2.5">
          <StatusPill label={score.label} />
          {wasted !== t('wasted.none') && (
            <span className="text-[13px] text-fg-secondary">
              {t('panel.wasted.label')} <strong className="text-foreground">{wasted}</strong>
            </span>
          )}
        </div>
        <div className="text-[17px]">{t(row.evidence.key, row.evidence.params)}.</div>
      </div>

      <RunHistory ds={ds} testId={score.testId} />
      <StatusNote row={row} cause={tip} />
      {failures.length > 0 && <LatestFailure key={score.testId} failures={failures} highlight={highlight} />}
      <ScoreDetails row={row} ds={ds} />
    </aside>
  );
}

// Old link or cleared data: say so and offer the way back (IA state table).
export function MissingTest({ listHref }: { listHref: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <aside aria-labelledby="missing-title" className="flex flex-[1_1_520px] flex-col gap-3 self-start rounded-lg border border-border bg-card p-6 max-w-[600px] max-sm:max-w-none">
      <h2 id="missing-title" ref={heading} tabIndex={-1} className="m-0 text-[15px] font-semibold outline-none">
        {t('missing.test.title')}
      </h2>
      <p className="m-0 text-sm text-fg-secondary">{t('missing.test.body')}</p>
      <div>
        <a href={listHref} className={`${secondaryButton} h-9 px-3.5 text-sm text-foreground no-underline`}>
          {t('missing.test.action')}
        </a>
      </div>
    </aside>
  );
}

