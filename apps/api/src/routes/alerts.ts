import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, desc, and, count } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/alerts
 * List alerts for the authenticated org with filtering.
 * @query status - 'open' | 'resolved' (default: all)
 * @query limit - Number of alerts (default 25)
 * @query page - Page number (default 1)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    let alertsList;

    if (status === 'open') {
      alertsList = await db
        .select({
          alert: schema.alerts,
          customer: {
            name: schema.customers.name,
            company: schema.customers.company,
            email: schema.customers.email,
          },
        })
        .from(schema.alerts)
        .innerJoin(schema.customers, eq(schema.alerts.customerId, schema.customers.id))
        .where(and(eq(schema.alerts.orgId, orgId), eq(schema.alerts.acknowledged, false)))
        .orderBy(desc(schema.alerts.triggeredAt))
        .limit(limit)
        .offset(offset);
    } else if (status === 'resolved') {
      alertsList = await db
        .select({
          alert: schema.alerts,
          customer: {
            name: schema.customers.name,
            company: schema.customers.company,
            email: schema.customers.email,
          },
        })
        .from(schema.alerts)
        .innerJoin(schema.customers, eq(schema.alerts.customerId, schema.customers.id))
        .where(and(eq(schema.alerts.orgId, orgId), eq(schema.alerts.acknowledged, true)))
        .orderBy(desc(schema.alerts.triggeredAt))
        .limit(limit)
        .offset(offset);
    } else {
      alertsList = await db
        .select({
          alert: schema.alerts,
          customer: {
            name: schema.customers.name,
            company: schema.customers.company,
            email: schema.customers.email,
          },
        })
        .from(schema.alerts)
        .innerJoin(schema.customers, eq(schema.alerts.customerId, schema.customers.id))
        .where(eq(schema.alerts.orgId, orgId))
        .orderBy(desc(schema.alerts.triggeredAt))
        .limit(limit)
        .offset(offset);
    }

    res.json(alertsList);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/alerts/:id/resolve
 * Resolve an alert: set resolved_at = now, acknowledged = true.
 */
router.put('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const updated = await db
      .update(schema.alerts)
      .set({ acknowledged: true, resolvedAt: new Date() })
      .where(eq(schema.alerts.id, id))
      .returning();

    if (updated.length === 0) {
      res.status(404).json({ error: 'Alert not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({ success: true, alert: updated[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/alerts/config
 * Get current alert_config for the authenticated org (or defaults if none exists).
 */
router.get('/config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const configs = await db
      .select()
      .from(schema.alertConfigs)
      .where(eq(schema.alertConfigs.orgId, orgId))
      .limit(1);

    if (configs.length === 0) {
      res.json({
        orgId: orgId,
        threshold: 40,
        notifySlack: false,
        notifyEmail: false,
        updatedAt: null,
      });
      return;
    }

    res.json(configs[0]);
  } catch (err) {
    next(err);
  }
});

import { validateBody } from '../middleware/validate.js';

const alertConfigSchema = z.object({
  threshold: z.number().int().min(1).max(100),
  notify_slack: z.boolean(),
  notify_email: z.boolean(),
});

/**
 * POST /api/alerts/config
 * Upsert alert_config for the authenticated org.
 * Body: { threshold: number(1-100), notify_slack: bool, notify_email: bool }
 */
router.post(
  '/config',
  validateBody(alertConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      // req.body is already validated by middleware
      const data = req.body;

      const existing = await db
        .select()
        .from(schema.alertConfigs)
        .where(eq(schema.alertConfigs.orgId, orgId))
        .limit(1);

      let result;

      if (existing.length > 0) {
        result = await db
          .update(schema.alertConfigs)
          .set({
            threshold: data.threshold,
            notifySlack: data.notify_slack,
            notifyEmail: data.notify_email,
            updatedAt: new Date(),
          })
          .where(eq(schema.alertConfigs.orgId, orgId))
          .returning();
      } else {
        result = await db
          .insert(schema.alertConfigs)
          .values({
            orgId,
            threshold: data.threshold,
            notifySlack: data.notify_slack,
            notifyEmail: data.notify_email,
          })
          .returning();
      }

      res.json(result[0]);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
