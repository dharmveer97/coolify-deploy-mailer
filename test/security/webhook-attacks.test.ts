import {
  createTestNotifier,
  type FakeCoolify,
  type FakeMailer,
  fakeCoolify,
} from '@test/support/fakes';
import { deploymentPayload, SECRET, WEBHOOK_PATH } from '@test/support/fixtures';
import { captureLogger } from '@test/support/logger';
import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import { CoolifyApiError } from '@/errors/coolify-api-error';
import type { DeploymentNotifier } from '@/services/deployment-notifier';

/**
 * Attacks on the webhook. The assumption for most of these: the attacker has learned the
 * secret URL (the worst case) and tries to abuse it.
 */
interface Target {
  app: Express;
  notifier: DeploymentNotifier;
  mailer: FakeMailer;
  coolify: FakeCoolify;
  logs: string[];
}

function target(
  options: { coolify?: FakeCoolify; allowedIps?: string[]; trustProxy?: boolean } = {},
): Target {
  const { logger, lines } = captureLogger();
  const coolify = options.coolify ?? fakeCoolify();
  const { notifier, mailer } = createTestNotifier({ coolify, logger });
  const app = createApp({
    logger,
    notifier,
    webhook: { secret: SECRET, rateLimitPerMinute: 1000, allowedIps: options.allowedIps ?? [] },
    trustProxy: options.trustProxy ?? false,
  });
  return { app, notifier, mailer, coolify, logs: lines };
}

describe('with a leaked secret', () => {
  it('a made-up deployment sends no email', async () => {
    const coolify = fakeCoolify();
    coolify.getDeployment.mockRejectedValue(new CoolifyApiError('404', 404, false));
    const { app, notifier, mailer, logs } = target({ coolify });

    const response = await request(app)
      .post(WEBHOOK_PATH)
      .send(deploymentPayload({ deployment_uuid: 'forged' }));
    await notifier.drain();

    expect(response.status).toBe(202); // the attacker learns nothing from the response
    expect(mailer.sent).toHaveLength(0);
    expect(logs.join('\n')).toContain('deployment-not-found');
  });

  it('a real deployment claimed for another application sends no email', async () => {
    const { app, notifier, mailer } = target({
      coolify: fakeCoolify({ application: { uuid: 'victim-app' } }),
    });

    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    await notifier.drain();

    expect(mailer.sent).toHaveLength(0);
  });

  it('a "success" webhook for a failed deployment sends no email', async () => {
    const { app, notifier, mailer } = target({ coolify: fakeCoolify({ status: 'failed' }) });

    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    await notifier.drain();

    expect(mailer.sent).toHaveLength(0);
  });

  it('phishing links in the body never reach the email', async () => {
    const { app, notifier, mailer } = target();

    await request(app)
      .post(WEBHOOK_PATH)
      .send(
        deploymentPayload({
          application_name: 'Reset your password',
          deployment_url: 'https://evil.example.com/login',
          fqdn: 'https://evil.example.com',
          preview_fqdn: 'https://evil.example.com',
        }),
      );
    await notifier.drain();

    const [email] = mailer.sent;
    expect(email).toBeDefined();
    expect(`${email?.html}${email?.text}${email?.subject}`).not.toContain('evil.example.com');
    expect(email?.subject).not.toContain('Reset your password');
  });

  it('a rejected fake cannot block the real webhook for the same deployment', async () => {
    const coolify = fakeCoolify();
    const { app, notifier, mailer } = target({ coolify });

    await request(app)
      .post(WEBHOOK_PATH)
      .send(deploymentPayload({ application_uuid: 'someone-elses-app' }));
    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);

    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    await notifier.drain();
    expect(mailer.sent).toHaveLength(1);
  });

  it('replaying a real webhook sends only one email', async () => {
    const { app, notifier, mailer } = target();

    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    }
    await notifier.drain();

    expect(mailer.sent).toHaveLength(1);
  });

  it('responses never contain Coolify data, emails or config', async () => {
    const { app } = target();

    const responses = await Promise.all([
      request(app).post(WEBHOOK_PATH).send(deploymentPayload()),
      request(app).post(WEBHOOK_PATH).send({ event: 'test' }),
      request(app).post(WEBHOOK_PATH).send({ event: 'deployment_success' }),
      request(app).get('/health'),
    ]);

    for (const response of responses) {
      const body = JSON.stringify(response.body);
      expect(body).not.toMatch(/commit|git_repository|@example\.com|smtp|token/i);
    }
  });

  it('the recipient list cannot be changed from the request', async () => {
    const { app, notifier, mailer } = target();

    await request(app)
      .post(WEBHOOK_PATH)
      .send({
        ...deploymentPayload(),
        to: 'attacker@evil.example.com',
        bcc: 'attacker@evil.example.com',
      });
    await notifier.drain();

    expect(JSON.stringify(mailer.sent)).not.toContain('attacker@');
  });

  it('path traversal in identifiers is rejected before any API call', async () => {
    const { app, coolify } = target();

    const response = await request(app)
      .post(WEBHOOK_PATH)
      .send(deploymentPayload({ deployment_uuid: '../../servers' }));

    expect(response.status).toBe(400);
    expect(coolify.getDeployment).not.toHaveBeenCalled();
  });
});

