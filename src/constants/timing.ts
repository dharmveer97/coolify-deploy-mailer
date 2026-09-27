import type { RetryPolicy } from '@/types/retry.types';

/** Retries for SMTP and Coolify API calls: 2 s, 4 s, 8 s between four attempts. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  attempts: 4,
  baseDelayMs: 2_000,
};

/** A redelivered webhook for the same deployment is ignored for this long. */
export const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
export const DEDUPE_MAX_ENTRIES = 5_000;

/** How long a SIGTERM shutdown may take to finish queued emails. */
export const SHUTDOWN_TIMEOUT_MS = 25_000;

export const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
export const SMTP_SOCKET_TIMEOUT_MS = 20_000;
