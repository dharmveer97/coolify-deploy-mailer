import { z } from 'zod';
import { coolifyIdSchema } from '@/schemas/primitives.schema';

const shortTextSchema = z.string().max(500);
const longUrlTextSchema = z.string().max(2048);

export const DEPLOYMENT_EVENTS = ['deployment_success', 'deployment_failed'] as const;

/** Payload of Coolify's `deployment_success` / `deployment_failed` webhook notifications. */
export const deploymentEventSchema = z.object({
  event: z.enum(DEPLOYMENT_EVENTS),
  success: z.boolean(),
  message: shortTextSchema.optional(),
  application_name: shortTextSchema,
  application_uuid: coolifyIdSchema,
  deployment_uuid: coolifyIdSchema,
  deployment_url: z.url({ protocol: /^https?$/ }).max(2048),
  project: shortTextSchema.nullish(),
  environment: shortTextSchema.nullish(),
  fqdn: longUrlTextSchema.nullish(),
  pull_request_id: z.coerce.number().int().nonnegative().nullish(),
  preview_fqdn: longUrlTextSchema.nullish(),
});

/** Payload sent by the "Send Test" button in Coolify's webhook settings. */
export const testEventSchema = z.object({
  event: z.literal('test'),
  message: shortTextSchema.optional(),
});

/** Every Coolify webhook has an `event`; other events are accepted and ignored. */
export const webhookEnvelopeSchema = z.object({
  event: z.string().max(100),
});
