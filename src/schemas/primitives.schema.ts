import { z } from 'zod';

/** "true" / "false" / "1" / "0" environment values → boolean. */
export const booleanStringSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/** An http(s) URL with any trailing slashes removed. */
export const httpUrlSchema = z
  .url({ protocol: /^https?$/ })
  .transform((value) => value.replace(/\/+$/, ''));

/** "a@x.com, b@y.com" → ["a@x.com", "b@y.com"]; at least one valid address. */
export const emailListSchema = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((address) => address.trim())
      .filter((address) => address !== ''),
  )
  .pipe(z.array(z.email()).min(1, 'At least one recipient is required'));

/** Coolify CUID2 / UUID-like identifiers; restricted before they are used in API paths. */
export const coolifyIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid identifier');

const IP_OR_CIDR = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;

/** "203.0.113.7, 10.0.0.0/8" → ["203.0.113.7", "10.0.0.0/8"]. Empty → []. */
export const ipListSchema = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry !== ''),
  )
  .pipe(z.array(z.string().regex(IP_OR_CIDR, 'Expected an IP address or CIDR range')));

export const portSchema = z.coerce.number().int().min(1).max(65_535);
