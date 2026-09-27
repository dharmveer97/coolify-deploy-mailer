import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { secretsMatch } from '@/utils/secrets';

/**
 * Coolify webhooks aren't signed and can't send custom headers, so the shared secret travels
 * in the URL path. A wrong secret gets the same 404 as an unknown route, so it can't be probed.
 */
export function requireWebhookSecret(secret: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { token } = req.params;
    if (typeof token !== 'string' || !secretsMatch(token, secret)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    next();
  };
}
