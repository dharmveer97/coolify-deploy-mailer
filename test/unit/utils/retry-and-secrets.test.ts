import { describe, expect, it, vi } from 'vitest';
import { withRetry } from '@/utils/retry';
import { redactSecretPath, secretsMatch } from '@/utils/secrets';

describe('secretsMatch', () => {
  it('matches equal secrets only', () => {
    expect(secretsMatch('abc', 'abc')).toBe(true);
    expect(secretsMatch('abd', 'abc')).toBe(false);
    expect(secretsMatch('', 'abc')).toBe(false);
    expect(secretsMatch('abc'.repeat(100), 'abc')).toBe(false);
  });
});

describe('redactSecretPath', () => {
  it.each([
    ['/webhooks/coolify/supersecret', '/webhooks/coolify/[REDACTED]'],
    ['/webhooks/coolify/supersecret?x=1', '/webhooks/coolify/[REDACTED]?x=1'],
    ['/health', '/health'],
  ])('%s → %s', (url, expected) => {
    expect(redactSecretPath(url)).toBe(expected);
  });
});

describe('withRetry', () => {
  const sleep = vi.fn(async () => {});

  it('returns the first successful result', async () => {
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('1'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(task, { attempts: 3, baseDelayMs: 100, sleep })).resolves.toBe('ok');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially and gives up after the last attempt', async () => {
    const onRetry = vi.fn<(error: unknown, attempt: number, delayMs: number) => void>();
    const task = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('down'));

    await expect(
      withRetry(task, { attempts: 4, baseDelayMs: 100, sleep, onRetry }),
    ).rejects.toThrow('down');
    expect(task).toHaveBeenCalledTimes(4);
    expect(onRetry.mock.calls.map(([, , delayMs]) => delayMs)).toEqual([100, 200, 400]);
  });

  it('stops early when shouldRetry says no', async () => {
    const task = vi.fn<() => Promise<never>>().mockRejectedValue(new Error('forbidden'));
    await expect(
      withRetry(task, { attempts: 5, baseDelayMs: 1, sleep, shouldRetry: () => false }),
    ).rejects.toThrow('forbidden');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('waits for real when no sleep function is given', async () => {
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('1'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(task, { attempts: 2, baseDelayMs: 1 })).resolves.toBe('ok');
  });
});
