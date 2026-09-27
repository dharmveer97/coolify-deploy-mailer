import { Router } from 'express';
import { WEBHOOK_PATH } from '@/constants/routes';
import { ipAllowlist } from '@/middleware/ip-allowlist';
import { webhookRateLimit } from '@/middleware/rate-limit';
import { requireJson } from '@/middleware/require-json';
import { requireWebhookSecret } from '@/middleware/require-webhook-secret';
import type { WebhookRouterOptions } from '@/types/http.types';
import { parseWebhookPayload } from '@/validators/parse-webhook-payload';

/** POST /webhooks/coolify/:token — receives Coolify's notification webhooks. */
export function createWebhookRouter(options: WebhookRouterOptions): Router {
  const router = Router();

  router.post(
    WEBHOOK_PATH,
    webhookRateLimit(options.rateLimitPerMinute),
    ipAllowlist(options.allowedIps),
    requireWebhookSecret(options.secret),
    requireJson,
    (req, res) => {
      const parsed = parseWebhookPayload(req.body);

      if (!parsed.ok) {
        req.log.warn({ issues: parsed.issues }, 'Rejected invalid webhook payload');
        res.status(400).json({ error: 'Invalid payload', issues: parsed.issues });
        return;
      }

      const event = parsed.value;
      switch (event.kind) {
        case 'test': {
          req.log.info('Received Coolify test webhook');
          res.status(200).json({ status: 'ok' });
          return;
        }
        case 'ignored': {
          req.log.debug({ event: event.event }, 'Ignoring non-deployment event');
          res.status(202).json({ status: 'ignored' });
          return;
        }
        case 'deployment': {
          const status = options.notifier.accept(event.payload);
          req.log.info(
            { event: event.payload.event, deploymentUuid: event.payload.deployment_uuid, status },
            'Deployment webhook accepted',
          );
          res.status(202).json({ status });
          return;
        }
      }
    },
  );

  return router;
}
