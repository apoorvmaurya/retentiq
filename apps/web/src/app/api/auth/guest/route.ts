import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { seedGuestWorkspace } from '@/lib/seedGuestWorkspace';

export const dynamic = 'force-dynamic';

const GUEST_EMAIL = 'guest.recruiter@retentiq.io';
const GUEST_PASSWORD = 'RetentIQ2026!GuestDemo';

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();

    // Check for reset flag in URL query or body
    const searchParams = request.nextUrl.searchParams;
    let isReset = searchParams.get('reset') === 'true';

    try {
      const body = await request.json().catch(() => ({}));
      if (body && body.reset) {
        isReset = true;
      }
    } catch {
      // Body may be empty, which is normal for a POST trigger
    }

    // 1. Locate or create the guest user in Supabase Auth
    let guestUserId: string | null = null;

    const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 50,
    });

    if (listError) {
      console.error('[GuestAuth] Failed to list users:', listError);
      const isPaused =
        listError.message?.toLowerCase().includes('paused') ||
        listError.message?.toLowerCase().includes('inactive') ||
        listError.message?.toLowerCase().includes('timeout') ||
        (listError as any).status === 503 ||
        (listError as any).status === 504;

      return NextResponse.json(
        {
          success: false,
          error: isPaused
            ? 'Database is currently paused or inactive. Please retry in a few moments.'
            : `Database auth error: ${listError.message}`,
          code: isPaused ? 'DB_PAUSED' : 'AUTH_ERROR',
        },
        { status: 503 },
      );
    }

    const existingUser = listData?.users?.find((u) => u.email === GUEST_EMAIL);

    if (existingUser) {
      guestUserId = existingUser.id;
      // Only re-synchronize password if force reset is explicitly requested,
      // avoiding invalidating active user sessions on normal logins
      if (isReset) {
        await adminSupabase.auth.admin.updateUserById(guestUserId, {
          password: GUEST_PASSWORD,
          email_confirm: true,
        });
      }
    } else {
      // Create user with pre-confirmed email
      const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
        email: GUEST_EMAIL,
        password: GUEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Recruiter Guest',
        },
      });

      if (createError || !created?.user) {
        console.error('[GuestAuth] Failed to create guest user:', createError);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to create guest credentials: ${createError?.message}`,
            code: 'USER_CREATION_FAILED',
          },
          { status: 500 },
        );
      }
      guestUserId = created.user.id;
    }

    // 2. Seed or verify the sample workspace
    const seedResult = await seedGuestWorkspace(adminSupabase, guestUserId, isReset);

    return NextResponse.json({
      success: true,
      email: GUEST_EMAIL,
      password: GUEST_PASSWORD,
      org_id: seedResult.orgId,
      seeded: seedResult.seeded,
      customer_count: seedResult.customerCount,
      message: 'Guest workspace initialized successfully.',
    });
  } catch (err: any) {
    console.error('[GuestAuth] Exception in guest login route:', err);
    const msg = err?.message || String(err);
    const isPaused =
      msg.toLowerCase().includes('fetch failed') ||
      msg.toLowerCase().includes('fetcherror') ||
      msg.toLowerCase().includes('timeout') ||
      msg.toLowerCase().includes('econnrefused') ||
      msg.toLowerCase().includes('econnreset') ||
      msg.toLowerCase().includes('503') ||
      msg.toLowerCase().includes('paused');

    return NextResponse.json(
      {
        success: false,
        error: isPaused
          ? 'Database is currently paused or inactive. Please retry in a few moments.'
          : err.message || 'Internal error setting up guest session',
        code: isPaused ? 'DB_PAUSED' : 'INTERNAL_ERROR',
      },
      { status: 503 },
    );
  }
}
