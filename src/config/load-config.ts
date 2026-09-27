import { ConfigError } from '@/errors/config-error';
import { envSchema } from '@/schemas/env.schema';
import type { Config, Env } from '@/types/config.types';
import { formatValidationIssues } from '@/utils/validation-issues';

/** Validate environment variables and group them into {@link Config}. Throws {@link ConfigError}. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = formatValidationIssues(parsed.error.issues).map((issue) => `  - ${issue}`);
    throw new ConfigError(`Invalid configuration:\n${problems.join('\n')}`);
  }

  return toConfig(parsed.data);
}

function toConfig(env: Env): Config {
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    trustProxy: env.TRUST_PROXY,
    webhook: {
      secret: env.WEBHOOK_SECRET,
      rateLimitPerMinute: env.WEBHOOK_RATE_LIMIT_PER_MINUTE,
      allowedIps: env.WEBHOOK_ALLOWED_IPS,
    },
    coolify: {
      url: env.COOLIFY_URL,
      publicUrl: env.COOLIFY_PUBLIC_URL ?? env.COOLIFY_URL,
      apiToken: env.COOLIFY_API_TOKEN,
      timeoutMs: env.COOLIFY_API_TIMEOUT_MS,
    },
    gitBaseUrl: env.GIT_BASE_URL,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTls: env.SMTP_REQUIRE_TLS,
      auth:
        env.SMTP_USERNAME && env.SMTP_PASSWORD
          ? { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD }
          : undefined,
    },
    mail: {
      from: env.MAIL_FROM,
      to: env.MAIL_TO,
    },
    notify: {
      success: env.NOTIFY_ON_SUCCESS,
      failure: env.NOTIFY_ON_FAILURE,
    },
  };
}
