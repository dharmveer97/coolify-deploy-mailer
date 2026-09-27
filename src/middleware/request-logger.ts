import type { IncomingMessage } from 'node:http';
import type { RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';
import { HEALTH_PATH } from '@/constants/routes';
import type { AppLogger } from '@/types/logger.types';
import { redactSecretPath } from '@/utils/secrets';

/** One log line per request: method, URL with the secret redacted, status code and duration. */
export function requestLogger(logger: AppLogger): RequestHandler {
  return pinoHttp({
    logger,
    autoLogging: {
      ignore: (req: IncomingMessage): boolean => req.url === HEALTH_PATH,
    },
    serializers: {
      req: (req: { id: unknown; method: string; url: string }) => ({
        id: req.id,
        method: req.method,
        url: redactSecretPath(req.url),
      }),
      res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
