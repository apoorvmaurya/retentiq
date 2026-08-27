/**
 * Custom Typed Application Errors for RetentIQ
 */

export interface ErrorContext {
  jobId?: string;
  orgId?: string;
  customerId?: string;
  provider?: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: ErrorContext,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.context = context;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: ErrorContext) {
    super(message, 404, 'NOT_FOUND', true, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', context?: ErrorContext) {
    super(message, 422, 'VALIDATION_ERROR', true, context);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string = 'Invalid configuration', context?: ErrorContext) {
    super(message, 500, 'CONFIGURATION_ERROR', false, context);
  }
}

export class WorkerError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 500, 'WORKER_ERROR', true, context);
  }
}

export class IntegrationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 502, 'INTEGRATION_ERROR', true, context);
  }
}

export function toAppError(
  err: unknown,
  defaultMessage = 'An unexpected error occurred',
): AppError {
  if (err instanceof AppError) {
    return err;
  }
  if (err instanceof Error) {
    return new AppError(err.message, 500, 'INTERNAL_ERROR', true, {
      originalName: err.name,
      stack: err.stack,
    });
  }
  return new AppError(typeof err === 'string' ? err : defaultMessage, 500, 'INTERNAL_ERROR', true, {
    raw: String(err),
  });
}
