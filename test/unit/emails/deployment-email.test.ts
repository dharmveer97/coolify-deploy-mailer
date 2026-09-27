import { SHA, SHORT_SHA } from '@test/support/fixtures';
import { emailData, noCommit } from '@test/unit/emails/fixtures';
import { describe, expect, it } from 'vitest';
import { renderDeploymentEmail } from '@/emails/render-deployment-email';
import { renderDeploymentEmailText } from '@/emails/templates/deployment-email-text';

function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? '');
}

describe('DeploymentEmail (HTML)', () => {
  it('renders a complete HTML document with all details and links', async () => {
    const { html, subject } = await renderDeploymentEmail(emailData);

    expect(subject).toBe(`✅ Deployment succeeded: shop-api @ ${SHORT_SHA}`);
    expect(html).toMatch(/^<!DOCTYPE html/);
    expect(html).toContain('Deployment succeeded: shop-api');
    for (const text of [
      'Project',
      'Shop',
      'Environment',
      'production',
      'Branch',
      'main',
      SHORT_SHA,
      'Commit message',
    ]) {
      expect(html).toContain(text);
    }
    expect(hrefs(html)).toEqual([
      `https://github.com/acme/shop/commit/${SHA}`,
      'https://coolify.example.com/deployment/1',
      'https://api.shop.example.com/',
    ]);
    expect(html).toMatch(/border-top-color:rgb\(22,163,74\)/i);
  });

  it('renders a red failure email', async () => {
    const { html } = await renderDeploymentEmail({ ...emailData, success: false });
    expect(html).toContain('Deployment failed: shop-api');
    expect(html).toMatch(/border-top-color:rgb\(220,38,38\)/i);
  });

  it('uses pixel units only, since many email clients ignore rem', async () => {
    const { html } = await renderDeploymentEmail(emailData);
    expect(html).not.toMatch(/\d(\.\d+)?rem/);
  });

  it('sets lang and dir on both Html and Body', async () => {
    const { html } = await renderDeploymentEmail(emailData);
    expect(html).toMatch(/<html[^>]*lang="en"[^>]*dir="ltr"|<html[^>]*dir="ltr"[^>]*lang="en"/);
    expect(html).toMatch(/<body[^>]*lang="en"/);
  });

  it('leaves out the commit sections when there is no commit', async () => {
    const { html } = await renderDeploymentEmail({ ...emailData, commit: noCommit });
    expect(html).not.toContain('Commit message');
    expect(html).not.toMatch(/>Commit</);
  });

  it('escapes attacker-controlled names, branches and commit messages', async () => {
    const { html } = await renderDeploymentEmail({
      ...emailData,
      applicationName: '<img src=x onerror=alert(1)>',
      commit: {
        ...emailData.commit,
        branch: '"><script>alert(1)</script>',
        message: '<script>alert("xss")</script>\n[click](javascript:alert(1))',
      },
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
    expect(hrefs(html).some((href) => href.startsWith('javascript:'))).toBe(false);
  });

  it('renders no link row when no link is safe', async () => {
    const { html } = await renderDeploymentEmail({
      ...emailData,
      deploymentUrl: 'javascript:alert(1)',
      applicationUrl: undefined,
    });
    expect(html).not.toContain('View deployment logs');
    expect(html).not.toContain('Open application');
  });

  it('never links unsafe URLs', async () => {
    const { html } = await renderDeploymentEmail({
      ...emailData,
      applicationUrl: 'javascript:alert(1)',
      commit: { ...emailData.commit, url: 'javascript:alert(1)' },
    });

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('Open application');
    expect(html).toContain(SHORT_SHA);
  });
});

describe('renderDeploymentEmailText (plain text)', () => {
  it('matches the HTML content line by line', () => {
    expect(renderDeploymentEmailText(emailData)).toBe(
      [
        'Deployment succeeded: shop-api',
        '',
        'Project: Shop',
        'Environment: production',
        'Branch: main',
        `Commit: ${SHA} (https://github.com/acme/shop/commit/${SHA})`,
        '',
        'Commit message:',
        'fix: handle empty carts\n\nCloses #42',
        '',
        'View deployment logs: https://coolify.example.com/deployment/1',
        'Open application: https://api.shop.example.com/',
        '',
      ].join('\n'),
    );
  });

  it('shows a commit without a link when the repository is unknown', () => {
    const text = renderDeploymentEmailText({
      ...emailData,
      commit: { ...emailData.commit, url: undefined },
    });
    expect(text).toContain(`Commit: ${SHA}\n`);
  });

  it('omits commit lines and missing links', () => {
    const text = renderDeploymentEmailText({
      ...emailData,
      commit: noCommit,
      applicationUrl: undefined,
    });
    expect(text).not.toContain('Commit');
    expect(text).not.toContain('Open application');
  });
});
