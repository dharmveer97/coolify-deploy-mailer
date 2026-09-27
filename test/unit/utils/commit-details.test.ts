import { SHA, SHORT_SHA } from '@test/support/fixtures';
import { describe, expect, it } from 'vitest';
import { buildCommitDetails } from '@/utils/commit-details';

const input = {
  commit: SHA,
  commitMessage: '  fix: thing\r\n\r\nbody  ',
  gitRepository: 'acme/shop',
  gitBranch: 'main',
  isPreview: false,
  gitBaseUrl: 'https://github.com',
};

describe('buildCommitDetails', () => {
  it('builds full details', () => {
    expect(buildCommitDetails(input)).toEqual({
      sha: SHA,
      shortSha: SHORT_SHA,
      url: `https://github.com/acme/shop/commit/${SHA}`,
      branch: 'main',
      message: 'fix: thing\n\nbody',
    });
  });

  it.each(['HEAD', 'not-a-sha', 'abc', `${SHA}; rm -rf /`])('ignores invalid sha %s', (commit) => {
    expect(buildCommitDetails({ ...input, commit })).toMatchObject({
      sha: undefined,
      url: undefined,
    });
  });

  it('omits the branch for preview deployments', () => {
    expect(buildCommitDetails({ ...input, isPreview: true }).branch).toBeUndefined();
  });

  it('truncates very long messages', () => {
    const { message } = buildCommitDetails({ ...input, commitMessage: 'x'.repeat(5000) });
    expect(message).toHaveLength(1001);
    expect(message?.endsWith('…')).toBe(true);
  });
});
