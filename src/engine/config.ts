// Starting thresholds (spec sections 9.1 and 11). Tune on the flake lab; keep tests in step.
// failingWindow, emaAlpha, maxFileChars and maxSuiteDepth are our own starting values.
export const DEFAULT_CONFIG = {
  failingRate: 0.95,
  failingWindow: 10,
  minAttempts: 3,
  suspectMinAttempts: 5,
  suspectMinFlipRate: 0.2,
  emaAlpha: 0.3,
  wilsonZ: 1.96,
  maxBadShare: 0.5,
  maxFileChars: 50_000_000,
  maxSuiteDepth: 50,
} as const;

export type EngineConfig = { readonly [K in keyof typeof DEFAULT_CONFIG]: number };
