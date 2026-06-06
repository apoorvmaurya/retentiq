import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, desc, and, lt } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

import { validateBody } from '../middleware/validate.js';

const eventInputSchema = z.object({
  customer_id: z.string().uuid(),
  event_type: z.string().min(1),
  source: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional().default({}),
  occurred_at: z.string().datetime().optional(),
});

const ingestSchema = z.object({
  events: z.array(eventInputSchema).min(1).max(500, 'Maximum 500 events per call'),
});

/**
 * POST /api/events/ingest
 * Bulk ingest events. Validated with Zod (max 500 per call).
 * Returns { inserted, skipped }.
 */
router.post(
  '/ingest',
  validateBody(ingestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const data = req.body;

      let inserted = 0;
      let skipped = 0;

      for (const event of data.events) {
        try {
          await db.insert(schema.events).values({
            customerId: event.customer_id,
            orgId,
            eventType: event.event_type,
            source: event.source,
            payload: event.payload,
            occurredAt: event.occurred_at ? new Date(event.occurred_at) : new Date(),
          });
          inserted++;
        } catch (err) {
          console.warn(
            `[events/ingest] Skipped event for customer ${event.customer_id}:`,
            (err as any).message,
          );
          skipped++;
        }
      }

      res.json({ inserted, skipped });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/events/:customer_id
 * Paginated event stream for a customer with cursor-based pagination.
 * @query limit - Number of events (default 50)
 * @query before_cursor - ISO timestamp cursor for pagination
 */
router.get('/:customer_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer_id } = req.params;
    const orgId = req.user!.org_id;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const beforeCursor = req.query.before_cursor as string | undefined;

    const conditions = [eq(schema.events.customerId, customer_id), eq(schema.events.orgId, orgId)];

    if (beforeCursor) {
      conditions.push(lt(schema.events.occurredAt, new Date(beforeCursor)));
    }

    const eventsList = await db
      .select()
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(desc(schema.events.occurredAt))
      .limit(limit);

    const nextCursor =
      eventsList.length > 0
        ? (eventsList[eventsList.length - 1].occurredAt as Date)?.toISOString() || null
        : null;

    res.json({
      data: eventsList,
      next_cursor: nextCursor,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
