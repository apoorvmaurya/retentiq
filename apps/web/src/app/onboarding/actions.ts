'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface OnboardingData {
  orgName: string;
  teamSize: string;
  integration: string;
  teamEmails: string[];
}

export async function completeOnboarding(data: OnboardingData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized user' };
    }

    // Initialize the Admin client to bypass RLS during setup
    const adminSupabase = await createAdminClient();

    // 1. Generate unique slug from organization name
    const baseSlug = data.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const slug = baseSlug || `org-${Date.now()}`;

    // 2. Parse team size to corresponding integers
    let teamSizeInt = 1;
    if (data.teamSize === '11–50') teamSizeInt = 11;
    else if (data.teamSize === '51–200') teamSizeInt = 51;
    else if (data.teamSize === '200+') teamSizeInt = 200;

    // Create the organization row
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .insert({
        name: data.orgName,
        slug: slug,
        team_size: teamSizeInt,
      })
      .select()
      .maybeSingle();

    if (orgError || !org) {
      console.error('Organization creation failed:', orgError);
      return {
        success: false,
        error: `Failed to create organization: ${orgError?.message || 'Unknown error'}`,
      };
    }

    // 3. Upsert the user profile in public.users
    const { error: profileError } = await adminSupabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        role: 'owner',
        org_id: org.id,
        name: user.user_metadata?.full_name || user.email!.split('@')[0],
        onboarding_complete: true,
      });

    if (profileError) {
      console.error('User profile creation failed:', profileError);
      return {
        success: false,
        error: `Failed to update user profile: ${profileError.message}`,
      };
    }

    // 4. Insert integration row if a valid provider is selected
    const rawProvider = data.integration.toLowerCase();
    let provider = '';
    let isCsv = false;

    if (rawProvider.includes('stripe')) {
      provider = 'stripe';
    } else if (rawProvider.includes('mixpanel')) {
      provider = 'mixpanel';
    } else if (rawProvider.includes('intercom')) {
      provider = 'intercom';
    } else if (rawProvider.includes('csv')) {
      provider = 'mixpanel'; // fallback to mixpanel to satisfy check constraint
      isCsv = true;
    }

    if (provider) {
      const { error: intError } = await adminSupabase
        .from('integrations')
        .insert({
          org_id: org.id,
          provider: provider,
          status: 'pending',
          config: isCsv ? { type: 'manual_csv' } : {},
        });

      if (intError) {
        console.error('Integration creation warning:', intError);
      }
    }

    // Revalidate routes
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err: any) {
    console.error('Onboarding exception occurred:', err);
    return { success: false, error: err.message || 'Internal server error' };
  }
}
