import { SHA } from '@test/support/fixtures';
import { describe, expect, it } from 'vitest';
import { commitWebUrl } from '@/utils/git';

const GITHUB = 'https://github.com';

describe('commitWebUrl', () => {
  it.each([
    ['acme/shop', `https://github.com/acme/shop/commit/${SHA}`],
    ['https://github.com/acme/shop.git', `https://github.com/acme/shop/commit/${SHA}`],
    ['https://user:token@gitlab.com/acme/shop', `https://gitlab.com/acme/shop/commit/${SHA}`],
    ['git@github.com:acme/shop.git', `https://github.com/acme/shop/commit/${SHA}`],
    [
      'ssh://git@git.example.com:2222/acme/shop.git',
      `https://git.example.com/acme/shop/commit/${SHA}`,
    ],
    ['https://bitbucket.org/acme/shop', `https://bitbucket.org/acme/shop/commits/${SHA}`],
    ['http://gitea.internal:3000/acme/shop', `http://gitea.internal:3000/acme/shop/commit/${SHA}`],
  ])('links %s', (repository, expected) => {
    expect(commitWebUrl(repository, SHA, GITHUB)).toBe(expected);
  });

  it('uses the configured base URL for owner/repo sources', () => {
    expect(commitWebUrl('acme/shop', SHA, 'https://git.example.com')).toBe(
      `https://git.example.com/acme/shop/commit/${SHA}`,
    );
  });

  it.each([null, undefined, '', '   ', 'javascript:alert(1)', 'not a url', 'https://github.com'])(
    'returns undefined for %s',
    (repository) => {
      expect(commitWebUrl(repository, SHA, GITHUB)).toBeUndefined();
    },
  );
});
