import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createIpMatcher } from '@/utils/ip-allowlist';

/**
 * Only let listed IPs / CIDR ranges reach the webhook. With an empty list every source is
 * allowed (the secret is still required). Blocked callers get the same 404 as a wrong secret.
 */
export function ipAllowlist(allowedIps: readonly string[]): RequestHandler {
  const isAllowed = createIpMatcher(allowedIps);
  const enabled = allowedIps.length > 0;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (enabled && !isAllowed(req.ip)) {
      req.log.warn({ ip: req.ip }, 'Blocked webhook from an IP that is not allowed');
      res.status(404).json({ error: 'Not found' });
      return;
    }
    next();
  };
}
