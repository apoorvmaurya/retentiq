import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, desc, asc, and, lt, sql, count } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/customers
 * List customers with latest health scores, paginated and filterable.
 * @query page - Page number (default 1)
 * @query limit - Items per page (default 25)
 * @query sort - Sort field: 'score' | 'name' | 'last_seen' (default 'name')
 * @query order - Sort direction: 'asc' | 'desc' (default 'asc')
 * @query risk_tier - Filter by risk tier: 'low' | 'medium' | 'high' | 'critical'
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const sort = (req.query.sort as string) || 'name';
    const order = (req.query.order as string) === 'desc' ? 'desc' : 'asc';
    const riskTier = req.query.risk_tier as string | undefined;

    const offset = (page - 1) * limit;

    // Fetch all customers for this org
    const customersList = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.orgId, orgId));

    // Enrich with latest health score
    const enriched = [];
    for (const customer of customersList) {
      const latestScore = await db
        .select()
        .from(schema.healthScores)
        .where(eq(schema.healthScores.customerId, customer.id))
        .orderBy(desc(schema.healthScores.scoredAt))
        .limit(1);

      const hs = latestScore[0] || null;

      // Apply risk_tier filter
      if (riskTier && hs?.riskTier !== riskTier) continue;
      if (riskTier && !hs) continue;

      enriched.push({ ...customer, healthScore: hs });
    }

    // Sort
    enriched.sort((a, b) => {
      let cmp = 0;
      if (sort === 'score') {
        cmp = (a.healthScore?.score ?? 0) - (b.healthScore?.score ?? 0);
      } else if (sort === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sort === 'last_seen') {
        const aDate = a.healthScore?.scoredAt ? new Date(a.healthScore.scoredAt).getTime() : 0;
        const bDate = b.healthScore?.scoredAt ? new Date(b.healthScore.scoredAt).getTime() : 0;
        cmp = aDate - bDate;
      }
      return order === 'desc' ? -cmp : cmp;
    });

    const total = enriched.length;
    const data = enriched.slice(offset, offset + limit);

    res.json({ data, total, page });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customers/:id
 * Get detailed customer profile with latest health score and last 20 events.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;

    const customer = await db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)))
      .limit(1);

    if (customer.length === 0) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }

    const healthHistory = await db
      .select()
      .from(schema.healthScores)
      .where(eq(schema.healthScores.customerId, id))
      .orderBy(desc(schema.healthScores.scoredAt));

    const latestScore = healthHistory[0] || null;

    const eventsList = await db
      .select()
      .from(schema.events)
      .where(eq(schema.events.customerId, id))
      .orderBy(desc(schema.events.occurredAt))
      .limit(20);

    const alertsList = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.customerId, id))
      .orderBy(desc(schema.alerts.triggeredAt));

    const retentionActionsList = await db
      .select()
      .from(schema.retentionActions)
      .where(eq(schema.retentionActions.customerId, id))
      .orderBy(desc(schema.retentionActions.actionedAt));

    res.json({
      profile: { ...customer[0], healthScore: latestScore },
      healthHistory,
      events: eventsList,
      alerts: alertsList,
      retentionActions: retentionActionsList,
    });
  } catch (err) {
    next(err);
  }
});

import { validateBody } from '../middleware/validate.js';

const notesSchema = z.object({
  notes: z.string().max(2000, 'Notes must be 2000 characters or less'),
});

router.put('/:id/notes', validateBody(notesSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;
    const data = req.body;

    const customer = await db
      .update(schema.customers)
      .set({ notes: data.notes })
      .where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)))
      .returning();

    if (customer.length === 0) {
      res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
      return;
    }

    res.json(customer[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
