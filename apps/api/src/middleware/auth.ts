import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { db, schema } from '../lib/db.js';
import { eq } from 'drizzle-orm';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
        realtime: {
          transport: ws as any,
        },
      })
    : null;

export interface AuthenticatedUser {
  id: string;
  org_id: string;
  email?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function verifySupabaseJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Bypass JWT verification for public webhooks
  if (req.path.includes('/webhook') || req.originalUrl.includes('/webhook')) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    if (supabase) {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          res.status(401).json({ error: 'Invalid or expired token', code: 'AUTH_INVALID_TOKEN' });
          return;
        }

        // Look up user profile in our users table
        const profile = await db
          .select({ id: schema.users.id, orgId: schema.users.orgId, role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, user.id))
          .limit(1);

        if (profile.length > 0) {
          req.user = {
            id: profile[0].id,
            org_id: profile[0].orgId,
            email: user.email,
            role: profile[0].role,
          };
          next();
          return;
        }

        if (req.path.includes('/invites/accept/') || req.originalUrl.includes('/invites/accept/')) {
          req.user = { id: user.id, org_id: '', email: user.email };
          next();
          return;
        }
      } catch (err) {
        console.error('[Auth] Token verification / profile query failed:', err);
      }
    } else {
      console.warn('[Auth] Supabase URL or service key is not configured.');
    }
  }

  // Development fallback: attach the first available org (only in dev/test mode)
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    !process.env.NODE_ENV
  ) {
    try {
      const orgs = await db.select().from(schema.organizations).limit(1);
      if (orgs.length > 0) {
        console.warn(
          `[Auth] Bypassing authentication using dev fallback user for organization: ${orgs[0].id}`,
        );
        req.user = {
          id: '07898715-c17c-4e76-9d0a-35acb50be73e',
          org_id: orgs[0].id,
          email: 'test_confirmed_user@retentiq.com',
        };
        next();
        return;
      }
    } catch (dbErr) {
      console.error('[Auth] DB query failed in fallback:', dbErr);
    }
  }

  res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
}
