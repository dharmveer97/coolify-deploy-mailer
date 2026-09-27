import type { NextFunction, Request, Response } from 'express';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

/** Client errors (bad JSON, body too large) keep their 4xx status; everything else is a generic 500. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = httpStatusOf(error);
  if (status >= 500) {
    req.log.error({ err: error }, 'Unhandled error');
  }
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : 'Bad request' });
}

function httpStatusOf(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const { status } = error;
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return status;
    }
  }
  return 500;
}
