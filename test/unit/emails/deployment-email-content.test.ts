import { SHA, SHORT_SHA } from '@test/support/fixtures';
import { emailData, noCommit } from '@test/unit/emails/fixtures';
import { describe, expect, it } from 'vitest';
import {
  buildActionLinks,
  buildDetailRows,
  buildHeading,
  buildPreviewText,
  buildSubject,
} from '@/emails/deployment-email-content';

describe('deployment email content', () => {
  it('builds success and failure subjects', () => {
    expect(buildSubject(emailData)).toBe(`✅ Deployment succeeded: shop-api @ ${SHORT_SHA}`);
    expect(buildSubject({ ...emailData, success: false })).toBe(
      `❌ Deployment failed: shop-api @ ${SHORT_SHA}`,
    );
    expect(buildSubject({ ...emailData, commit: noCommit })).toBe(
      '✅ Deployment succeeded: shop-api',
    );
  });

  it('mentions the pull request for preview deployments', () => {
    expect(buildHeading({ ...emailData, pullRequestId: 12 })).toBe(
      'Deployment succeeded: shop-api (PR #12)',
    );
  });

  it('keeps the subject on one line', () => {
    expect(
      buildSubject({ ...emailData, applicationName: 'app\r\nBcc: evil@example.com' }),
    ).not.toMatch(/[\r\n]/);
  });

  it('builds a short inbox preview text', () => {
    const preview = buildPreviewText(emailData);
    expect(preview).toBe(`Deployment succeeded: shop-api · ${SHORT_SHA} · fix: handle empty carts`);
    expect(buildPreviewText({ ...emailData, commit: noCommit })).toBe(
      'Deployment succeeded: shop-api',
    );
    expect(
      buildPreviewText({ ...emailData, applicationName: 'x'.repeat(200) }).length,
    ).toBeLessThanOrEqual(90);
  });

  it('lists the details in a fixed order', () => {
    expect(buildDetailRows({ ...emailData, pullRequestId: 3 })).toEqual([
      { label: 'Project', value: 'Shop' },
      { label: 'Environment', value: 'production' },
      { label: 'Branch', value: 'main' },
      { label: 'Pull request', value: '#3' },
      {
        label: 'Commit',
        value: SHORT_SHA,
        href: `https://github.com/acme/shop/commit/${SHA}`,
        monospace: true,
      },
    ]);
  });

  it('skips missing details', () => {
    expect(
      buildDetailRows({
        ...emailData,
        project: undefined,
        environment: undefined,
        commit: noCommit,
      }),
    ).toEqual([]);
  });

  it('drops unsafe links', () => {
    const links = buildActionLinks({ ...emailData, applicationUrl: 'javascript:alert(1)' });
    expect(links).toEqual([
      { label: 'View deployment logs', href: 'https://coolify.example.com/deployment/1' },
      { label: 'Open application', href: undefined },
    ]);
  });
});
