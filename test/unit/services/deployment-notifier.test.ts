import { createTestNotifier, FakeMailer, fakeCoolify } from '@test/support/fakes';
import { COOLIFY_PUBLIC_URL, deploymentPayload, SHA, SHORT_SHA } from '@test/support/fixtures';
import { captureLogger } from '@test/support/logger';
import { describe, expect, it } from 'vitest';
import { CoolifyApiError } from '@/errors/coolify-api-error';

const notify = (success: boolean, failure: boolean) => ({
  gitBaseUrl: 'https://github.com',
  notify: { success, failure },
  coolifyPublicUrl: COOLIFY_PUBLIC_URL,
});

describe('DeploymentNotifier', () => {
  it('verifies the deployment and sends one email built from Coolify data', async () => {
    const coolify = fakeCoolify();
    const { notifier, mailer } = createTestNotifier({ coolify });

    expect(notifier.accept(deploymentPayload())).toBe('queued');
    await notifier.drain();

    expect(coolify.getDeployment).toHaveBeenCalledWith('dep-uuid-1');
    expect(coolify.getApplication).toHaveBeenCalledWith('app-uuid-1');
    expect(mailer.sent).toHaveLength(1);
    const [email] = mailer.sent;
    expect(email?.subject).toBe(`✅ Deployment succeeded: shop-api @ ${SHORT_SHA}`);
    expect(email?.text).toContain(`https://github.com/acme/shop-api/commit/${SHA}`);
    expect(email?.text).toContain('Branch: main');
    expect(email?.text).toContain('Closes #42');
    expect(email?.text).toContain(
      `View deployment logs: ${COOLIFY_PUBLIC_URL}/project/p/environment/e/application/app-uuid-1/deployment/dep-uuid-1`,
    );
  });

  it('ignores a duplicate delivery of the same deployment', async () => {
    const { notifier, mailer } = createTestNotifier();

    expect(notifier.accept(deploymentPayload())).toBe('queued');
    expect(notifier.accept(deploymentPayload())).toBe('duplicate');
    await notifier.drain();

    expect(mailer.sent).toHaveLength(1);
  });

  it('sends a failure email for a failed deployment', async () => {
    const coolify = fakeCoolify({ status: 'failed' });
    const { notifier, mailer } = createTestNotifier({ coolify });

    notifier.accept(deploymentPayload({ event: 'deployment_failed', success: false }));
    await notifier.drain();

    expect(mailer.sent[0]?.subject).toBe(`❌ Deployment failed: shop-api @ ${SHORT_SHA}`);
  });

  it('respects NOTIFY_ON_SUCCESS and NOTIFY_ON_FAILURE', () => {
    expect(
      createTestNotifier({ config: notify(false, true) }).notifier.accept(deploymentPayload()),
    ).toBe('disabled');
    expect(
      createTestNotifier({ config: notify(true, false) }).notifier.accept(
        deploymentPayload({ event: 'deployment_failed', success: false }),
      ),
    ).toBe('disabled');
  });

  it('retries temporary Coolify API errors', async () => {
    const coolify = fakeCoolify();
    coolify.getDeployment.mockRejectedValueOnce(new CoolifyApiError('502', 502, true));
    coolify.getApplication.mockRejectedValueOnce(new Error('socket hang up'));
    const { notifier, mailer } = createTestNotifier({ coolify });

    notifier.accept(deploymentPayload());
    await notifier.drain();

    expect(coolify.getDeployment).toHaveBeenCalledTimes(2);
    expect(coolify.getApplication).toHaveBeenCalledTimes(2);
    expect(mailer.sent).toHaveLength(1);
  });

  it('retries sending when SMTP fails temporarily', async () => {
    const mailer = new FakeMailer();
    mailer.failuresBeforeSuccess = 2;
    const { notifier } = createTestNotifier({ mailer });

    notifier.accept(deploymentPayload());
    await notifier.drain();

    expect(mailer.sent).toHaveLength(1);
  });

  it('lets a later delivery try again when sending fails completely', async () => {
    const { logger, lines } = captureLogger('error');
    const mailer = new FakeMailer();
    mailer.failuresBeforeSuccess = 3;
    const { notifier } = createTestNotifier({ mailer, logger });

    notifier.accept(deploymentPayload());
    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);
    expect(lines.join('\n')).toContain('Failed to send deployment email');

    expect(notifier.accept(deploymentPayload())).toBe('queued');
    await notifier.drain();
    expect(mailer.sent).toHaveLength(1);
  });

  it('shows the pull request and hides the unverifiable preview URL for preview deployments', async () => {
    const coolify = fakeCoolify({ pull_request_id: 5 });
    const { notifier, mailer } = createTestNotifier({ coolify });

    notifier.accept(
      deploymentPayload({ pull_request_id: 5, preview_fqdn: 'https://pr-5.shop.example.com' }),
    );
    await notifier.drain();

    const text = mailer.sent[0]?.text ?? '';
    expect(text).toContain('Pull request: #5');
    expect(text).not.toContain('Open application');
    expect(text).not.toContain('Branch:');
  });

  it('links only the first of several domains', async () => {
    const coolify = fakeCoolify({}, { fqdn: 'https://a.example.com,https://b.example.com' });
    const { notifier, mailer } = createTestNotifier({ coolify });

    notifier.accept(deploymentPayload());
    await notifier.drain();

    expect(mailer.sent[0]?.text).toContain('Open application: https://a.example.com/\n');
  });

  it('falls back to names from the deployment and webhook when the API has none', async () => {
    const coolify = fakeCoolify({ application_name: null }, { name: null });
    const { notifier, mailer } = createTestNotifier({ coolify });

    notifier.accept(deploymentPayload({ application_name: 'from-webhook' }));
    await notifier.drain();

    expect(mailer.sent[0]?.subject).toContain('from-webhook');
  });

  it('drain() resolves immediately when nothing is queued', async () => {
    await expect(createTestNotifier().notifier.drain()).resolves.toBeUndefined();
  });
});
