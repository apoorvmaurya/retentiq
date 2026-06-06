import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Middleware: requestId
 * Generates a UUID v4 for every incoming request and attaches it
 * as `X-Request-Id` on the response headers and `req.requestId`.
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  (req as any).requestId = id;
  (req as any).startTime = Date.now();
  res.setHeader('X-Request-Id', id);
  next();
}
