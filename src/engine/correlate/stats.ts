// Exact statistics for the correlation check (DEV-40). No dependency: log factorials for Fisher, a regularised gamma for chi-square.

const LOG_FACT: number[] = [0, 0];
/** ln(n!), from a table that grows as needed. n must be a non-negative integer. */
export function logFactorial(n: number): number {
  for (let i = LOG_FACT.length; i <= n; i++) LOG_FACT.push(LOG_FACT[i - 1]! + Math.log(i));
  return LOG_FACT[n]!;
}

// Cells of a 2x2 table: a, b on the first row, c, d on the second. A hypergeometric probability in log form.
const logProb = (a: number, b: number, c: number, d: number): number =>
  logFactorial(a + b) + logFactorial(c + d) + logFactorial(a + c) + logFactorial(b + d) - logFactorial(a + b + c + d) - logFactorial(a) - logFactorial(b) - logFactorial(c) - logFactorial(d);

const LOG_TIE = 1e-7; // tables whose probability equals the observed one (to rounding) count as no more likely

/** Two-sided Fisher exact p for the 2x2 table [[a, b], [c, d]]: the summed probability of every table with the same margins that is no more likely than this one. */
export function fisherExact(a: number, b: number, c: number, d: number): number {
  const r1 = a + b, r2 = c + d, c1 = a + c;
  if (r1 + r2 === 0) return 1;
  const observed = logProb(a, b, c, d);
  let p = 0;
  const hi = Math.min(r1, c1);
  for (let x = Math.max(0, c1 - r2); x <= hi; x++) {
    const lp = logProb(x, r1 - x, c1 - x, r2 - c1 + x);
    if (lp <= observed + LOG_TIE) p += Math.exp(lp);
  }
  return Math.min(1, p);
}

/** Odds of failing in the first row against the second, each cell raised by 0.5 so an empty cell does not give 0 or infinity. */
export const oddsRatio = (a: number, b: number, c: number, d: number): number => ((a + 0.5) * (d + 0.5)) / ((b + 0.5) * (c + 0.5));

// ln Gamma(z), Lanczos (g = 7, 9 terms): good to about 1e-15 for z > 0.
const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const x = z - 1;
  let s = LANCZOS[0]!;
  for (let i = 1; i < 9; i++) s += LANCZOS[i]! / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

const GAMMA_ITER = 500; // both series converge far sooner for the sizes used here; the cap keeps the loop bounded
/** Regularised upper incomplete gamma Q(a, x): the chance of a value this large or larger. */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const lead = -x + a * Math.log(x) - logGamma(a);
  if (x < a + 1) {
    let term = 1 / a, sum = term;
    for (let n = 1; n < GAMMA_ITER; n++) {
      term *= x / (a + n);
      sum += term;
      if (term < sum * 1e-16) break;
    }
    return Math.max(0, 1 - sum * Math.exp(lead));
  }
  const tiny = 1e-300;
  let b = x + 1 - a, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < GAMMA_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-16) break;
  }
  return Math.min(1, Math.exp(lead) * h);
}

/** Chance of a chi-square value at least x with df degrees of freedom. */
export const chiSquareSurvival = (x: number, df: number): number => gammaQ(df / 2, x / 2);

export interface ChiSquare {
  statistic: number;
  df: number;
  p: number;
}

const MIN_EXPECTED = 5;
/**
 * Chi-square test of independence for a table with one row per value and two columns, [failed, passed].
 * Null (skipped) when there are fewer than two rows, a row or column is empty, or any expected count is below 5.
 */
export function chiSquareTable(rows: ReadonlyArray<readonly [number, number]>): ChiSquare | null {
  if (rows.length < 2) return null;
  let failed = 0, passed = 0;
  for (const [f, p] of rows) {
    if (f + p === 0) return null;
    failed += f;
    passed += p;
  }
  if (failed === 0 || passed === 0) return null;
  const n = failed + passed;
  let statistic = 0;
  for (const [f, p] of rows) {
    const eF = ((f + p) * failed) / n;
    const eP = ((f + p) * passed) / n;
    if (eF < MIN_EXPECTED || eP < MIN_EXPECTED) return null;
    statistic += (f - eF) ** 2 / eF + (p - eP) ** 2 / eP;
  }
  const df = rows.length - 1;
  return { statistic, df, p: chiSquareSurvival(statistic, df) };
}
