import { LRUCache } from 'lru-cache';
import { DEDUPE_MAX_ENTRIES, DEDUPE_TTL_MS, DEFAULT_RETRY_POLICY } from '@/constants/timing';
import { renderDeploymentEmail } from '@/emails/render-deployment-email';
import { WebhookRejectedError } from '@/errors/webhook-rejected-error';
import { toDeploymentEmailData } from '@/services/deployment-email-data';
import { verifyDeployment } from '@/services/deployment-verifier';
import type { AppLogger } from '@/types/logger.types';
import type { AcceptResult, DeploymentNotifierPort, NotifierOptions } from '@/types/notifier.types';
import type { RetryPolicy } from '@/types/retry.types';
import type { DeploymentEvent } from '@/types/webhook.types';
import { withRetry } from '@/utils/retry';

/**
 * Turns a Coolify deployment webhook into an email:
 * dedupe → verify with the Coolify API → build email from API data → send (with retries).
 * Work runs in the background so the webhook is answered immediately; `drain()` waits for it.
 */
export class DeploymentNotifier implements DeploymentNotifierPort {
  private readonly seen: LRUCache<string, true>;
  private readonly inFlight = new Set<Promise<void>>();
  private readonly retry: RetryPolicy;

  constructor(private readonly options: NotifierOptions) {
    this.retry = options.retry ?? DEFAULT_RETRY_POLICY;
    this.seen = new LRUCache({
      max: DEDUPE_MAX_ENTRIES,
      ttl: options.dedupeTtlMs ?? DEDUPE_TTL_MS,
    });
  }

  accept(event: DeploymentEvent): AcceptResult {
    if (!this.isEnabled(event)) {
      return 'disabled';
    }

    const key = `${event.event}:${event.deployment_uuid}`;
    if (this.seen.has(key)) {
      return 'duplicate';
    }
    this.seen.set(key, true);
    this.track(this.process(event), key, event);
    return 'queued';
  }

  /** Resolve once every queued email has been sent or has failed. */
  async drain(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }
  }

  private isEnabled(event: DeploymentEvent): boolean {
    const { notify } = this.options.config;
    return event.success ? notify.success : notify.failure;
  }

  private track(work: Promise<void>, key: string, event: DeploymentEvent): void {
    const context = { deploymentUuid: event.deployment_uuid, event: event.event };
    const task = work
      .catch((error: unknown) => {
        // Only a sent email marks the deployment as done. A rejected or failed attempt must not
        // block a later, genuine delivery of the same deployment.
        this.seen.delete(key);
        if (error instanceof WebhookRejectedError) {
          this.options.logger.warn(
            { ...context, reason: error.reason, detail: error.message },
            'Webhook rejected: not sending an email',
          );
          return;
        }
        this.options.logger.error({ ...context, err: error }, 'Failed to send deployment email');
      })
      .finally(() => {
        this.inFlight.delete(task);
      });
    this.inFlight.add(task);
  }

  private async process(event: DeploymentEvent): Promise<void> {
    const log: AppLogger = this.options.logger.child({
      deploymentUuid: event.deployment_uuid,
      event: event.event,
    });
    const { config, coolify, mailer } = this.options;

    const verified = await verifyDeployment(event, coolify, this.retry, log);
    const data = toDeploymentEmailData(event, verified, {
      gitBaseUrl: config.gitBaseUrl,
      coolifyPublicUrl: config.coolifyPublicUrl,
    });
    const email = await renderDeploymentEmail(data);

    await withRetry(() => mailer.send(email), {
      ...this.retry,
      onRetry: (error: unknown, attempt: number, delayMs: number): void => {
        log.warn({ err: error, attempt, delayMs }, 'Sending email failed, retrying');
      },
    });
    log.info({ commit: data.commit.shortSha }, 'Deployment email sent');
  }
}
