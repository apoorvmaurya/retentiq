-- 11. Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Playbooks table
CREATE TABLE IF NOT EXISTS public.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('health_drop', 'manual')),
  trigger_threshold INT DEFAULT 40,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Ingestion Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. ROI Aggregates table
CREATE TABLE IF NOT EXISTS public.roi_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  accounts_saved INT NOT NULL DEFAULT 0,
  revenue_saved NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_aggregates ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY tasks_policy ON public.tasks
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY playbooks_policy ON public.playbooks
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY jobs_policy ON public.jobs
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY roi_aggregates_policy ON public.roi_aggregates
  FOR ALL TO authenticated USING (org_id = public.get_user_org_id()) WITH CHECK (org_id = public.get_user_org_id());
