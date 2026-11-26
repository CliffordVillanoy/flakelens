import { readFileSync } from 'node:fs';

// Ground truth for the lab (DEV-35). `label` is what the engine should say; `cause` is the injected cause, one of the
// spec categories, or null for a test that is not a flake (stable, a real regression, a consistent failure).
export const CAUSES = [
  'timing and waits',
  'order dependency',
  'shared state or data',
  'network or external service',
  'environment or resources',
  'concurrency',
  'locator or UI',
  'time and randomness',
  'infrastructure',
] as const;
export type Cause = (typeof CAUSES)[number];
export interface LabelEntry {
  label: string;
  cause: Cause | null;
}

export const readLabels = (path = 'flake-lab/labels.json'): Record<string, LabelEntry> => JSON.parse(readFileSync(path, 'utf8'));

// A test that runs in a second Playwright project has its own label: "title [project]". The default project has none.
export const labelKey = (title: string, project: string) => (project && project !== 'chromium' ? `${title} [${project}]` : title);

export const labelOf = (labels: Record<string, LabelEntry>): Record<string, string> =>
  Object.fromEntries(Object.entries(labels).map(([k, v]) => [k, v.label]));
