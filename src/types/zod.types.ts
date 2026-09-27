import type { z } from 'zod';

/** A Zod schema that parses to `T`. Lets services accept schemas without importing Zod. */
export type Schema<T> = z.ZodType<T>;

/** A single validation problem reported by Zod. */
export type ValidationIssue = z.core.$ZodIssue;
