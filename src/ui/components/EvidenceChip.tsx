import { Quote, TriangleAlert } from 'lucide-react';
import { t } from '../copy';
import type { QuotedLine } from '../data/log';

// Board 13 "Evidence chips". A chip quotes one evidence line and says where it came from. Found in the log: a button that
// jumps to the line (its accessible name is the quote). Not found: a hint only, amber edge, not a button, not highlighted.
// The quote is already masked (evidenceFor), so a secret never reaches the page.
export function EvidenceChip({ quote, onJump }: { quote: QuotedLine; onJump: (line: number) => void }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {quote.found ? <Quote size={12} aria-hidden="true" /> : <TriangleAlert size={12} className="text-status-flaky" aria-hidden="true" />}
        {t(quote.found ? 'evidence.ok' : 'evidence.bad', { n: quote.line })}
      </span>
      <span className="font-mono text-xs break-words text-foreground">{quote.text}</span>
    </>
  );
  const box = 'flex min-w-0 max-w-full flex-col items-start gap-0.5 rounded-md border bg-card px-2.5 py-1.5 text-left';
  if (!quote.found) return <div className={`${box} border-status-flaky`}>{body}</div>;
  return (
    <button type="button" className={`${box} border-border hover:bg-surface-hover`} onClick={() => onJump(quote.line)}>
      {body}
    </button>
  );
}
