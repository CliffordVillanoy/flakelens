import { useEffect, useState } from 'react';

// The failure-group code (grouping and the cause rules) is its own chunk: the main bundle stays under its size limit, and
// the Tests screen only asks for it after it has drawn. Until it has loaded the hook returns null.
type GroupsModule = typeof import('../data/groups');
let loaded: GroupsModule | null = null;

export function useGroupsModule(): GroupsModule | null {
  const [mod, setMod] = useState<GroupsModule | null>(loaded);
  useEffect(() => {
    if (loaded) return;
    let alive = true;
    void import('../data/groups').then((m) => {
      loaded = m;
      if (alive) setMod(m);
    });
    return () => {
      alive = false;
    };
  }, []);
  return mod;
}
