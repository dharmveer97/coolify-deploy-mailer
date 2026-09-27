/** Maximum accepted webhook body size. Coolify payloads are well under 2 kB. */
export const MAX_BODY_SIZE = '32kb';

/** Longest commit message shown in an email; longer ones are truncated. */
export const MAX_COMMIT_MESSAGE_LENGTH = 1000;

/** Rate-limit window for the webhook endpoint. */
export const RATE_LIMIT_WINDOW_MS = 60_000;
