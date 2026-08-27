-- ==============================================================================
-- JAAGO FOUNDATION ERP — ORGANIZATION & PEOPLE/CULTURE MODULE SCHEMA
-- Standard: DATABASE-STANDARD.md v1.0
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT ('org-' || gen_random_uuid()::text),
    name TEXT NOT NULL,
    code TEXT,
    logo_url TEXT DEFAULT '',
    address TEXT DEFAULT '',
    city TEXT DEFAULT 'Dhaka',
    division TEXT DEFAULT 'Dhaka Division',
    postal_code TEXT DEFAULT '1213',
    country TEXT DEFAULT 'Bangladesh',
    partner_country TEXT DEFAULT 'Bangladesh',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    website TEXT DEFAULT '',
    email_domain TEXT DEFAULT '',
    brand_color TEXT DEFAULT '#F59E0B',
    tax_id TEXT DEFAULT '',
    company_id TEXT DEFAULT '',
    currency TEXT DEFAULT 'BDT',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Dhaka';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'Dhaka Division';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '1213';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Bangladesh';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS partner_country TEXT DEFAULT 'Bangladesh';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS email_domain TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#F59E0B';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_id TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT '';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BDT';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on organizations" ON public.organizations;
CREATE POLICY "Allow public read on organizations" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Allow full access on organizations" ON public.organizations;
CREATE POLICY "Allow full access on organizations" ON public.organizations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
