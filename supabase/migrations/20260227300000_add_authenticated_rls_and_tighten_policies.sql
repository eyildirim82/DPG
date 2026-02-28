-- =====================================================
-- Migration: Authenticated RLS policies for admin tables
-- Adds full CRUD access for authenticated users (admins)
-- Tightens cf_email_templates and cf_quota_settings
-- =====================================================

-- 1) cf_whitelist — full access for authenticated admins
CREATE POLICY "authenticated_full_access" ON public.cf_whitelist
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2) cf_submissions — full access for authenticated admins
CREATE POLICY "authenticated_full_access" ON public.cf_submissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3) cf_audit_logs — full access for authenticated admins
CREATE POLICY "authenticated_full_access" ON public.cf_audit_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4) cf_email_templates — remove public read, keep authenticated only
DROP POLICY IF EXISTS "Allow public read on email_templates" ON public.cf_email_templates;

-- 5) cf_quota_settings — tighten to authenticated only
DROP POLICY IF EXISTS "Allow authenticated read on quota_settings" ON public.cf_quota_settings;
DROP POLICY IF EXISTS "Allow authenticated update on quota_settings" ON public.cf_quota_settings;

CREATE POLICY "authenticated_read_quota" ON public.cf_quota_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_update_quota" ON public.cf_quota_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6) cf_forms — add authenticated full access (for admin FormBuilder)
CREATE POLICY "authenticated_full_access" ON public.cf_forms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
