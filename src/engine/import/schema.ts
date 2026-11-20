import { z } from 'zod';

// Each piece is validated on its own, so one bad result never rejects the whole file (spec 9.1).
export const reportSchema = z
  .object({
    config: z.object({}).loose(),
    suites: z.array(z.unknown()),
    stats: z.object({ startTime: z.string().optional() }).loose().optional(),
  })
  .loose();

export const suiteSchema = z
  .object({
    title: z.string().optional(),
    file: z.string().optional(),
    specs: z.array(z.unknown()).optional(),
    suites: z.array(z.unknown()).optional(),
  })
  .loose();

export const specSchema = z
  .object({
    title: z.unknown(),
    file: z.string().optional(),
    tests: z.array(z.unknown()).optional(),
  })
  .loose();

export const testSchema = z
  .object({
    projectName: z.string().optional(),
    results: z.array(z.unknown()).optional(),
  })
  .loose();

const errorSchema = z.object({ message: z.string().optional(), stack: z.string().optional() }).loose();

export const resultSchema = z
  .object({
    status: z.enum(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']),
    retry: z.number().int().nonnegative().optional(),
    duration: z.unknown(),
    error: errorSchema.optional(),
    errors: z.array(errorSchema).optional(),
  })
  .loose();
