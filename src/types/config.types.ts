import type { z } from 'zod';
import type { envSchema } from '@/schemas/env.schema';

/** Raw, validated environment variables. */
export type Env = z.output<typeof envSchema>;

interface SmtpAuth {
  user: string;
  pass: string;
}

export interface WebhookConfig {
  secret: string;
  rateLimitPerMinute: number;
  /** IPs / CIDR ranges allowed to call the webhook. Empty = any source (secret still required). */
  allowedIps: string[];
}

interface CoolifyConfig {
  /** Base URL this service uses to call the API (may be an internal hostname). */
  url: string;
  /** Base URL your team opens in a browser; used for links in emails. */
  publicUrl: string;
  apiToken: string;
  timeoutMs: number;
}

interface SmtpConfig {
  host: string;
  port: number;
  /** Implicit TLS (port 465). */
  secure: boolean;
  /** Require STARTTLS before authenticating (port 587). */
  requireTls: boolean;
  auth: SmtpAuth | undefined;
}

interface MailConfig {
  from: string;
  to: string[];
}

interface NotifyConfig {
  success: boolean;
  failure: boolean;
}

/** Application configuration, grouped by concern. Built from {@link Env} by `loadConfig`. */
export interface Config {
  env: Env['NODE_ENV'];
  port: number;
  logLevel: Env['LOG_LEVEL'];
  trustProxy: boolean;
  webhook: WebhookConfig;
  coolify: CoolifyConfig;
  gitBaseUrl: string;
  smtp: SmtpConfig;
  mail: MailConfig;
  notify: NotifyConfig;
}
