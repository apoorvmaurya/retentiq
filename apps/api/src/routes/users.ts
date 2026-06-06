import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatar_url: z.string().optional(),
});

/**
 * GET /api/users/profile
 * Retrieve authenticated user profile details from Postgres users table.
 * Auto-creates profile record if user is authenticated but not yet in database.
 */
router.get('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.org_id;
    const email = req.user!.email || 'owner@retentiq.io';

    let userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRow) {
      console.log(`[users/profile] Auto-creating user profile in Postgres for ${userId}`);
      const newUser = await db
        .insert(schema.users)
        .values({
          id: userId,
          orgId: orgId,
          email: email,
          role: 'owner',
          name: email.split('@')[0],
          avatarUrl: '',
        })
        .returning();
      userRow = newUser[0];
    }

    // Fetch organization name
    const orgRow = await db
      .select({ name: schema.organizations.name })
      .from(schema.organizations)
      .where(eq(schema.organizations.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    res.json({
      id: userRow.id,
      org_id: userRow.orgId,
      email: userRow.email,
      role: userRow.role,
      name: userRow.name || '',
      avatar_url: userRow.avatarUrl || '',
      org_name: orgRow?.name || 'Sandbox Org',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/profile
 * Update user display name and avatar URL (supports base64 image data strings).
 */
router.put('/profile', validateBody(updateProfileSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const orgId = req.user!.org_id;
    const email = req.user!.email || 'owner@retentiq.io';
    const { name, avatar_url } = req.body;

    let userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!userRow) {
      const newUser = await db
        .insert(schema.users)
        .values({
          id: userId,
          orgId: orgId,
          email: email,
          role: 'owner',
          name: name || '',
          avatarUrl: avatar_url || '',
        })
        .returning();
      userRow = newUser[0];
    } else {
      await db
        .update(schema.users)
        .set({
          name: name !== undefined ? name : userRow.name,
          avatarUrl: avatar_url !== undefined ? avatar_url : userRow.avatarUrl,
        })
        .where(eq(schema.users.id, userId));
    }

    const updatedUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
      .then((rows) => rows[0]);

    res.json({
      id: updatedUser.id,
      org_id: updatedUser.orgId,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name || '',
      avatar_url: updatedUser.avatarUrl || '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
