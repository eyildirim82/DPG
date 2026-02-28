-- =============================================================================
-- Migration: Remove dev-only RLS policies & harden table access
-- Date: 2026-02-27
-- Purpose: Drop "Allow all access for dev" policies that expose all data
-- =============================================================================

-- 1. Drop dangerous dev-only policies
DROP POLICY IF EXISTS "Allow all access for dev on forms" ON public.cf_forms;
DROP POLICY IF EXISTS "Allow all access for dev on submissions" ON public.cf_submissions;
DROP POLICY IF EXISTS "Allow all access for dev on whitelist" ON public.cf_whitelist;

-- 2. Drop overly-permissive public policies
DROP POLICY IF EXISTS "Allow public read of whitelist" ON public.cf_whitelist;
DROP POLICY IF EXISTS "Allow public insert to submissions" ON public.cf_submissions;

-- 3. cf_forms: Public can only READ active forms (no write)
CREATE POLICY "anon_read_active_forms"
  ON public.cf_forms FOR SELECT
  USING (is_active = true);

-- 4. cf_whitelist: NO direct public access at all
--    All checks go through SECURITY DEFINER RPCs (check_and_lock_slot etc.)
--    If you later add Supabase Auth for admins, add:
--    CREATE POLICY "admin_full_whitelist" ON public.cf_whitelist FOR ALL
--      USING (auth.jwt() ->> 'role' = 'admin');

-- 5. cf_submissions: NO direct public SELECT/INSERT/UPDATE/DELETE
--    All mutations go through SECURITY DEFINER RPCs (submit_application, cancel_application)
--    Reading goes through RPCs (get_ticket_stats, get_table_stats)

-- 6. cf_quota_settings: No public access (admin-only via RPC or future auth)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cf_quota_settings' AND schemaname = 'public') THEN
    EXECUTE 'ALTER TABLE public.cf_quota_settings ENABLE ROW LEVEL SECURITY';
    -- Drop any existing permissive policy
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Allow all access for dev on quota_settings" ON public.cf_quota_settings';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 7. cf_email_templates: No public access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cf_email_templates' AND schemaname = 'public') THEN
    EXECUTE 'ALTER TABLE public.cf_email_templates ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Allow all access for dev on email_templates" ON public.cf_email_templates';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 8. cf_audit_logs: No public access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cf_audit_logs' AND schemaname = 'public') THEN
    EXECUTE 'ALTER TABLE public.cf_audit_logs ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Allow all access for dev on audit_logs" ON public.cf_audit_logs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- 9. cf_email_logs: No public access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'cf_email_logs' AND schemaname = 'public') THEN
    EXECUTE 'ALTER TABLE public.cf_email_logs ENABLE ROW LEVEL SECURITY';
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Allow all access for dev on email_logs" ON public.cf_email_logs';
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
