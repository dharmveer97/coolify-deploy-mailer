import { createTestNotifier, type FakeMailer } from '@test/support/fakes';
import { deploymentPayload, SECRET, SHORT_SHA, WEBHOOK_PATH } from '@test/support/fixtures';
import { captureLogger, silentLogger } from '@test/support/logger';
import type { Express } from 'express';
import type { Logger } from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '@/app';
import type { DeploymentNotifierPort } from '@/types/notifier.types';

interface Setup {
  app: Express;
  notifier: DeploymentNotifierPort;
  mailer: FakeMailer;
}

function setup(
  options: {
    rateLimitPerMinute?: number;
    logger?: Logger;
    notifier?: DeploymentNotifierPort;
    allowedIps?: string[];
  } = {},
): Setup {
  const test = createTestNotifier();
  const notifier = options.notifier ?? test.notifier;
  const app = createApp({
    logger: options.logger ?? silentLogger,
    notifier,
    webhook: {
      secret: SECRET,
      rateLimitPerMinute: options.rateLimitPerMinute ?? 100,
      allowedIps: options.allowedIps ?? [],
    },
    trustProxy: false,
  });
  return { app, notifier, mailer: test.mailer };
}

describe('GET /health', () => {
  it('reports ok with security headers', async () => {
    const response = await request(setup().app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeDefined();
  });
});

describe('trust proxy', () => {
  it('uses X-Forwarded-For for rate limiting when enabled behind a proxy', async () => {
    const { notifier } = createTestNotifier();
    const app = createApp({
      logger: silentLogger,
      notifier,
      webhook: { secret: SECRET, rateLimitPerMinute: 1, allowedIps: [] },
      trustProxy: true,
    });

    const first = await request(app)
      .post('/webhooks/coolify/x')
      .set('X-Forwarded-For', '203.0.113.1')
      .send({});
    const otherClient = await request(app)
      .post('/webhooks/coolify/x')
      .set('X-Forwarded-For', '203.0.113.2')
      .send({});
    const sameClient = await request(app)
      .post('/webhooks/coolify/x')
      .set('X-Forwarded-For', '203.0.113.1')
      .send({});

    expect(first.status).toBe(404);
    expect(otherClient.status).toBe(404);
    expect(sameClient.status).toBe(429);
  });
});

describe('POST /webhooks/coolify/:token', () => {
  it('queues an email for a deployment webhook', async () => {
    const { app, notifier, mailer } = setup();

    const response = await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'queued' });

    await notifier.drain();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.html).toContain(SHORT_SHA);
  });

  it.each([
    ['wrong secret', 'post', '/webhooks/coolify/wrong-secret'],
    ['missing secret', 'post', '/webhooks/coolify'],
    ['GET instead of POST', 'get', WEBHOOK_PATH],
  ] as const)('answers 404 for a %s and sends nothing', async (_label, method, path) => {
    const { app, notifier, mailer } = setup();

    const response = await request(app)[method](path).send(deploymentPayload());
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });

    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);
  });

  it('rejects non-JSON bodies with 415', async () => {
    const response = await request(setup().app)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(response.status).toBe(415);
  });

  it('rejects malformed JSON without leaking details', async () => {
    const response = await request(setup().app)
      .post(WEBHOOK_PATH)
      .set('Content-Type', 'application/json')
      .send('{"event":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Bad request' });
  });

  it('rejects bodies over 32 kB with 413', async () => {
    const response = await request(setup().app)
      .post(WEBHOOK_PATH)
      .send({ ...deploymentPayload(), padding: 'x'.repeat(40_000) });
    expect(response.status).toBe(413);
  });

  it('rejects invalid deployment payloads with a 400 and the reasons', async () => {
    const { app, notifier, mailer } = setup();
    const response = await request(app)
      .post(WEBHOOK_PATH)
      .send({ event: 'deployment_success', application_name: 'x' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Invalid payload' });
    expect(response.body).toHaveProperty('issues');
    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);
  });

  it('accepts the Coolify test notification without sending email', async () => {
    const { app, notifier, mailer } = setup();
    const response = await request(app)
      .post(WEBHOOK_PATH)
      .send({ success: true, event: 'test', message: 'hi', url: 'https://coolify.example.com' });

    expect(response.status).toBe(200);
    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);
  });

  it('acknowledges other events without sending email', async () => {
    const { app, notifier, mailer } = setup();
    const response = await request(app).post(WEBHOOK_PATH).send({ event: 'backup_success' });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'ignored' });
    await notifier.drain();
    expect(mailer.sent).toHaveLength(0);
  });

  it('reports duplicate deliveries', async () => {
    const { app, notifier, mailer } = setup();
    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    const second = await request(app).post(WEBHOOK_PATH).send(deploymentPayload());

    expect(second.body).toEqual({ status: 'duplicate' });
    await notifier.drain();
    expect(mailer.sent).toHaveLength(1);
  });

  it('rate limits the endpoint, including wrong-secret guesses', async () => {
    const { app } = setup({ rateLimitPerMinute: 2 });

    await request(app).post('/webhooks/coolify/guess-1').send({});
    await request(app).post('/webhooks/coolify/guess-2').send({});
    const third = await request(app).post(WEBHOOK_PATH).send(deploymentPayload());

    expect(third.status).toBe(429);
  });

  it('never writes the webhook secret to the logs', async () => {
    const { logger, lines } = captureLogger();
    const { app, notifier } = setup({ logger });

    await request(app).post(WEBHOOK_PATH).send(deploymentPayload());
    await request(app).post(WEBHOOK_PATH).send({ event: 'deployment_success' });
    await notifier.drain();

    const logs = lines.join('\n');
    expect(logs).not.toContain(SECRET);
    expect(logs).toContain('/webhooks/coolify/[REDACTED]');
  });

  it('hides internal errors behind a generic 500', async () => {
    const { logger, lines } = captureLogger('error');
    const failing: DeploymentNotifierPort = {
      accept: () => {
        throw new Error('database password is hunter2');
      },
      drain: async () => {},
    };
    const { app } = setup({ logger, notifier: failing });

    const response = await request(app).post(WEBHOOK_PATH).send(deploymentPayload());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(lines.join('\n')).toContain('Unhandled error');
  });
});
