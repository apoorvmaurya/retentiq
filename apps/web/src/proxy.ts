import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding');
  const isAuthRoute =
    request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

  if (isDashboardRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if onboarding is complete
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !profile.onboarding_complete) {
      return NextResponse.redirect(new URL('/onboarding?step=1', request.url));
    }
  }

  if (isOnboardingRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // If onboarding is already complete, redirect to /dashboard
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.onboarding_complete) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (isAuthRoute && user) {
    // Check if onboarding is complete to redirect authenticated users
    const { data: profile } = await supabase
      .from('users')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.onboarding_complete) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } else {
      return NextResponse.redirect(new URL('/onboarding?step=1', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding', '/login', '/signup'],
};
