export interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
}

export interface RetryOptions extends RetryPolicy {
  /** Return false to stop retrying immediately (for errors that will never succeed). */
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
  sleep?: (ms: number) => Promise<void>;
}
