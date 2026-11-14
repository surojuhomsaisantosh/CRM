-- ==============================================================================
-- UNIVERSAL CRM — SUPABASE POSTGRESQL SCHEMA
-- Generated for multi-tenant / generic company CRM deployment
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ROLES & RBAC PERMISSIONS TABLES
-- ==============================================================================

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Profiles table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'Admin' REFERENCES public.roles(name) ON UPDATE CASCADE ON DELETE SET DEFAULT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Role-level permissions matrix
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit', 'none')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_role_module UNIQUE (role_id, module_name)
);

-- User-level permissions override matrix
CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_name TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('view', 'edit', 'none')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_module UNIQUE (user_id, module_name)
);

-- ==============================================================================
-- 3. CRM MODULES & LEAD STATUS CONFIGURATION
-- ==============================================================================

-- Core CRM modules registry
CREATE TABLE IF NOT EXISTS public.crm_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Dynamic lead pipeline statuses
CREATE TABLE IF NOT EXISTS public.lead_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key TEXT UNIQUE NOT NULL,
    color_bg TEXT NOT NULL,
    color_text TEXT NOT NULL,
    color_border TEXT,
    description TEXT,
    sort_order INT DEFAULT 0 NOT NULL,
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 4. LEADS & PIPELINE TABLES
-- ==============================================================================

-- Main leads repository
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT DEFAULT '',
    property_interest TEXT,
    source_page TEXT DEFAULT 'contact',
    status TEXT DEFAULT 'new',
    location TEXT,
    project TEXT,
    enquiry_type TEXT,
    downloaded_item TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning-fast search, filter & status grouping
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_source_page ON public.leads (source_page);
CREATE INDEX IF NOT EXISTS idx_leads_project ON public.leads (project);

-- Lead interactions / timeline activities (e.g., WhatsApp bot chats, callbacks, call logs)
CREATE TABLE IF NOT EXISTS public.lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON public.lead_activities(created_at ASC);

-- Meta (Facebook/Instagram) lead generation forms mapping
CREATE TABLE IF NOT EXISTS public.meta_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 5. NOTIFICATIONS, DIGESTS & ALERT RECIPIENTS
-- ==============================================================================

-- Daily email summary report recipients
CREATE TABLE IF NOT EXISTS public.report_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    report_times TEXT[] DEFAULT ARRAY['09:00', '18:00'],
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Daily WhatsApp summary report recipients
CREATE TABLE IF NOT EXISTS public.whatsapp_report_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    report_times TEXT[] DEFAULT ARRAY['09:00', '18:00'],
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- System monitoring & failure alerts (token expiration, webhooks failing, API drops)
CREATE TABLE IF NOT EXISTS public.system_alert_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    phone TEXT,
    name TEXT,
    channel TEXT DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 6. PROJECTS (Fallback / Native Catalog for the new company)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_name TEXT,
    location TEXT,
    description TEXT,
    google_maps_url TEXT,
    brochure_url TEXT,
    layout_pdf_url TEXT,
    rera_certificate_url TEXT,
    hmda_dtcp_certificate_url TEXT,
    approval_certificate_label TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- ==============================================================================
-- 7. INITIAL SEED DATA (Default System Setup)
-- ==============================================================================

-- Default Roles
INSERT INTO public.roles (name)
VALUES ('Super Admin'), ('Admin'), ('Telecaller')
ON CONFLICT (name) DO NOTHING;

-- Default CRM Modules
INSERT INTO public.crm_modules (key, name, is_enabled)
VALUES 
    ('dashboard', 'Dashboard', true),
    ('leads', 'Leads Management', true),
    ('whatsapp', 'WhatsApp Hub', true),
    ('projects', 'Projects Catalog', true),
    ('reports', 'Reports & Analytics', true),
    ('modules', 'Feature & Access Modules', true),
    ('users', 'User Administration', true),
    ('settings', 'Account Settings', true)
ON CONFLICT (key) DO NOTHING;

-- Default Lead Pipeline Statuses
INSERT INTO public.lead_statuses (name, key, color_bg, color_text, color_border, sort_order, is_system, is_default)
VALUES
    ('New', 'new', 'bg-blue-50', 'text-blue-700', 'border-blue-200', 1, true, true),
    ('Uncontacted', 'uncontacted', 'bg-amber-50', 'text-amber-700', 'border-amber-200', 2, true, false),
    ('Contacted', 'contacted', 'bg-indigo-50', 'text-indigo-700', 'border-indigo-200', 3, true, false),
    ('Qualified', 'qualified', 'bg-emerald-50', 'text-emerald-700', 'border-emerald-200', 4, true, false),
    ('Closed / Won', 'closed', 'bg-teal-50', 'text-teal-700', 'border-teal-200', 5, true, false),
    ('Rejected / Lost', 'rejected', 'bg-red-50', 'text-red-700', 'border-red-200', 6, true, false)
ON CONFLICT (key) DO NOTHING;

-- Trigger for public.profiles sync on new auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Admin')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users with active profile to read and write (Service role bypasses RLS)
CREATE POLICY "Allow authenticated users full access" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access on leads" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on lead_activities" ON public.lead_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on lead_statuses" ON public.lead_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on crm_modules" ON public.crm_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on permissions" ON public.role_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on user_perms" ON public.user_permissions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on meta_forms" ON public.meta_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on recipients" ON public.report_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on wa_recipients" ON public.whatsapp_report_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on alerts" ON public.system_alert_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated users full access on projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
