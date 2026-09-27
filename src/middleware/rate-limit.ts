import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS } from '@/constants/limits';

export function webhookRateLimit(limitPerMinute: number): RequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: limitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests' },
  });
}
