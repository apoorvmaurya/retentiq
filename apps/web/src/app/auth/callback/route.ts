import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
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
