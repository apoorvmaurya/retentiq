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

    // Subquery to get latest health score with row number partition
    const hsSub = db
      .select({
        id: schema.healthScores.id,
        customerId: schema.healthScores.customerId,
        score: schema.healthScores.score,
        riskTier: schema.healthScores.riskTier,
        scoredAt: schema.healthScores.scoredAt,
        churnProbability: schema.healthScores.churnProbability,
        topRiskFactors: schema.healthScores.topRiskFactors,
        recommendedAction: schema.healthScores.recommendedAction,
        confidence: schema.healthScores.confidence,
        rowNum:
          sql<number>`ROW_NUMBER() OVER (PARTITION BY ${schema.healthScores.customerId} ORDER BY ${schema.healthScores.scoredAt} DESC)`.as(
            'row_num',
          ),
      })
      .from(schema.healthScores)
      .as('hs_sub');

    let conditions = eq(schema.customers.orgId, orgId);
    if (riskTier) {
      conditions = and(
        conditions,
        eq(hsSub.riskTier, riskTier as 'low' | 'medium' | 'high' | 'critical'),
      ) as any;
    }

    let orderByFn;
    if (sort === 'score') {
      orderByFn = order === 'desc' ? desc(hsSub.score) : asc(hsSub.score);
    } else if (sort === 'last_seen') {
      orderByFn = order === 'desc' ? desc(hsSub.scoredAt) : asc(hsSub.scoredAt);
    } else {
      orderByFn = order === 'desc' ? desc(schema.customers.name) : asc(schema.customers.name);
    }

    const [customersList, totalResult] = await Promise.all([
      db
        .select({
          id: schema.customers.id,
          orgId: schema.customers.orgId,
          name: schema.customers.name,
          email: schema.customers.email,
          company: schema.customers.company,
          planTier: schema.customers.planTier,
          mrr: schema.customers.mrr,
          notes: schema.customers.notes,
          createdAt: schema.customers.createdAt,
          healthScore: {
            id: hsSub.id,
            score: hsSub.score,
            riskTier: hsSub.riskTier,
            scoredAt: hsSub.scoredAt,
            churnProbability: hsSub.churnProbability,
            topRiskFactors: hsSub.topRiskFactors,
            recommendedAction: hsSub.recommendedAction,
            confidence: hsSub.confidence,
          },
        })
        .from(schema.customers)
        .leftJoin(hsSub, and(eq(schema.customers.id, hsSub.customerId), eq(hsSub.rowNum, 1)))
        .where(conditions)
        .orderBy(orderByFn)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(schema.customers)
        .leftJoin(hsSub, and(eq(schema.customers.id, hsSub.customerId), eq(hsSub.rowNum, 1)))
        .where(conditions),
    ]);

    const data = customersList.map((row) => {
      const healthScore = row.healthScore?.score !== null ? row.healthScore : null;
      return {
        ...row,
        healthScore,
      };
    });

    res.json({ data, total: totalResult[0]?.count ?? 0, page });
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
    const id = req.params.id as string;
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

router.put(
  '/:id/notes',
  validateBody(notesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
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
  },
);

const dispatchAiPlaybookSchema = z.object({
  steps: z
    .array(
      z.object({
        step: z.number().int().positive(),
        headline: z.string().min(1).max(255),
        detail: z.string().max(2000),
      }),
    )
    .min(1, 'Playbook must contain at least one step'),
});

/**
 * POST /api/customers/:id/dispatch-ai-playbook
 * Dispatch an AI churn playbook: creates a retention action and tasks for each playbook step.
 */
router.post(
  '/:id/dispatch-ai-playbook',
  validateBody(dispatchAiPlaybookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const orgId = req.user!.org_id;
      const { steps } = req.body;

      // 1. Fetch customer
      const customer = await db
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.id, id), eq(schema.customers.orgId, orgId)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!customer) {
        res.status(404).json({ error: 'Customer not found', code: 'NOT_FOUND' });
        return;
      }

      // 2. Create retention action record
      const [action] = await db
        .insert(schema.retentionActions)
        .values({
          orgId,
          customerId: id,
          actionType: 'AI Playbook: Churn Mitigation',
          outcome: 'in_progress',
          revenueSaved: customer.mrr,
        })
        .returning();

      // 3. Create tasks for each step
      const createdTasks = [];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Default due date to 7 days from now

      for (const step of steps) {
        const [task] = await db
          .insert(schema.tasks)
          .values({
            orgId,
            customerId: id,
            title: `[AI Playbook] ${step.headline}`,
            description: step.detail,
            dueDate,
            status: 'pending',
          })
          .returning();
        createdTasks.push(task);
      }

      res.json({
        success: true,
        retentionAction: action,
        tasks: createdTasks,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
