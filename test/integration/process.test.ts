import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { startFakeCoolifyServer } from '@test/support/fake-coolify-server';
import { deploymentPayload, SECRET, WEBHOOK_PATH } from '@test/support/fixtures';
import { startSmtpServer, type TestSmtpServer } from '@test/support/smtp-server';
import { freePort, waitFor } from '@test/support/wait-for';
import { afterEach, describe, expect, it } from 'vitest';

const API_TOKEN = 'process-test-token';

interface RunningProcess {
  child: ChildProcessWithoutNullStreams;
  output: () => string;
  exited: Promise<number | null>;
}

function startService(env: Record<string, string>): RunningProcess {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { PATH: process.env.PATH ?? '', ...env },
  });
  let output = '';
  const append = (chunk: Buffer): void => {
    output += chunk.toString();
  };
  child.stdout.on('data', append);
  child.stderr.on('data', append);
  const exited = new Promise<number | null>((resolve) => {
    child.on('exit', resolve);
  });
  return { child, output: () => output, exited };
}

describe('service process (end to end)', () => {
  let service: RunningProcess | undefined;
  let smtp: TestSmtpServer | undefined;
  let closeCoolify: (() => Promise<void>) | undefined;

  afterEach(async () => {
    service?.child.kill('SIGKILL');
    await smtp?.close();
    await closeCoolify?.();
    service = undefined;
    smtp = undefined;
    closeCoolify = undefined;
  });

  it('receives a webhook, emails the commit, and shuts down gracefully', async () => {
    smtp = await startSmtpServer();
    const coolify = await startFakeCoolifyServer();
    closeCoolify = coolify.close;
    const port = await freePort();

    service = startService({
      NODE_ENV: 'production',
      PORT: String(port),
      WEBHOOK_SECRET: SECRET,
      COOLIFY_URL: coolify.url,
      COOLIFY_API_TOKEN: API_TOKEN,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtp.port),
      SMTP_REQUIRE_TLS: 'false',
      MAIL_FROM: 'Coolify <deploy@example.com>',
      MAIL_TO: 'dev@example.com',
    });
    const baseUrl = `http://127.0.0.1:${port}`;

    await waitFor(
      async () => (await fetch(`${baseUrl}/health`).catch(() => undefined))?.status === 200,
    );

    const response = await fetch(`${baseUrl}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(deploymentPayload()),
    });
    expect(response.status).toBe(202);

    const inbox = smtp;
    await waitFor(() => inbox.received.length === 1);
    expect(inbox.received[0]?.to).toEqual(['dev@example.com']);
    expect(inbox.received[0]?.raw).toContain('feat: ship it');
    expect(coolify.authHeaders).toContain(`Bearer ${API_TOKEN}`);

    service.child.kill('SIGTERM');
    expect(await service.exited).toBe(0);

    const logs = service.output();
    expect(logs).toContain('SMTP connection OK');
    expect(logs).toContain('Deployment email sent');
    expect(logs).toContain('Shutdown complete');
    expect(logs).not.toContain(SECRET);
    expect(logs).not.toContain(API_TOKEN);
  }, 30_000);

  it('refuses to start with invalid configuration and explains why', async () => {
    service = startService({
      WEBHOOK_SECRET: 'short',
      SMTP_PASSWORD: 'super-secret-smtp-password',
      COOLIFY_API_TOKEN: API_TOKEN,
    });

    expect(await service.exited).toBe(1);
    const logs = service.output();
    expect(logs).toContain('Invalid configuration');
    expect(logs).toContain('WEBHOOK_SECRET must be at least 32 characters');
    expect(logs).toContain('COOLIFY_URL');
    expect(logs).not.toContain('super-secret-smtp-password');
    expect(logs).not.toContain(API_TOKEN);
  }, 30_000);
});
