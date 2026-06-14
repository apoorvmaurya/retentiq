import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token = searchParams.get('token');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // If there is an invitation token, accept it immediately
        if (token) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const accessToken = session?.access_token;

          if (accessToken) {
            let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
              apiUrl = apiUrl.replace(/\/$/, '') + '/api';
            }

            try {
              const res = await fetch(`${apiUrl}/users/invites/accept/${token}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              });
              if (res.ok) {
                return NextResponse.redirect(`${origin}/dashboard`);
              }
            } catch (err) {
              console.error('Failed to accept invite in auth callback:', err);
            }
          }
        }

        // Check if onboarding is complete
        const { data: profile } = await supabase
          .from('users')
          .select('onboarding_complete')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile || !profile.onboarding_complete) {
          return NextResponse.redirect(`${origin}/onboarding?step=1`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there's an error, redirect to login page with error message
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
