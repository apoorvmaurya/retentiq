import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const playbookStepSchema = z.object({
  step: z.number().int().positive(),
  headline: z.string().min(1).max(255),
  detail: z.string().max(2000),
});

const createPlaybookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  triggerType: z.enum(['health_drop', 'manual']).default('manual'),
  triggerThreshold: z.number().int().min(0).max(100).default(40),
  steps: z.array(playbookStepSchema).default([]),
  isActive: z.boolean().default(true),
});

const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  triggerType: z.enum(['health_drop', 'manual']).optional(),
  triggerThreshold: z.number().int().min(0).max(100).optional(),
  steps: z.array(playbookStepSchema).optional(),
  isActive: z.boolean().optional(),
});

const dispatchPlaybookSchema = z.object({
  customerId: z.string().uuid(),
});

/**
 * GET /api/playbooks
 * List all playbooks in the current organization.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const playbooksList = await db
      .select()
      .from(schema.playbooks)
      .where(eq(schema.playbooks.orgId, orgId))
      .orderBy(desc(schema.playbooks.createdAt));

    res.json(playbooksList);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/playbooks
 * Create a new playbook configuration.
 */
router.post(
  '/',
  validateBody(createPlaybookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const { name, triggerType, triggerThreshold, steps, isActive } = req.body;

      const newPlaybook = await db
        .insert(schema.playbooks)
        .values({
          orgId,
          name,
          triggerType: triggerType || 'manual',
          triggerThreshold: triggerThreshold || 40,
          steps: steps || [],
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      res.status(201).json(newPlaybook[0]);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/playbooks/:id
 * Update an existing playbook's settings or steps.
 */
router.put(
  '/:id',
  validateBody(updatePlaybookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const orgId = req.user!.org_id;
      const { name, triggerType, triggerThreshold, steps, isActive } = req.body;

      const updateFields: any = {};
      if (name !== undefined) updateFields.name = name;
      if (triggerType !== undefined) updateFields.triggerType = triggerType;
      if (triggerThreshold !== undefined) updateFields.triggerThreshold = triggerThreshold;
      if (steps !== undefined) updateFields.steps = steps;
      if (isActive !== undefined) updateFields.isActive = isActive;

      const updated = await db
        .update(schema.playbooks)
        .set(updateFields)
        .where(and(eq(schema.playbooks.id, id), eq(schema.playbooks.orgId, orgId)))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ error: 'Playbook not found', code: 'NOT_FOUND' });
        return;
      }

      res.json(updated[0]);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/playbooks/:id/dispatch
 * Dispatch/Execute a playbook for a specific customer. Spawns tasks and starts action tracking.
 */
router.post(
  '/:id/dispatch',
  validateBody(dispatchPlaybookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const orgId = req.user!.org_id;
      const { customerId } = req.body;

      // 1. Fetch playbook
      const playbook = await db
        .select()
        .from(schema.playbooks)
        .where(and(eq(schema.playbooks.id, id), eq(schema.playbooks.orgId, orgId)))
        .limit(1);

      if (playbook.length === 0) {
        res.status(404).json({ error: 'Playbook not found', code: 'NOT_FOUND' });
        return;
      }

      // 2. Fetch customer (for MRR)
      const customer = await db
        .select()
        .from(schema.customers)
        .where(and(eq(schema.customers.id, customerId), eq(schema.customers.orgId, orgId)))
        .limit(1);

      if (customer.length === 0) {
        res.status(404).json({ error: 'Customer not found', code: 'CUSTOMER_NOT_FOUND' });
        return;
      }

      const mrr = customer[0].mrr;

      // 3. Create retention action
      const retentionAction = await db
        .insert(schema.retentionActions)
        .values({
          orgId,
          customerId,
          actionType: playbook[0].name,
          outcome: 'in_progress',
          revenueSaved: mrr,
        })
        .returning();

      // 4. Create tasks for all playbook steps
      const steps = playbook[0].steps as Array<{ step: number; headline: string; detail: string }>;
      const createdTasks = [];

      if (steps && steps.length > 0) {
        // 7 days from now for due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        for (const step of steps) {
          const t = await db
            .insert(schema.tasks)
            .values({
              orgId,
              customerId,
              title: `${playbook[0].name}: ${step.headline}`,
              description: step.detail,
              dueDate,
              status: 'pending',
            })
            .returning();
          createdTasks.push(t[0]);
        }
      }

      res.json({
        success: true,
        message: `Executed playbook ${playbook[0].name} for customer ${customer[0].name}`,
        retentionAction: retentionAction[0],
        tasks: createdTasks,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
