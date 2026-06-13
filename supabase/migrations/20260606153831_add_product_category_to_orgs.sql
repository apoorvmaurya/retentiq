-- Add product_category column to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS product_category TEXT DEFAULT 'B2B';
