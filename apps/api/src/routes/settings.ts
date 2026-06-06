import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { computeAndTriggerRescore } from '../lib/featureEngine.js';

const router = Router();

const scoreWeightsSchema = z.object({
  loginFrequency30dWeight: z.number().int().min(0).max(100).optional(),
  loginFrequency14dWeight: z.number().int().min(0).max(100).optional(),
  loginFrequency7dWeight: z.number().int().min(0).max(100).optional(),
  featureAdoptionWeight: z.number().int().min(0).max(100).optional(),
  usageTrendWeight: z.number().int().min(0).max(100).optional(),
  supportVolumeWeight: z.number().int().min(0).max(100).optional(),
  supportSentimentWeight: z.number().int().min(0).max(100).optional(),
  billingEventsWeight: z.number().int().min(0).max(100).optional(),
  onboardingTimeWeight: z.number().int().min(0).max(100).optional(),
});

const emailTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

/**
 * GET /api/settings/score-weights
 * Fetch custom weights for the current organization
 */
router.get('/score-weights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;

    let weightsRow = await db
      .select()
      .from(schema.scoreWeights)
      .where(eq(schema.scoreWeights.orgId, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!weightsRow) {
      // Create defaults if not exists
      const [newWeights] = await db
        .insert(schema.scoreWeights)
        .values({
          orgId,
          loginFrequency30dWeight: 15,
          loginFrequency14dWeight: 10,
          loginFrequency7dWeight: 10,
          featureAdoptionWeight: 20,
          usageTrendWeight: 15,
          supportVolumeWeight: 10,
          supportSentimentWeight: 5,
          billingEventsWeight: 10,
          onboardingTimeWeight: 5,
        })
        .returning();
      weightsRow = newWeights;
    }

    res.json(weightsRow);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/score-weights
 * Modify custom weights and trigger a background recalculation
 */
router.post(
  '/score-weights',
  validateBody(scoreWeightsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const body = req.body;

      const existing = await db
        .select()
        .from(schema.scoreWeights)
        .where(eq(schema.scoreWeights.orgId, orgId))
        .limit(1)
        .then((rows) => rows[0]);

      let weightsRow;
      if (existing) {
        const [updated] = await db
          .update(schema.scoreWeights)
          .set({
            ...body,
            updatedAt: new Date(),
          })
          .where(eq(schema.scoreWeights.orgId, orgId))
          .returning();
        weightsRow = updated;
      } else {
        const [inserted] = await db
          .insert(schema.scoreWeights)
          .values({
            orgId,
            ...body,
          })
          .returning();
        weightsRow = inserted;
      }

      // Trigger an immediate background rescore for all customers in this organization
      const customers = await db
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(eq(schema.customers.orgId, orgId));

      // Fire-and-forget rescoring
      Promise.all(
        customers.map(async (c) => {
          try {
            await computeAndTriggerRescore(c.id, orgId);
          } catch (err) {
            console.error(`[SettingsRoute] Background rescore failed for customer ${c.id}:`, err);
          }
        }),
      ).catch((err) => {
        console.error('[SettingsRoute] Background rescoring error:', err);
      });

      res.json({ success: true, weights: weightsRow });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/settings/email-templates
 * Fetch custom email templates
 */
router.get('/email-templates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const templates = await db
      .select()
      .from(schema.emailTemplates)
      .where(eq(schema.emailTemplates.orgId, orgId));

    // Seed default template if none exist
    if (templates.length === 0) {
      const [defaultTemplate] = await db
        .insert(schema.emailTemplates)
        .values({
          orgId,
          name: 'Critical Score Drop Check-in',
          subject: 'Is everything okay at {{account_name}}?',
          body: 'Hello,\n\nWe noticed a drop in activity/health score for {{account_name}} (currently at {{health_score}}).\n\nLet us know if there is anything we can help with.\n\nBest,\n{{csm_name}}',
        })
        .returning();
      res.json([defaultTemplate]);
    } else {
      res.json(templates);
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/settings/email-templates
 * Modify or create an email template
 */
router.post(
  '/email-templates',
  validateBody(emailTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const { name, subject, body } = req.body;

      const existing = await db
        .select()
        .from(schema.emailTemplates)
        .where(and(eq(schema.emailTemplates.orgId, orgId), eq(schema.emailTemplates.name, name)))
        .limit(1)
        .then((rows) => rows[0]);

      let templateRow;
      if (existing) {
        const [updated] = await db
          .update(schema.emailTemplates)
          .set({
            subject,
            body,
            updatedAt: new Date(),
          })
          .where(eq(schema.emailTemplates.id, existing.id))
          .returning();
        templateRow = updated;
      } else {
        const [inserted] = await db
          .insert(schema.emailTemplates)
          .values({
            orgId,
            name,
            subject,
            body,
          })
          .returning();
        templateRow = inserted;
      }

      res.json({ success: true, template: templateRow });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
