'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';

interface OnboardingData {
  orgName: string;
  teamSize: string;
  productCategory: string;
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
        product_category: data.productCategory || 'B2B',
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
    const { error: profileError } = await adminSupabase.from('users').upsert({
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

    // 3b. Pre-configure score weights based on SaaS product category
    let weights = {
      org_id: org.id,
      login_frequency_30d_weight: 15,
      login_frequency_14d_weight: 10,
      login_frequency_7d_weight: 10,
      feature_adoption_weight: 20,
      usage_trend_weight: 15,
      support_volume_weight: 10,
      support_sentiment_weight: 5,
      billing_events_weight: 10,
      onboarding_time_weight: 5,
    };

    const category = (data.productCategory || 'B2B').toUpperCase();
    if (category === 'PLG') {
      weights = {
        org_id: org.id,
        login_frequency_30d_weight: 20,
        login_frequency_14d_weight: 15,
        login_frequency_7d_weight: 10,
        feature_adoption_weight: 25,
        usage_trend_weight: 15,
        support_volume_weight: 5,
        support_sentiment_weight: 3,
        billing_events_weight: 5,
        onboarding_time_weight: 2,
      };
    } else if (category === 'ENTERPRISE') {
      weights = {
        org_id: org.id,
        login_frequency_30d_weight: 10,
        login_frequency_14d_weight: 5,
        login_frequency_7d_weight: 5,
        feature_adoption_weight: 15,
        usage_trend_weight: 10,
        support_volume_weight: 20,
        support_sentiment_weight: 15,
        billing_events_weight: 10,
        onboarding_time_weight: 10,
      };
    }

    const { error: weightsError } = await adminSupabase.from('score_weights').insert(weights);

    if (weightsError) {
      console.error('Failed to initialize score weights:', weightsError);
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
      const { error: intError } = await adminSupabase.from('integrations').insert({
        org_id: org.id,
        provider: provider,
        status: 'pending',
        config: isCsv ? { type: 'manual_csv' } : {},
      });

      if (intError) {
        console.error('Integration creation warning:', intError);
      }
    }

    // 5. Send out team invites if present
    if (data.teamEmails && data.teamEmails.length > 0) {
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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      for (const email of data.teamEmails) {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Insert into invites table
        const { error: inviteError } = await adminSupabase.from('invites').insert({
          org_id: org.id,
          email: email,
          role: 'member',
          token: token,
          status: 'pending',
          expires_at: expiresAt.toISOString(),
        });

        if (inviteError) {
          console.error(`Failed to create invite record for ${email}:`, inviteError);
          continue;
        }

        // Send email
        const inviteLink = `${appUrl}/signup?token=${token}`;
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@retentiq.io',
            to: email,
            subject: `[RetentIQ] Join your team's workspace`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                <h2>You've been invited to join ${data.orgName} workspace on RetentIQ!</h2>
                <p>Click the link below to sign up and accept the invite:</p>
                <p style="margin: 24px 0;">
                  <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
                </p>
                <p style="font-size: 11px; color: #64748b;">This invite link expires in 7 days.</p>
              </div>
            `,
          });
        } catch (mailErr: any) {
          console.error(`Failed to send email invite to ${email}:`, mailErr.message);
        }
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
