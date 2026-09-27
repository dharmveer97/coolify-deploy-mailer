import { Writable } from 'node:stream';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { createLogger, createStartupLogger } from '@/logger/create-logger';
import { REDACTED_PATHS } from '@/logger/redaction';

function captured(): { lines: Record<string, unknown>[]; stream: Writable } {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done): void {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      done();
    },
  });
  return { lines, stream };
}

describe('createLogger', () => {
  it('uses the configured level', () => {
    expect(createLogger({ env: 'production', logLevel: 'warn' }).level).toBe('warn');
    expect(createLogger({ env: 'development', logLevel: 'debug' }).level).toBe('debug');
  });

  it('starts at info level before config is loaded', () => {
    expect(createStartupLogger().level).toBe('info');
  });

  it('redacts credentials anywhere one level deep', () => {
    const { lines, stream } = captured();
    const logger = pino({ redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' } }, stream);

    logger.info(
      {
        smtp: { host: 'smtp.example.com', pass: 'smtp-password', auth: { user: 'u', pass: 'p' } },
        coolify: { apiToken: 'api-token' },
        webhook: { secret: 'webhook-secret' },
        req: { headers: { authorization: 'Bearer api-token', cookie: 'session=1' } },
      },
      'config',
    );

    const line = JSON.stringify(lines[0]);
    for (const secret of [
      'smtp-password',
      'api-token',
      'webhook-secret',
      'session=1',
      '"pass":"p"',
    ]) {
      expect(line).not.toContain(secret);
    }
    expect(line).toContain('smtp.example.com');
  });
});
