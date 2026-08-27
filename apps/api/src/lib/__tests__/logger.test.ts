import { describe, it, expect, vi } from 'vitest';
import { logger, createChildLogger } from '../logger.js';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConfigurationError,
  WorkerError,
  IntegrationError,
  toAppError,
} from '../errors.js';

describe('Logger Module', () => {
  it('should initialize logger with correct base properties', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should create child logger with structured context', () => {
    const child = createChildLogger({ jobId: 'job-123', orgId: 'org-456' });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe('function');
    expect(child.bindings().jobId).toBe('job-123');
    expect(child.bindings().orgId).toBe('org-456');
  });
});

describe('AppError Hierarchy', () => {
  it('should instantiate AppError with default parameters', () => {
    const err = new AppError('Something broke');
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
    expect(err.isOperational).toBe(true);
  });

  it('should instantiate specialized error subclasses correctly', () => {
    const notFound = new NotFoundError('Customer not found', { customerId: 'c1' });
    expect(notFound.statusCode).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.context?.customerId).toBe('c1');

    const validation = new ValidationError('Bad email');
    expect(validation.statusCode).toBe(422);
    expect(validation.code).toBe('VALIDATION_ERROR');

    const configErr = new ConfigurationError('Missing SMTP_HOST');
    expect(configErr.statusCode).toBe(500);
    expect(configErr.isOperational).toBe(false);

    const workerErr = new WorkerError('Ingestion failed', { jobId: 'j1' });
    expect(workerErr.statusCode).toBe(500);
    expect(workerErr.code).toBe('WORKER_ERROR');

    const integrationErr = new IntegrationError('Stripe API unreachable');
    expect(integrationErr.statusCode).toBe(502);
    expect(integrationErr.code).toBe('INTEGRATION_ERROR');
  });

  it('should convert unknown errors using toAppError', () => {
    const nativeErr = new Error('Native issue');
    const appErr = toAppError(nativeErr);
    expect(appErr).toBeInstanceOf(AppError);
    expect(appErr.message).toBe('Native issue');

    const strErr = toAppError('String error');
    expect(strErr).toBeInstanceOf(AppError);
    expect(strErr.message).toBe('String error');

    const existingAppErr = new NotFoundError('Already typed');
    expect(toAppError(existingAppErr)).toBe(existingAppErr);
  });
});
