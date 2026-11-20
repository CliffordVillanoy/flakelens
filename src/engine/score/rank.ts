import type { Label, Test, TestScore } from '../types';

const GROUP_ORDER: Label[] = ['flaky', 'suspect', 'failing', 'stable', 'insufficient'];
const MS_PER_MINUTE = 60_000;

// Code-unit compare, not localeCompare: the order must not change with the viewer's locale.
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Spec section 11 default sort: group, then priority (flaky) or score (others), then file, title.
// shortcut: full sort, fine at v0 sizes; switch to a top-K min-heap if lists reach tens of thousands.
export function rankTests(scores: TestScore[], tests: Test[]): TestScore[] {
  const byId = new Map(tests.map((t) => [t.testId, t]));
  const ranked = scores.map((s) => ({ ...s, priority: (s.score / 100) * (s.wastedMs / MS_PER_MINUTE) }));
  return ranked.sort((a, b) => {
    const group = GROUP_ORDER.indexOf(a.label) - GROUP_ORDER.indexOf(b.label);
    if (group !== 0) return group;
    const value = a.label === 'flaky' ? b.priority - a.priority : b.score - a.score;
    if (value !== 0) return value;
    const ta = byId.get(a.testId);
    const tb = byId.get(b.testId);
    return (
      cmp(ta?.file ?? '', tb?.file ?? '') || cmp(ta?.title ?? '', tb?.title ?? '') || cmp(a.testId, b.testId)
    );
  });
}
