import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

router.get(
  '/sync/mixpanel',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user!.org_id;

      const mixpanelIntegration = await db
        .select()
        .from(schema.integrations)
        .where(
          and(eq(schema.integrations.orgId, orgId), eq(schema.integrations.provider, 'mixpanel')),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!mixpanelIntegration) {
        res.status(404).json({ error: 'Mixpanel integration not configured', code: 'NOT_FOUND' });
        return;
      }

      const newJob = await db
        .insert(schema.jobs)
        .values({
          orgId,
          type: 'mixpanel',
          payload: { manual: true },
          status: 'queued',
        })
        .returning();

      res.json({
        status: 'queued',
        jobId: newJob[0].id,
        message: 'Mixpanel sync queued in the background',
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
