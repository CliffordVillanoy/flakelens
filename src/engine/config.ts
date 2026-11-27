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
  // Failure grouping (DEV-36): two failure templates merge at this shingle similarity; this many distinct tests with one
  // fingerprint in one run make an environment event. Starting values, tuned on the flake lab.
  groupMergeJaccard: 0.8,
  envEventMinTests: 5,
  // Cause classifier (DEV-37): a group is classified from up to causeSampleSize of its failures; the winning category is
  // 'high' confidence at this share of agreement or more (with a strong rule), 'medium' at the second share or more.
  causeSampleSize: 20,
  causeHighAgreement: 0.8,
  causeMediumAgreement: 0.5,
  // Failures where no rule fired carry no information. A group needs at least this share of its sampled failures to
  // match a rule; below it the confidence is capped at low, so the UI shows no cause tip.
  causeMinMatched: 0.5,
  // Correlation (DEV-40): a test needs this many attempts, failures, and attempts in each group before a link is reported;
  // strength is Strong / Moderate at the adjusted p AND the fail-rate difference (0..1) below, Weak at the adjusted p alone.
  corrMinAttempts: 10,
  corrMinFails: 3,
  corrMinGroup: 3,
  corrStrongP: 0.01,
  corrStrongDiff: 0.3,
  corrModerateP: 0.05,
  corrModerateDiff: 0.2,
  corrWeakP: 0.1,
} as const;

export type EngineConfig = { readonly [K in keyof typeof DEFAULT_CONFIG]: number };
