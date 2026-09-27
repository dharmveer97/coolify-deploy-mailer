import { CoolifyApiError } from '@/errors/coolify-api-error';
import { WebhookRejectedError } from '@/errors/webhook-rejected-error';
import type { CoolifyApi } from '@/types/coolify.types';
import type { AppLogger } from '@/types/logger.types';
import type { VerifiedDeployment } from '@/types/notifier.types';
import type { RetryOptions, RetryPolicy } from '@/types/retry.types';
import type { DeploymentEvent } from '@/types/webhook.types';
import { withRetry } from '@/utils/retry';

const EXPECTED_STATUS: Record<DeploymentEvent['event'], string> = {
  deployment_success: 'finished',
  deployment_failed: 'failed',
};

/**
 * Zero-trust check of a webhook: the deployment must exist in Coolify (for the team that owns
 * the API token), belong to the application named in the webhook, and have the status the event
 * claims. A forged webhook, even with the right secret, therefore never produces an email.
 */
export async function verifyDeployment(
  event: DeploymentEvent,
  coolify: CoolifyApi,
  retry: RetryPolicy,
  log: AppLogger,
): Promise<VerifiedDeployment> {
  const retryOptions: RetryOptions = {
    ...retry,
    shouldRetry: (error: unknown): boolean =>
      !(error instanceof CoolifyApiError) || error.retryable,
    onRetry: (error: unknown, attempt: number, delayMs: number): void => {
      log.warn({ err: error, attempt, delayMs }, 'Coolify API call failed, retrying');
    },
  };

  const deployment = await withRetry(
    () => coolify.getDeployment(event.deployment_uuid),
    retryOptions,
  ).catch((error: unknown) => {
    throw toRejection(error, 'deployment');
  });

  if (deployment.application?.uuid !== event.application_uuid) {
    throw new WebhookRejectedError(
      'application-mismatch',
      'The deployment belongs to a different application than the webhook claims',
    );
  }

  const expected = EXPECTED_STATUS[event.event];
  if (deployment.status !== expected) {
    throw new WebhookRejectedError(
      'status-mismatch',
      `The webhook says ${event.event} but Coolify reports status "${deployment.status}"`,
    );
  }

  const application = await withRetry(
    () => coolify.getApplication(event.application_uuid),
    retryOptions,
  ).catch((error: unknown) => {
    throw toRejection(error, 'application');
  });

  return { deployment, application };
}

function toRejection(error: unknown, what: 'deployment' | 'application'): WebhookRejectedError {
  if (error instanceof CoolifyApiError && error.status === 404) {
    return new WebhookRejectedError('deployment-not-found', `Coolify has no such ${what}`);
  }
  const reason = error instanceof Error ? error.message : String(error);
  return new WebhookRejectedError(
    'coolify-unreachable',
    `Could not verify the ${what} with Coolify: ${reason}`,
  );
}
