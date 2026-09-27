import type { Server } from 'node:http';
import { createApp } from '@/app';
import { SHUTDOWN_TIMEOUT_MS } from '@/constants/timing';
import { createLogger } from '@/logger/create-logger';
import { CoolifyClient } from '@/services/coolify-client';
import { DeploymentNotifier } from '@/services/deployment-notifier';
import { createSmtpMailer } from '@/services/smtp-mailer';
import type { Config } from '@/types/config.types';
import type { Mailer } from '@/types/email.types';
import type { AppLogger } from '@/types/logger.types';

/** Wire the services together, start listening, and shut down gracefully on SIGTERM/SIGINT. */
export function startServer(config: Config): Server {
  const logger = createLogger(config);
  const mailer = createSmtpMailer(config);
  const coolify = new CoolifyClient({
    baseUrl: config.coolify.url,
    apiToken: config.coolify.apiToken,
    timeoutMs: config.coolify.timeoutMs,
  });
  const notifier = new DeploymentNotifier({
    config: {
      gitBaseUrl: config.gitBaseUrl,
      notify: config.notify,
      coolifyPublicUrl: config.coolify.publicUrl,
    },
    coolify,
    mailer,
    logger,
  });

  checkSmtp(mailer, config, logger);
  warnAboutInsecureSettings(config, logger);

  const app = createApp({
    logger,
    notifier,
    webhook: config.webhook,
    trustProxy: config.trustProxy,
  });
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port }, 'coolify-deploy-mailer listening');
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down: finishing queued emails');

    const forceExit = setTimeout(() => {
      logger.error('Shutdown timed out; exiting');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(() => {
      notifier
        .drain()
        .then(() => {
          mailer.close();
          logger.info('Shutdown complete');
          process.exit(0);
        })
        .catch(() => {
          process.exit(1);
        });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}

/** Log whether SMTP works at startup. Failures are not fatal: sending is retried later. */
function checkSmtp(mailer: Mailer, config: Config, logger: AppLogger): void {
  mailer.verify().then(
    () => {
      logger.info({ host: config.smtp.host, port: config.smtp.port }, 'SMTP connection OK');
    },
    (error: unknown) => {
      logger.warn({ err: error }, 'SMTP check failed; emails will be retried');
    },
  );
}

/** Point out settings that are fine on a private network but risky on the internet. */
function warnAboutInsecureSettings(config: Config, logger: AppLogger): void {
  if (config.coolify.url.startsWith('http://')) {
    logger.warn(
      'COOLIFY_URL uses http://: the API token is sent unencrypted. Only do this on a private network.',
    );
  }
  if (!(config.smtp.secure || config.smtp.requireTls)) {
    logger.warn('SMTP TLS is off: emails travel unencrypted. Only do this for local testing.');
  }
  if (config.webhook.allowedIps.length === 0) {
    logger.info('WEBHOOK_ALLOWED_IPS is empty: any IP with the secret can call the webhook.');
  }
}
