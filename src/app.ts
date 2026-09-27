import express, { type Express } from 'express';
import helmet from 'helmet';
import { MAX_BODY_SIZE } from '@/constants/limits';
import { errorHandler, notFound } from '@/middleware/error-handler';
import { requestLogger } from '@/middleware/request-logger';
import { createHealthRouter } from '@/routes/health.route';
import { createWebhookRouter } from '@/routes/webhook.route';
import type { AppOptions } from '@/types/http.types';

/** The Express application: security headers, logging, JSON parsing, routes and error handling. */
export function createApp(options: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', options.trustProxy ? 1 : false);

  app.use(helmet());
  app.use(requestLogger(options.logger));
  app.use(express.json({ limit: MAX_BODY_SIZE, strict: true }));

  app.use(createHealthRouter());
  app.use(createWebhookRouter({ ...options.webhook, notifier: options.notifier }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
