/** Invalid or missing configuration. The message lists every problem, one per line. */
export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}
