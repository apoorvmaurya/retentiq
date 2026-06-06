-- Enable pg_jsonschema if available, standard uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  team_size INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY, -- Maps to auth.users.id in Supabase
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  name TEXT,
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  mrr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Health Scores table
CREATE TABLE IF NOT EXISTS public.health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  churn_probability NUMERIC(3, 2) NOT NULL CHECK (churn_probability >= 0.00 AND churn_probability <= 1.00),
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low', 'medium', 'high', 'critical')),
  top_risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_action TEXT NOT NULL,
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
  scored_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  score_at_trigger INT NOT NULL CHECK (score_at_trigger >= 0 AND score_at_trigger <= 100),
  delivery_channels JSONB NOT NULL DEFAULT '{"slack": false, "email": false}'::jsonb,
  acknowledged BOOLEAN DEFAULT false
);

-- 7. Integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('slack', 'stripe', 'intercom', 'mixpanel')),
  status TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Retention Actions table
CREATE TABLE IF NOT EXISTS public.retention_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  revenue_saved NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  actioned_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Alert Configs table
CREATE TABLE IF NOT EXISTS public.alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  threshold INT DEFAULT 40 CHECK (threshold >= 0 AND threshold <= 100),
  notify_slack BOOLEAN DEFAULT false,
  notify_email BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Groq Usage table
CREATE TABLE IF NOT EXISTS public.groq_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  tokens_used INT NOT NULL CHECK (tokens_used >= 0),
  model TEXT NOT NULL,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS helper function to avoid circular policies
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groq_usage ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies

-- Organizations
CREATE POLICY org_select_policy ON public.organizations
  FOR SELECT TO authenticated USING (id = public.get_user_org_id());

CREATE POLICY org_write_policy ON public.organizations
  FOR ALL TO authenticated USING (id = public.get_user_org_id());

-- Users
CREATE POLICY users_select_policy ON public.users
  FOR SELECT TO authenticated USING (org_id = public.get_user_org_id());

CREATE POLICY users_self_policy ON public.users
  FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Customers
CREATE POLICY customers_policy ON public.customers
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Health Scores
CREATE POLICY health_scores_policy ON public.health_scores
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Events
CREATE POLICY events_policy ON public.events
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Alerts
CREATE POLICY alerts_policy ON public.alerts
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Integrations
CREATE POLICY integrations_policy ON public.integrations
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Retention Actions
CREATE POLICY retention_actions_policy ON public.retention_actions
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Alert Configs
CREATE POLICY alert_configs_policy ON public.alert_configs
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

-- Groq Usage
CREATE POLICY groq_usage_policy ON public.groq_usage
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
