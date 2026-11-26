import { DEFAULT_CONFIG, type EngineConfig } from '../config';
import type { CauseConfidence, CauseId, Dataset, EvidenceLine, Failure, FailureGroup } from '../types';
import { orderRuns } from '../view';
import { classifyFailure, type CauseHint } from './classify';

// classifyGroup (DEV-37, board 12): the likely cause of a whole failure group.
//  - It reads up to config.causeSampleSize failures of the group, the LATEST ones (newest run first).
//  - Every sampled failure is classified from its own raw text, not from the group template: numbers are masked in a
//    template, so two different causes can share one group (an "Expected: 0 / Received: 1" and a 503 do).
//  - 'unknown' means no information, not another cause: only the failures where a rule fired vote. The winner is the
//    category most of them voted for; agreement = its share of the MATCHED failures. matchedShare = matched / sampled and
//    unknownShare = the rest. No match at all: unknown, low.
//  - confidence: 'high' needs agreement >= config.causeHighAgreement AND a high-weight winning rule; 'medium' needs
//    agreement >= config.causeMediumAgreement; else 'low'. When matchedShare is under config.causeMinMatched the
//    confidence is capped at 'low' (the UI shows a tip only for medium and high). Unknown is always 'low'.
//  - attemptId is the latest sampled failure that voted for the winner; evidence is quoted from that failure's text.

export interface GroupCause {
  category: CauseId;
  confidence: CauseConfidence;
  evidence: EvidenceLine[];
  attemptId: string;
  agreement: number; // the winner's share of the failures where a rule fired
  matchedShare: number; // failures where a rule fired / failures sampled
  unknownShare: number; // 1 - matchedShare
  hint?: CauseHint;
}

const indexCache = new WeakMap<Failure[], Map<string, Failure>>();
function failureIndex(ds: Dataset): Map<string, Failure> {
  let idx = indexCache.get(ds.failures);
  if (!idx) {
    idx = new Map(ds.failures.map((f) => [f.attemptId, f]));
    indexCache.set(ds.failures, idx);
  }
  return idx;
}

export function classifyGroup(group: FailureGroup, ds: Dataset, config: EngineConfig = DEFAULT_CONFIG): GroupCause {
  const failures = failureIndex(ds);
  const attempts = new Map<string, { runId: string; retryIndex: number }>();
  const wanted = new Set(group.attemptIds);
  for (const a of ds.attempts) if (wanted.has(a.attemptId)) attempts.set(a.attemptId, { runId: a.runId, retryIndex: a.retryIndex });
  const rank = new Map(orderRuns(ds.runs).map((r, i) => [r.runId, i]));

  // newest first: later run, then later retry, then the order they were read (a later failure is later)
  const sample = group.attemptIds
    .map((id, order) => ({ id, order, a: attempts.get(id), f: failures.get(id) }))
    .filter((x): x is { id: string; order: number; a: { runId: string; retryIndex: number }; f: Failure } => !!x.a && !!x.f)
    .sort((x, y) => (rank.get(y.a.runId) ?? 0) - (rank.get(x.a.runId) ?? 0) || y.a.retryIndex - x.a.retryIndex || y.order - x.order)
    .slice(0, config.causeSampleSize);

  if (sample.length === 0) {
    return { category: 'unknown', confidence: 'low', evidence: [], attemptId: group.attemptIds.at(-1) ?? '', agreement: 0, matchedShare: 0, unknownShare: 1 };
  }

  const results = sample.map((s) => ({ s, r: classifyFailure({ message: s.f.message, stack: s.f.stack, environmentEvent: group.environmentEvent }) }));
  const matched = results.filter(({ r }) => r.category !== 'unknown');
  const matchedShare = matched.length / results.length;
  const unknownShare = 1 - matchedShare;
  if (matched.length === 0) return { category: 'unknown', confidence: 'low', evidence: [], attemptId: results[0]!.s.id, agreement: 0, matchedShare, unknownShare };

  const votes = new Map<CauseId, number>();
  for (const { r } of matched) votes.set(r.category, (votes.get(r.category) ?? 0) + 1);
  const winner = [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]!;
  const category = winner[0];
  const agreement = winner[1] / matched.length;

  const rep = matched.find(({ r }) => r.category === category)!; // newest first: the latest that voted for the winner
  let confidence: CauseConfidence = 'low';
  if (agreement >= config.causeHighAgreement && rep.r.topWeight === 'high') confidence = 'high';
  else if (agreement >= config.causeMediumAgreement) confidence = 'medium';
  if (matchedShare < config.causeMinMatched) confidence = 'low';
  const out: GroupCause = { category, confidence, evidence: rep.r.evidence, attemptId: rep.s.id, agreement, matchedShare, unknownShare };
  if (rep.r.hint) out.hint = rep.r.hint;
  return out;
}
