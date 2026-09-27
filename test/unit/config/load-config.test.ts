import { SECRET, validEnv } from '@test/support/fixtures';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '@/config/load-config';
import { ConfigError } from '@/errors/config-error';

describe('loadConfig', () => {
  it('applies defaults and normalizes values', () => {
    const config = loadConfig(validEnv);

    expect(config).toMatchObject({
      env: 'production',
      port: 3000,
      logLevel: 'info',
      trustProxy: false,
      coolify: {
        url: 'https://coolify.example.com',
        publicUrl: 'https://coolify.example.com',
        timeoutMs: 10_000,
      },
      webhook: { allowedIps: [] },
      gitBaseUrl: 'https://github.com',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        requireTls: true,
        auth: undefined,
      },
      mail: { to: ['dev@example.com', 'ops@example.com'] },
      notify: { success: true, failure: true },
    });
  });

  it('parses booleans, numbers and SMTP credentials', () => {
    const config = loadConfig({
      ...validEnv,
      PORT: '8080',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USERNAME: 'user',
      SMTP_PASSWORD: 'pass',
      NOTIFY_ON_SUCCESS: '0',
      TRUST_PROXY: '1',
    });

    expect(config.port).toBe(8080);
    expect(config.smtp).toEqual({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      requireTls: true,
      auth: { user: 'user', pass: 'pass' },
    });
    expect(config.notify.success).toBe(false);
    expect(config.trustProxy).toBe(true);
  });

  it('reads the public URL and IP allowlist', () => {
    const config = loadConfig({
      ...validEnv,
      COOLIFY_URL: 'http://coolify:8080',
      COOLIFY_PUBLIC_URL: 'https://coolify.example.com/',
      WEBHOOK_ALLOWED_IPS: '203.0.113.7, 10.0.0.0/8',
    });
    expect(config.coolify).toMatchObject({
      url: 'http://coolify:8080',
      publicUrl: 'https://coolify.example.com',
    });
    expect(config.webhook.allowedIps).toEqual(['203.0.113.7', '10.0.0.0/8']);
  });

  it('allows SMTP without TLS only when there is no password (local testing)', () => {
    expect(loadConfig({ ...validEnv, SMTP_REQUIRE_TLS: 'false' }).smtp.requireTls).toBe(false);
  });

  it.each([
    [{ WEBHOOK_SECRET: 'short' }, /WEBHOOK_SECRET must be at least 32 characters/],
    [{ WEBHOOK_SECRET: `${SECRET}/?#` }, /WEBHOOK_SECRET may only contain/],
    [{ MAIL_TO: 'dev@example.com, not-an-email' }, /MAIL_TO/],
    [{ MAIL_TO: ' , ' }, /At least one recipient/],
    [{ COOLIFY_URL: 'ftp://coolify.example.com' }, /COOLIFY_URL/],
    [{ PORT: '70000' }, /PORT/],
    [{ SMTP_USERNAME: 'user' }, /SMTP_USERNAME and SMTP_PASSWORD must be set together/],
    [{ SMTP_SECURE: 'yes' }, /SMTP_SECURE/],
    [{ WEBHOOK_ALLOWED_IPS: '1.2.3.4, not-an-ip' }, /WEBHOOK_ALLOWED_IPS/],
    [
      { SMTP_USERNAME: 'u', SMTP_PASSWORD: 'p', SMTP_SECURE: 'false', SMTP_REQUIRE_TLS: 'false' },
      /Refusing to send the SMTP password without encryption/,
    ],
  ])('rejects %o', (override, message) => {
    expect(() => loadConfig({ ...validEnv, ...override })).toThrow(message);
  });

  it('lists every missing variable at once', () => {
    let error: unknown;
    try {
      loadConfig({});
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConfigError);
    const { message } = error as ConfigError;
    for (const name of [
      'WEBHOOK_SECRET',
      'COOLIFY_URL',
      'COOLIFY_API_TOKEN',
      'SMTP_HOST',
      'MAIL_FROM',
      'MAIL_TO',
    ]) {
      expect(message).toContain(name);
    }
  });
});
