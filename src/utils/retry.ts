import type { RetryOptions } from '@/types/retry.types';

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Run `task`, retrying with exponential backoff (base, 2×base, 4×base, …). */
export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      const canRetry = attempt < options.attempts && (options.shouldRetry?.(error) ?? true);
      if (!canRetry) {
        throw error;
      }
      const delayMs = options.baseDelayMs * 2 ** (attempt - 1);
      options.onRetry?.(error, attempt, delayMs);
      await sleep(delayMs);
    }
  }
}
