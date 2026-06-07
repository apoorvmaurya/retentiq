import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';

import stripeRouter from '../integrations/stripe.js';
import intercomRouter from '../integrations/intercom.js';
import mixpanelRouter from '../integrations/mixpanel.js';
import csvRouter from '../integrations/csv.js';
import segmentRouter from '../integrations/segment.js';
import hubspotRouter from '../integrations/hubspot.js';
import salesforceRouter from '../integrations/salesforce.js';

const router = Router();

// Mount integration sub-routes
router.use('/stripe', stripeRouter);
router.use('/intercom', intercomRouter);
router.use('/segment', segmentRouter);
router.use('/hubspot', hubspotRouter);
router.use('/salesforce', salesforceRouter);
router.use('/', mixpanelRouter);
router.use('/', csvRouter);

/**
 * GET /api/integrations
 * List all integrations for the authenticated org.
 * Returns { provider, status, last_synced_at, config }.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    const integrationsList = await db
      .select()
      .from(schema.integrations)
      .where(eq(schema.integrations.orgId, orgId));

    res.json(integrationsList);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/integrations/sync/:provider
 * Trigger a manual data sync for a specific provider.
 * Returns { job_id, status: 'queued' }.
 */
router.get('/sync/:provider', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provider } = req.params;
    const orgId = req.user!.org_id;

    const integration = await db
      .select()
      .from(schema.integrations)
      .where(eq(schema.integrations.orgId, orgId))
      .then((rows) => rows.find((r) => r.provider === provider));

    if (!integration) {
      res.status(404).json({ error: `Integration '${provider}' not found`, code: 'NOT_FOUND' });
      return;
    }

    if (integration.status !== 'active') {
      res
        .status(400)
        .json({ error: `Integration '${provider}' is not active`, code: 'INTEGRATION_INACTIVE' });
      return;
    }

    const newJob = await db
      .insert(schema.jobs)
      .values({
        orgId,
        type: provider,
        payload: { manual: true },
        status: 'queued',
      })
      .returning();

    res.json({ job_id: newJob[0].id, status: 'queued' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/integrations
 * Connect or disconnect an integration provider
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const { provider, status, config } = req.body;

    if (!provider || !status) {
      res.status(400).json({ error: 'Missing provider or status', code: 'BAD_REQUEST' });
      return;
    }

    const existing = await db
      .select()
      .from(schema.integrations)
      .where(eq(schema.integrations.orgId, orgId))
      .then((rows) => rows.find((r) => r.provider === provider));

    let result;
    if (existing) {
      const [updated] = await db
        .update(schema.integrations)
        .set({
          status,
          config: config || existing.config,
          lastSyncedAt: status === 'active' ? new Date() : null,
        })
        .where(eq(schema.integrations.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(schema.integrations)
        .values({
          orgId,
          provider,
          status,
          config: config || {},
          lastSyncedAt: status === 'active' ? new Date() : null,
        })
        .returning();
      result = inserted;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
