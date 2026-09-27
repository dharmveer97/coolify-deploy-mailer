import { describe, expect, it } from 'vitest';
import { createIpMatcher } from '@/utils/ip-allowlist';

describe('createIpMatcher', () => {
  const matches = createIpMatcher(['203.0.113.7', '10.0.0.0/8', '2001:db8::/32']);

  it.each([
    ['203.0.113.7', true],
    ['::ffff:203.0.113.7', true],
    ['10.20.30.40', true],
    ['2001:db8::1', true],
    ['203.0.113.8', false],
    ['11.0.0.1', false],
    ['2001:db9::1', false],
    ['not-an-ip', false],
    [undefined, false],
  ])('%s → %s', (ip, expected) => {
    expect(matches(ip)).toBe(expected);
  });

  it('rejects invalid entries at startup', () => {
    expect(() => createIpMatcher(['999.1.1.1'])).toThrow(/Invalid IP address/);
  });
});
