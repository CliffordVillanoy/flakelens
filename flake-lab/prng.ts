import { hashString } from '../src/engine/hash';

// mulberry32: tiny seeded PRNG, returns floats in [0, 1).
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed per lab run, test title and retry, so a rerun of the lab reproduces every outcome.
export const labRandom = (run: number, title: string, retry: number) =>
  mulberry32(parseInt(hashString(`${run}:${title}:${retry}`).slice(-8), 16));
