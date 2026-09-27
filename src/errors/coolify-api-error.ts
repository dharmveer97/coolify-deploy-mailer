/** A failed Coolify API call. `retryable` is true for network errors, 429 and 5xx. */
export class CoolifyApiError extends Error {
  override readonly name = 'CoolifyApiError';

  constructor(
    message: string,
    readonly status: number | undefined,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}
