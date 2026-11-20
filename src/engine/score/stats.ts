// Wilson score interval lower bound; 0 when there is no evidence.
export function wilsonLower(successes: number, trials: number, z: number): number {
  if (trials === 0) return 0;
  const p = successes / trials;
  const z2 = z * z;
  const centre = p + z2 / (2 * trials);
  const margin = z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return Math.min(1, Math.max(0, (centre - margin) / (1 + z2 / trials)));
}

// Exponential moving average, seeded with the first value.
export function ema(values: number[], alpha: number): number {
  if (values.length === 0) return 0;
  let e = values[0]!;
  for (let i = 1; i < values.length; i++) e = alpha * values[i]! + (1 - alpha) * e;
  return e;
}
