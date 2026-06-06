import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createTaskSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'completed']).default('pending'),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'completed']).optional(),
});

/**
 * GET /api/tasks
 * Retrieve tasks for the current organization, enriched with customer metadata.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const customerId = req.query.customerId as string | undefined;
    const status = req.query.status as string | undefined;

    let conditions = eq(schema.tasks.orgId, orgId);
    if (customerId) {
      conditions = and(conditions, eq(schema.tasks.customerId, customerId)) as any;
    }
    if (status === 'pending' || status === 'completed') {
      conditions = and(conditions, eq(schema.tasks.status, status)) as any;
    }

    const tasksList = await db
      .select({
        id: schema.tasks.id,
        orgId: schema.tasks.orgId,
        customerId: schema.tasks.customerId,
        title: schema.tasks.title,
        description: schema.tasks.description,
        dueDate: schema.tasks.dueDate,
        status: schema.tasks.status,
        createdAt: schema.tasks.createdAt,
        customerName: schema.customers.name,
        customerCompany: schema.customers.company,
      })
      .from(schema.tasks)
      .leftJoin(schema.customers, eq(schema.tasks.customerId, schema.customers.id))
      .where(conditions)
      .orderBy(desc(schema.tasks.createdAt));

    res.json(tasksList);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Create a new task.
 */
router.post(
  '/',
  validateBody(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const { customerId, title, description, dueDate, status } = req.body;

      const newTask = await db
        .insert(schema.tasks)
        .values({
          orgId,
          customerId,
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: status || 'pending',
        })
        .returning();

      res.status(201).json(newTask[0]);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/tasks/:id
 * Update an existing task.
 */
router.put(
  '/:id',
  validateBody(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const orgId = req.user!.org_id;
      const { title, description, dueDate, status } = req.body;

      const updateFields: any = {};
      if (title !== undefined) updateFields.title = title;
      if (description !== undefined) updateFields.description = description;
      if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;
      if (status !== undefined) updateFields.status = status;

      const updated = await db
        .update(schema.tasks)
        .set(updateFields)
        .where(and(eq(schema.tasks.id, id), eq(schema.tasks.orgId, orgId)))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
        return;
      }

      res.json(updated[0]);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/tasks/:id
 * Delete a task.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;

    const deleted = await db
      .delete(schema.tasks)
      .where(and(eq(schema.tasks.id, id), eq(schema.tasks.orgId, orgId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
