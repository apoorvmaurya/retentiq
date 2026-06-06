-- Alter tasks table for outcome tracking
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative'));
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Expand integrations providers constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;
ALTER TABLE public.integrations ADD CONSTRAINT integrations_provider_check CHECK (provider IN ('slack', 'stripe', 'intercom', 'mixpanel', 'segment', 'hubspot', 'salesforce'));

-- Create invites table
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invites_policy ON public.invites;
CREATE POLICY invites_policy ON public.invites
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Create score_weights table
CREATE TABLE IF NOT EXISTS public.score_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  login_frequency_30d_weight INT DEFAULT 15,
  login_frequency_14d_weight INT DEFAULT 10,
  login_frequency_7d_weight INT DEFAULT 10,
  feature_adoption_weight INT DEFAULT 20,
  usage_trend_weight INT DEFAULT 15,
  support_volume_weight INT DEFAULT 10,
  support_sentiment_weight INT DEFAULT 5,
  billing_events_weight INT DEFAULT 10,
  onboarding_time_weight INT DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.score_weights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS score_weights_policy ON public.score_weights;
CREATE POLICY score_weights_policy ON public.score_weights
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_templates_policy ON public.email_templates;
CREATE POLICY email_templates_policy ON public.email_templates
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Create alert_rules table
CREATE TABLE IF NOT EXISTS public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alert_rules_policy ON public.alert_rules;
CREATE POLICY alert_rules_policy ON public.alert_rules
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
