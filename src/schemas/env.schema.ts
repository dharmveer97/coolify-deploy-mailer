import { z } from 'zod';
import {
  booleanStringSchema,
  emailListSchema,
  httpUrlSchema,
  ipListSchema,
  portSchema,
} from '@/schemas/primitives.schema';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
    PORT: portSchema.default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TRUST_PROXY: booleanStringSchema.default(false),

    WEBHOOK_SECRET: z
      .string()
      .min(32, 'WEBHOOK_SECRET must be at least 32 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'WEBHOOK_SECRET may only contain letters, digits, "-" and "_"'),
    WEBHOOK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(60),
    WEBHOOK_ALLOWED_IPS: ipListSchema.default([]),

    COOLIFY_URL: httpUrlSchema,
    COOLIFY_PUBLIC_URL: httpUrlSchema.optional(),
    COOLIFY_API_TOKEN: z.string().min(1),
    COOLIFY_API_TIMEOUT_MS: z.coerce.number().int().min(100).default(10_000),
    GIT_BASE_URL: httpUrlSchema.default('https://github.com'),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: portSchema.default(587),
    SMTP_SECURE: booleanStringSchema.default(false),
    SMTP_REQUIRE_TLS: booleanStringSchema.default(true),
    SMTP_USERNAME: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3),
    MAIL_TO: emailListSchema,

    NOTIFY_ON_SUCCESS: booleanStringSchema.default(true),
    NOTIFY_ON_FAILURE: booleanStringSchema.default(true),
  })
  .refine((env) => Boolean(env.SMTP_USERNAME) === Boolean(env.SMTP_PASSWORD), {
    message: 'SMTP_USERNAME and SMTP_PASSWORD must be set together',
    path: ['SMTP_USERNAME'],
  })
  .refine((env) => !env.SMTP_PASSWORD || env.SMTP_SECURE || env.SMTP_REQUIRE_TLS, {
    message:
      'Refusing to send the SMTP password without encryption: set SMTP_SECURE=true (port 465) or SMTP_REQUIRE_TLS=true (STARTTLS)',
    path: ['SMTP_REQUIRE_TLS'],
  });