describe('without the secret', () => {
  it('guessing the secret is indistinguishable from a missing route', async () => {
    const { app } = target();
    const guess = await request(app).post('/webhooks/coolify/guess').send(deploymentPayload());
    const missing = await request(app).post('/nothing-here').send(deploymentPayload());

    expect(guess.status).toBe(missing.status);
    expect(guess.body).toEqual(missing.body);
  });

  it('a nearly correct secret is rejected', async () => {
    const { app, notifier, mailer } = target();
    const almost = `${SECRET.slice(0, -1)}X`;

    const response = await request(app)
      .post(`/webhooks/coolify/${almost}`)
      .send(deploymentPayload());
    await notifier.drain();

    expect(response.status).toBe(404);
    expect(mailer.sent).toHaveLength(0);
  });

  it('the secret never appears in logs', async () => {
    const { app, notifier, logs } = target();

    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    await request(app).post(WEBHOOK_PATH).send({ bad: true });
    await notifier.drain();

    expect(logs.join('\n')).not.toContain(SECRET);
  });
});

describe('IP allowlist', () => {
  it('blocks other IPs even with the correct secret', async () => {
    const { app, notifier, mailer, logs } = target({
      allowedIps: ['203.0.113.7'],
      trustProxy: true,
    });

    const response = await request(app)
      .post(WEBHOOK_PATH)
      .set('X-Forwarded-For', '198.51.100.9')
      .send(deploymentPayload());
    await notifier.drain();

    expect(response.status).toBe(404);
    expect(mailer.sent).toHaveLength(0);
    expect(logs.join('\n')).toContain('Blocked webhook from an IP that is not allowed');
  });

  it('allows the listed IP', async () => {
    const { app, notifier, mailer } = target({ allowedIps: ['203.0.113.0/24'], trustProxy: true });

    const response = await request(app)
      .post(WEBHOOK_PATH)
      .set('X-Forwarded-For', '203.0.113.7')
      .send(deploymentPayload());
    await notifier.drain();

    expect(response.status).toBe(202);
    expect(mailer.sent).toHaveLength(1);
  });

  it('cannot be bypassed with a spoofed X-Forwarded-For when not behind a proxy', async () => {
    const { app } = target({ allowedIps: ['203.0.113.7'], trustProxy: false });

    const response = await request(app)
      .post(WEBHOOK_PATH)
      .set('X-Forwarded-For', '203.0.113.7')
      .send(deploymentPayload());

    expect(response.status).toBe(404);
  });
});
