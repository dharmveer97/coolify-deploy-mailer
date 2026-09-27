import type { z } from 'zod';
import type { deploymentEventSchema } from '@/schemas/webhook.schema';

export type DeploymentEvent = z.output<typeof deploymentEventSchema>;

type WebhookEvent =
  | { kind: 'deployment'; payload: DeploymentEvent }
  | { kind: 'test' }
  | { kind: 'ignored'; event: string };

export type WebhookParseResult =
  | { ok: true; value: WebhookEvent }
  | { ok: false; issues: string[] };
