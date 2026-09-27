import { createHash, timingSafeEqual } from 'node:crypto';
import { WEBHOOK_BASE_PATH } from '@/constants/routes';

/**
 * Constant-time string comparison. Both values are hashed first so the comparison takes the
 * same time regardless of length, and length differences don't leak.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

const SECRET_PATH = new RegExp(`^(${WEBHOOK_BASE_PATH}/)[^/?#]+`);

/** Hide the webhook secret wherever a URL is logged. */
export function redactSecretPath(url: string): string {
  return url.replace(SECRET_PATH, '$1[REDACTED]');
}
