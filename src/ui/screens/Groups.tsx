import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Zap, ChevronDown } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { redactSecrets } from '@/engine/group/normalize';
import type { CauseId, Dataset } from '@/engine/types';
import { t, type CopyKey } from '../copy';
import { useStore } from '../data/store';
import { causeOf, filterGroupCards, groupsView, parseSort, sortGroupCards, splitTemplate, GROUP_SORTS, type GroupCard } from '../data/groups';
import { EmptyState } from '../components/EmptyState';
import { ViewTabs } from '../components/ViewTabs';
import { secondaryButton } from '../components/buttons';
import { navigate, useRoute } from '../lib/router';

const SHOWN_TESTS = 3;
const SHOWN_EVIDENCE = 2;
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

const hashFor = (q: string, sort: string, g?: string) => {
  const p = new URLSearchParams();
  if (q.trim() !== '') p.set('q', q);
  if (sort !== 'failures') p.set('sort', sort);
  if (g) p.set('g', g);
  const s = p.toString();
  return s ? `#/groups?${s}` : '#/groups';
};

// The masked template in mono; masked values are small grey tags so you can see what was replaced.
function Template({ text }: { text: string }) {
  return (
    <div data-template className="font-mono text-[13px] leading-5 break-words whitespace-pre-wrap">
      {splitTemplate(text).map((part, i) =>
        part.tag ? (
          <span key={i} data-tag={part.tag} className="mx-px rounded-[4px] bg-surface-hover px-1 text-[12px] text-muted-foreground">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </div>
  );
}

// Board 12: one card per group. The cause and its evidence are worked out here, so only the cards on screen pay for it.
function GroupCardView({ card, ds, focused }: { card: GroupCard; ds: Dataset; focused: boolean }) {
  const { group } = card;
  const cause = useMemo(() => causeOf(ds, group), [ds, group]);
  const [allTests, setAllTests] = useState(false);
  const [allEvidence, setAllEvidence] = useState(false);
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused) ref.current?.focus({ preventScroll: true });
  }, [focused]);

  const known = cause.category !== 'unknown';
  const evidence = known ? cause.evidence : [];
  const cut = group.normalized.length > group.template.length;
  const text = redactSecrets(full ? group.normalized : group.template);
  const tests = allTests ? card.tests : card.tests.slice(0, SHOWN_TESTS);
  const shownEvidence = allEvidence ? evidence : evidence.slice(0, SHOWN_EVIDENCE);
  const level = t(`groups.level.${cause.confidence}` as CopyKey);
  const date = card.lastSeen ? day.format(new Date(card.lastSeen)) : t('wasted.none');
  const event = card.event;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      data-group={group.fingerprint}
      className={`flex flex-col gap-3 rounded-lg border p-4 outline-none focus-visible:outline-2 focus-visible:outline-primary ${event ? 'border-accent-border bg-accent' : 'border-border bg-card'}`}
    >
      {event && (
        <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold">
          <Zap size={16} aria-hidden="true" className="shrink-0 text-link" />
          {t('groups.env.title', { count: event.tests, run: event.run })}
        </h2>
      )}
      <Template text={text} />
      {cut && (
        <div>
          <button
            type="button"
            className={`${secondaryButton} h-8 px-2.5 text-[13px]`}
            aria-expanded={full}
            title={t('groups.long.note')}
            onClick={() => setFull(!full)}
          >
            {full ? t('groups.long.hide') : t('groups.long.show')}
          </button>
        </div>
      )}
      {!event && (
        <div className="text-[13px] text-muted-foreground">
          {t('groups.meta', { failures: group.count, tests: card.tests.length, date })}
        </div>
      )}
      <div>
        <span data-chip className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-control px-2.5 py-0.5 text-[13px]">
          <Zap size={13} aria-hidden="true" className="shrink-0" />
          {known ? (
            <>
              <span className="font-semibold">{t('groups.chip', { cause: t(`cause.${cause.category}` as CopyKey) })}</span>
              <span className="text-muted-foreground">· {t('groups.chip.confidence', { level })}</span>
            </>
          ) : (
            <span className="font-semibold">{t('groups.chip.unknown')}</span>
          )}
        </span>
      </div>
      {evidence.length > 0 && (
        <div data-evidence className="flex flex-col gap-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px] leading-5">
          <span className="sr-only">{t('groups.evidence')}</span>
          {shownEvidence.map((e) => (
            <div key={e.line} data-evidence-line className="grid grid-cols-[28px_1fr] gap-2">
              <span className="text-right text-muted-foreground">{e.line}</span>
              <span className="min-w-0 break-words whitespace-pre-wrap">
                <mark className="bg-selection text-foreground underline decoration-dotted underline-offset-2">{redactSecrets(e.text)}</mark>
              </span>
            </div>
          ))}
          {evidence.length > SHOWN_EVIDENCE && (
            <div>
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-sans text-[13px] font-semibold text-link hover:underline"
                aria-expanded={allEvidence}
                onClick={() => setAllEvidence(!allEvidence)}
              >
                {allEvidence ? t('groups.evidence.less') : t('groups.evidence.more', { count: evidence.length })}
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
        {tests.map((x) => (
          <a key={x.testId} href={`#/tests/${encodeURIComponent(x.testId)}`} className="break-all">
            {x.title}
          </a>
        ))}
        {card.tests.length > SHOWN_TESTS && (
          <button
            type="button"
            className={`${secondaryButton} h-8 px-2.5 text-[13px]`}
            aria-expanded={allTests}
            onClick={() => setAllTests(!allTests)}
          >
            {allTests ? t('groups.hideTests') : t('groups.showTests', { count: card.tests.length })}
          </button>
        )}
      </div>
    </div>
  );
}

// Board 12: failures that read the same once numbers, ids and paths are masked, with a likely cause for each.
export function Groups() {
  const route = useRoute();
  const { dataset: ds, ranked } = useStore();
  const urlQ = route.query.get('q') ?? '';
  const sort = parseSort(route.query.get('sort'));
  const focusG = route.query.get('g');
  const [q, setQ] = useState(urlQ);
  useEffect(() => setQ(urlQ), [urlQ]);

  const view = useMemo(() => groupsView(ds), [ds]);
  const filtered = useMemo(() => filterGroupCards(view.cards, urlQ), [view, urlQ]);
  const items = useMemo(() => sortGroupCards(filtered, sort), [filtered, sort]);

  const scroller = useRef<HTMLDivElement>(null);
  const v = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 190,
    measureElement: (el) => Math.round(el.getBoundingClientRect().height) || 190,
    getItemKey: (i) => items[i]!.group.fingerprint,
    overscan: 4,
    initialRect: { width: 1200, height: 800 },
  });

  // A link from the detail panel (?g=): scroll to that card and put focus on it.
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    if (!focusG) return setFocused(null);
    const at = items.findIndex((c) => c.group.fingerprint === focusG);
    if (at === -1) return;
    v.scrollToIndex(at, { align: 'start' });
    setFocused(focusG);
  }, [focusG, items]);

  const hasFailures = view.cards.length > 0;
  const setSearch = (next: string) => {
    setQ(next);
    navigate(hashFor(next, sort), { replace: true });
  };

  return (
    <div className="pg mx-auto flex w-full max-w-[1232px] flex-col gap-3.5 px-6 py-4">
      <ViewTabs active="groups" tests={ranked.length} groups={filtered.length} />
      <h1 className="m-0 text-xl font-semibold">{t('groups.title')}</h1>
      {!hasFailures ? (
        <EmptyState title={t('groups.empty.title')} body={t('groups.empty.body')} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-9 flex-[1_1_280px] items-center gap-2 rounded-md border border-input bg-card px-2.5 focus-within:border-link">
              <Search size={16} className="text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">{t('groups.search')}</span>
              <input
                type="search"
                value={q}
                placeholder={t('groups.search')}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="relative inline-flex h-9 items-center">
              <span className="sr-only">{t('groups.sort.label')}</span>
              <select
                value={sort}
                aria-label={t('groups.sort.label')}
                onChange={(e) => navigate(hashFor(q, e.target.value))}
                className="h-9 cursor-pointer appearance-none rounded-md border border-control bg-secondary pr-8 pl-3 text-[13px] font-semibold"
              >
                {GROUP_SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`groups.sort.${s}` as CopyKey)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5" />
            </label>
          </div>
          {items.length === 0 ? (
            <EmptyState title={t('groups.noMatch.title', { q: urlQ.trim() })} body={t('groups.noMatch.body')}>
              <button type="button" className={`${secondaryButton} h-9 px-3.5 text-sm`} onClick={() => navigate(hashFor('', sort))}>
                {t('groups.noMatch.clear')}
              </button>
            </EmptyState>
          ) : (
            <div ref={scroller} id="results" tabIndex={-1} className="max-h-[calc(100vh-190px)] overflow-auto rounded-lg">
              <ul aria-label={t('groups.list')} className="relative m-0 list-none p-0" style={{ height: v.getTotalSize() }}>
                {v.getVirtualItems().map((x) => {
                  const card = items[x.index]!;
                  return (
                    <li
                      key={x.key}
                      ref={v.measureElement}
                      data-index={x.index}
                      className="absolute top-0 left-0 w-full pb-3"
                      style={{ transform: `translateY(${x.start}px)` }}
                    >
                      <GroupCardView card={card} ds={ds} focused={focused === card.group.fingerprint} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const causeName = (c: CauseId) => t(`cause.${c}` as CopyKey);
