import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 * Returns structured JSON `{ error, code, requestId }`.
 * Never leaks stack traces in production (NODE_ENV check).
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || err.status || 500;
  const requestId = (req as any).requestId || 'unknown';
  const startTime = (req as any).startTime || Date.now();
  const duration_ms = Date.now() - startTime;

  const payload: Record<string, any> = {
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
    requestId,
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  // Structured JSON logging to stdout
  const logObj = {
    level: statusCode >= 500 ? 'error' : 'warn',
    requestId,
    method: req.method,
    path: req.path,
    status: statusCode,
    duration_ms,
    error: err.message || 'Internal Server Error',
  };

  console.log(JSON.stringify(logObj));

  res.status(statusCode).json(payload);
}
