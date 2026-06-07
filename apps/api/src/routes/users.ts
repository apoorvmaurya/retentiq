import { Router, Request, Response, NextFunction } from 'express';
import { db, schema } from '../lib/db.js';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

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
    const email = req.user!.email || 'test_confirmed_user@retentiq.com';

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
router.put(
  '/profile',
  validateBody(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orgId = req.user!.org_id;
      const email = req.user!.email || 'test_confirmed_user@retentiq.com';
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
  },
);

const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
const port = parseInt(process.env.SMTP_PORT || '2525', 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

const transportOptions: any = {
  host,
  port,
};

if (user && pass && user !== 'your-smtp-username' && pass !== 'your-smtp-password') {
  transportOptions.auth = { user, pass };
}

const transporter = nodemailer.createTransport(transportOptions);

/**
 * GET /api/users/invites
 * List all invites for the organization.
 */
router.get('/invites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const list = await db.select().from(schema.invites).where(eq(schema.invites.orgId, orgId));
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/invites
 * Invite a new member to the organization.
 */
router.post(
  '/invites',
  validateBody(
    z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'member', 'viewer']).default('member'),
    }),
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orgId = req.user!.org_id;
      const { email, role } = req.body;

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        res.status(400).json({
          error: 'User is already a member of an organization',
          code: 'USER_ALREADY_MEMBER',
        });
        return;
      }

      // Check if active invite already exists
      const existingInvite = await db
        .select()
        .from(schema.invites)
        .where(
          and(
            eq(schema.invites.orgId, orgId),
            eq(schema.invites.email, email),
            eq(schema.invites.status, 'pending'),
          ),
        )
        .limit(1);

      if (existingInvite.length > 0) {
        res.status(400).json({
          error: 'An invite is already pending for this email address',
          code: 'INVITE_PENDING',
        });
        return;
      }

      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      const [newInvite] = await db
        .insert(schema.invites)
        .values({
          orgId,
          email,
          role,
          token,
          status: 'pending',
          expiresAt,
        })
        .returning();

      // Send email invitation
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const inviteLink = `${appUrl}/signup?token=${token}`;

      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@retentiq.io',
          to: email,
          subject: `[RetentIQ] Invite to join organization`,
          html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2>You've been invited to join RetentIQ!</h2>
            <p>You have been invited as a <strong>${role}</strong>.</p>
            <p>Click the button below to sign up and join your workspace:</p>
            <p style="margin: 24px 0;">
              <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Join Workspace</a>
            </p>
            <p style="font-size: 11px; color: #64748b;">This invite link expires in 7 days.</p>
          </div>
        `,
        });
        console.log(`[Invites] Sent invite email to ${email}`);
      } catch (mailErr: any) {
        console.error('[Invites] Failed to send email invite:', mailErr.message);
      }

      res.status(201).json(newInvite);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/users/invites/accept/:token
 * Accept invitation. Link Supabase Auth user id to the organization.
 */
router.post('/invites/accept/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const userId = req.user!.id;
    const email = req.user!.email;

    if (!email) {
      res.status(400).json({ error: 'Auth email is missing', code: 'AUTH_EMAIL_MISSING' });
      return;
    }

    const invite = await db
      .select()
      .from(schema.invites)
      .where(and(eq(schema.invites.token, token), eq(schema.invites.status, 'pending')))
      .limit(1)
      .then((rows) => rows[0]);

    if (!invite) {
      res
        .status(404)
        .json({ error: 'Invite token not found or already accepted', code: 'INVITE_NOT_FOUND' });
      return;
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      await db
        .update(schema.invites)
        .set({ status: 'expired' })
        .where(eq(schema.invites.id, invite.id));
      res.status(410).json({ error: 'Invite token has expired', code: 'INVITE_EXPIRED' });
      return;
    }

    // Create user profile linked to invite org
    const [newUser] = await db
      .insert(schema.users)
      .values({
        id: userId,
        orgId: invite.orgId,
        email: email,
        role: invite.role,
        name: email.split('@')[0],
        onboardingComplete: true,
      })
      .returning();

    // Mark invite as accepted
    await db
      .update(schema.invites)
      .set({ status: 'accepted' })
      .where(eq(schema.invites.id, invite.id));

    res.json({ success: true, user: newUser });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/members
 * List all members in the organization.
 */
router.get('/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgId = req.user!.org_id;
    const list = await db.select().from(schema.users).where(eq(schema.users.orgId, orgId));
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/members/:id
 * Remove member from organization (caller must be owner/admin and cannot delete themselves).
 */
router.delete('/members/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const orgId = req.user!.org_id;
    const callerId = req.user!.id;
    const callerRole = req.user!.role;

    if (id === callerId) {
      res.status(400).json({
        error: 'You cannot remove yourself from the workspace',
        code: 'CANNOT_REMOVE_SELF',
      });
      return;
    }

    if (callerRole !== 'owner' && callerRole !== 'admin') {
      res.status(403).json({
        error: 'Only workspace owners and administrators can remove members',
        code: 'FORBIDDEN',
      });
      return;
    }

    const deleted = await db
      .delete(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.orgId, orgId)))
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: 'Member not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
