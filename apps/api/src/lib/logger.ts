import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : isTest ? 'silent' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'retentiq-api',
    env: process.env.NODE_ENV || 'development',
  },
});

export interface LogContext {
  jobId?: string;
  orgId?: string;
  customerId?: string;
  provider?: string;
  [key: string]: unknown;
}

export function createChildLogger(context: LogContext) {
  return logger.child(context);
}

export default logger;
