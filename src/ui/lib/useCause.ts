import { useMemo } from 'react';
import type { CauseId, Dataset, FailureGroup } from '@/engine/types';
import type { CauseTip } from '../components/PanelParts';
import { useGroupsModule } from './useGroups';

export interface TestCause {
  group: FailureGroup;
  category: CauseId;
  level: 'medium' | 'high';
}

/**
 * The likely cause of the failure group a test's latest failure belongs to (DEV-37). Medium or high confidence only: low
 * and unknown add nothing, so nothing is shown or highlighted. Null until the groups code (its own chunk) has loaded.
 */
export function useCause(ds: Dataset, testId: string, hasFailures: boolean) {
  const groups = useGroupsModule();
  const cause = useMemo((): TestCause | null => {
    if (!groups || !hasFailures) return null;
    const group = groups.groupForTest(ds, testId);
    if (!group) return null;
    const c = groups.causeOf(ds, group);
    if (c.category === 'unknown' || c.confidence === 'low') return null;
    return { group, category: c.category, level: c.confidence };
  }, [groups, ds, testId, hasFailures]);
  const tip: CauseTip | null = cause ? { category: cause.category, level: cause.level, fingerprint: cause.group.fingerprint, count: cause.group.count } : null;
  return { groups, cause, tip };
}
