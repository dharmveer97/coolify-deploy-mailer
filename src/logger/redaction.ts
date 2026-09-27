/**
 * Log paths whose values are replaced with "[REDACTED]". Covers request headers and any object
 * that carries credentials (SMTP auth, API tokens, webhook secrets), one level deep.
 */
export const REDACTED_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.authorization',
  '*.password',
  '*.pass',
  '*.apiToken',
  '*.token',
  '*.secret',
  '*.auth',
];
