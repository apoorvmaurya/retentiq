import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import express from 'express';
import './config.js';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Middleware
import { requestId } from './middleware/requestId.js';
import { verifySupabaseJWT } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import customersRouter from './routes/customers.js';
import healthScoresRouter from './routes/healthScores.js';
import eventsRouter from './routes/events.js';
import integrationsRouter from './routes/integrations.js';
import alertsRouter from './routes/alerts.js';
import analyticsRouter from './routes/analytics.js';
import usersRouter from './routes/users.js';
import tasksRouter from './routes/tasks.js';
import playbooksRouter from './routes/playbooks.js';
import settingsRouter from './routes/settings.js';
import cronRouter from './routes/cron.js';

import { fileURLToPath } from 'url';

// ─── Bootstrap ───────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const app = express();
const port = parseInt(process.env.PORT || process.env.API_PORT || '4000', 10);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Global Middleware ───────────────────────────────────────────

// Security headers
app.use((helmet as any)());

// CORS — whitelist the web app origin
app.use(
  cors({
    origin: [appUrl, 'http://localhost:3000', 'http://localhost:4000'],
    credentials: true,
  }),
);

// Gzip/Brotli compression
app.use(compression());

// HTTP request logging (combined format)
app.use(morgan('combined'));

// JSON body parsing (capturing raw body for webhook verification)
app.use(
  express.json({
    limit: '2mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// Attach a unique request ID to every request
app.use(requestId);

// ─── Rate Limiting ───────────────────────────────────────────────

/** Public rate limiter: 100 requests per 15 minutes. */
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

/** Authenticated rate limiter: 1000 requests per 15 minutes. */
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});

import { db, pgClient } from './lib/db.js';
import { sql } from 'drizzle-orm';

// ─── Health Check (public, rate-limited) ─────────────────────────

const startTime = Date.now();

/**
 * GET /health
 * Public health check endpoint. Including DB status checks.
 */
app.get('/health', publicLimiter, async (_req, res) => {
  let dbStatus = 'error';
  try {
    await db.execute(sql`SELECT 1`);
    dbStatus = 'ok';
  } catch (err) {
    console.error('[HealthCheck] DB ping failed:', err);
  }

  const isHealthy = dbStatus === 'ok';

  res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'ok' : 'error',
    version: '1.0.0',
    uptime: Math.round((Date.now() - startTime) / 1000),
    db: dbStatus,
  });
});

// Expose secure cron triggers for serverless environments (like Vercel)
app.use('/cron', cronRouter);

// ─── Authenticated API Routes ────────────────────────────────────

// Apply auth middleware and authenticated rate limiter to all /api/* routes
app.use('/api', authenticatedLimiter, verifySupabaseJWT);

// Mount route modules
app.use('/api/customers', customersRouter);
app.use('/api/health-scores', healthScoresRouter);
app.use('/api/events', eventsRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/users', usersRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/playbooks', playbooksRouter);
app.use('/api/settings', settingsRouter);

// ─── Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

import { startAlertWorker } from './workers/alertWorker.js';
import { startIngestionWorker } from './workers/ingestionWorker.js';

// ─── Start Server ────────────────────────────────────────────────
let server: any;
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server = app.listen(port, () => {
    console.log(`🚀 RetentIQ API server listening at http://localhost:${port}`);
    console.log(`   Health check:  GET http://localhost:${port}/health`);
    console.log(`   API base:      http://localhost:${port}/api`);
    console.log(`   CORS origin:   ${appUrl}`);

    // Start background cron worker
    startAlertWorker();
    startIngestionWorker();
  });

  // Graceful Shutdown Handler
  const gracefulShutdown = (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      console.log('[Server] Closed out remaining connections.');

      try {
        console.log('[Server] Closing database connection pool...');
        await pgClient.end();
        console.log('[Server] Database connection closed.');
        process.exit(0);
      } catch (dbErr) {
        console.error('[Server] Error closing database connection:', dbErr);
        process.exit(1);
      }
    });

    // Force exit timeout
    setTimeout(() => {
      console.error('[Server] Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 60000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export { app };
