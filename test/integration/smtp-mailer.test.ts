import { startSmtpServer, type TestSmtpServer } from '@test/support/smtp-server';
import { afterEach, describe, expect, it } from 'vitest';
import { createSmtpMailer } from '@/services/smtp-mailer';
import type { Config } from '@/types/config.types';

const email = {
  subject: '✅ Deployment succeeded: shop-api @ 6b7fb7a',
  text: 'Deployment succeeded: shop-api\n',
  html: '<p>Deployment succeeded: <b>shop-api</b></p>',
};

function mailerConfig(
  port: number,
  auth?: { user: string; pass: string },
  requireTls = false,
): Pick<Config, 'smtp' | 'mail'> {
  return {
    smtp: { host: '127.0.0.1', port, secure: false, requireTls, auth },
    mail: {
      from: 'Coolify Deployments <deploy@example.com>',
      to: ['dev@example.com', 'ops@example.com'],
    },
  };
}

function authServer(accept: boolean): Promise<TestSmtpServer> {
  return startSmtpServer({
    authOptional: false,
    allowInsecureAuth: true,
    onAuth(auth, _session, callback) {
      if (accept && auth.username === 'mailer' && auth.password === 's3cret') {
        callback(null, { user: auth.username });
        return;
      }
      callback(new Error('Invalid credentials'));
    },
  });
}

describe('createSmtpMailer (real SMTP server)', () => {
  let smtp: TestSmtpServer | undefined;

  afterEach(async () => {
    await smtp?.close();
    smtp = undefined;
  });

  it('delivers a multipart email to every recipient', async () => {
    smtp = await startSmtpServer();
    const mailer = createSmtpMailer(mailerConfig(smtp.port));

    await mailer.verify();
    await mailer.send(email);
    mailer.close();

    expect(smtp.received).toHaveLength(1);
    const [message] = smtp.received;
    expect(message?.from).toBe('deploy@example.com');
    expect(message?.to).toEqual(['dev@example.com', 'ops@example.com']);
    expect(message?.raw).toContain('From: Coolify Deployments <deploy@example.com>');
    expect(message?.raw).toMatch(/Subject: =\?UTF-8\?/);
    expect(message?.raw).toContain('multipart/alternative');
    expect(message?.raw).toContain('Content-Type: text/plain');
    expect(message?.raw).toContain('Content-Type: text/html');
  });

  it('authenticates when credentials are configured', async () => {
    smtp = await authServer(true);
    const mailer = createSmtpMailer(mailerConfig(smtp.port, { user: 'mailer', pass: 's3cret' }));
    await mailer.send(email);
    mailer.close();
    expect(smtp.received).toHaveLength(1);
  });

  it('fails with wrong credentials and delivers nothing', async () => {
    smtp = await authServer(false);
    const mailer = createSmtpMailer(mailerConfig(smtp.port, { user: 'mailer', pass: 'wrong' }));
    await expect(mailer.send(email)).rejects.toThrow();
    mailer.close();
    expect(smtp.received).toHaveLength(0);
  });

  it('refuses to authenticate over plain text when TLS is required', async () => {
    smtp = await authServer(true);
    const mailer = createSmtpMailer(
      mailerConfig(smtp.port, { user: 'mailer', pass: 's3cret' }, true),
    );

    const error = await mailer.send(email).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    mailer.close();

    expect(error).toBeInstanceOf(Error);
    expect(smtp.received).toHaveLength(0);
    expect(smtp.authAttempts).toBe(0);
    expect(JSON.stringify(error, Object.getOwnPropertyNames(error))).not.toContain('s3cret');
  });

  it('never exposes the password in authentication errors', async () => {
    smtp = await authServer(false);
    const mailer = createSmtpMailer(
      mailerConfig(smtp.port, { user: 'mailer', pass: 'super-secret-pw' }),
    );

    const error = await mailer.send(email).then(
      () => undefined,
      (caught: unknown) => caught,
    );
    mailer.close();

    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    expect(serialized).not.toContain('super-secret-pw');
    expect(serialized).not.toContain(Buffer.from('super-secret-pw').toString('base64'));
  });

  it('reports an unreachable server from verify()', async () => {
    smtp = await startSmtpServer();
    const { port } = smtp;
    await smtp.close();
    smtp = undefined;

    const mailer = createSmtpMailer(mailerConfig(port));
    await expect(mailer.verify()).rejects.toThrow();
    mailer.close();
  });
});
