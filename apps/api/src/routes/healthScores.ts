import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, desc, and, gte, sql, count } from 'drizzle-orm';

const router = Router();

const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * GET /api/health-scores
 * List all health scores for the authenticated org, paginated and sortable.
 * @query page - Page number (default 1)
 * @query limit - Items per page (default 25)
 * @query sort - Sort field: 'score' | 'scored_at' (default 'scored_at')
 * @query order - Sort direction: 'asc' | 'desc' (default 'desc')
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const sort = (req.query.sort as string) || 'scored_at';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
    const offset = (page - 1) * limit;

    const orderCol = sort === 'score' ? schema.healthScores.score : schema.healthScores.scoredAt;
    const orderFn = order === 'asc' ? orderCol : desc(orderCol);

    const [scores, totalResult] = await Promise.all([
      db
        .select()
        .from(schema.healthScores)
        .where(eq(schema.healthScores.orgId, orgId))
        .orderBy(orderFn)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(schema.healthScores)
        .where(eq(schema.healthScores.orgId, orgId)),
    ]);

    res.json({
      data: scores,
      total: totalResult[0]?.count ?? 0,
      page,
    });
  } catch (err) {
    next(err);
  }
});

import { validateBody } from '../middleware/validate.js';
import { z } from 'zod';

router.post(
  '/refresh',
  validateBody(z.object({}).strict().optional()),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;

      const customersList = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.orgId, orgId));

      if (customersList.length === 0) {
        res.json({ job_id: `empty-${Date.now()}`, customer_count: 0 });
        return;
      }

      const customersPayload = customersList.map((c) => ({
        customer_id: c.id,
        org_id: orgId,
      }));

      const response = await fetch(`${aiServiceUrl}/score/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: customersPayload }),
      });

      if (!response.ok) {
        throw new Error(`AI service bulk score returned status ${response.status}`);
      }

      const result = (await response.json()) as { job_id: string; total: number };

      res.json({ job_id: result.job_id, customer_count: result.total });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/health-scores/:customer_id/history
 * Returns an array of { score, churn_probability, scored_at } for the last 90 days.
 */
router.get('/:customer_id/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer_id = req.params.customer_id as string;
    const orgId = req.user!.org_id;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const history = await db
      .select({
        score: schema.healthScores.score,
        churn_probability: schema.healthScores.churnProbability,
        scored_at: schema.healthScores.scoredAt,
      })
      .from(schema.healthScores)
      .where(
        and(
          eq(schema.healthScores.customerId, customer_id),
          eq(schema.healthScores.orgId, orgId),
          gte(schema.healthScores.scoredAt, ninetyDaysAgo),
        ),
      )
      .orderBy(desc(schema.healthScores.scoredAt));

    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
