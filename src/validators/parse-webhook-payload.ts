import {
  DEPLOYMENT_EVENTS,
  deploymentEventSchema,
  testEventSchema,
  webhookEnvelopeSchema,
} from '@/schemas/webhook.schema';
import type { WebhookParseResult } from '@/types/webhook.types';
import { formatValidationIssues } from '@/utils/validation-issues';

const deploymentEventNames: readonly string[] = DEPLOYMENT_EVENTS;

/** Classify a webhook body as a deployment, a test notification, or an event we ignore. */
export function parseWebhookPayload(body: unknown): WebhookParseResult {
  const envelope = webhookEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return { ok: false, issues: formatValidationIssues(envelope.error.issues) };
  }

  const { event } = envelope.data;

  if (deploymentEventNames.includes(event)) {
    const deployment = deploymentEventSchema.safeParse(body);
    return deployment.success
      ? { ok: true, value: { kind: 'deployment', payload: deployment.data } }
      : { ok: false, issues: formatValidationIssues(deployment.error.issues) };
  }

  if (testEventSchema.safeParse(body).success) {
    return { ok: true, value: { kind: 'test' } };
  }

  return { ok: true, value: { kind: 'ignored', event } };
}
