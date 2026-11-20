// true = fail. A flip is a change between neighbouring outcomes.
export function countFlipsNaive(outcomes: boolean[]): number {
  let n = 0;
  for (let i = 1; i < outcomes.length; i++) if (outcomes[i] !== outcomes[i - 1]) n++;
  return n;
}

function popcount(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24) & 0xff;
}

// Bit-packed: JS bitwise ops are 32-bit, so words hold at most 32 outcomes (spec section 10).
export function countFlips(outcomes: boolean[]): number {
  let flips = 0;
  let prevLast: boolean | null = null;
  for (let start = 0; start < outcomes.length; start += 32) {
    const n = Math.min(32, outcomes.length - start);
    let w = 0;
    for (let i = 0; i < n; i++) if (outcomes[start + i]) w |= 1 << i;
    w >>>= 0;
    const mask = n === 32 ? 0x7fffffff : (1 << (n - 1)) - 1;
    flips += popcount(((w ^ (w >>> 1)) & mask) >>> 0);
    const first = outcomes[start]!;
    if (prevLast !== null && prevLast !== first) flips++;
    prevLast = outcomes[start + n - 1]!;
  }
  return flips;
}
