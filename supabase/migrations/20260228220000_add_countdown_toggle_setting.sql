-- =============================================================================
-- Migration: Add admin-managed application countdown toggle
-- Date: 2026-02-28
-- =============================================================================

ALTER TABLE public.cf_quota_settings
ADD COLUMN IF NOT EXISTS countdown_enabled boolean NOT NULL DEFAULT true;

UPDATE public.cf_quota_settings
SET countdown_enabled = true
WHERE countdown_enabled IS NULL;

CREATE OR REPLACE FUNCTION public.get_application_countdown_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT countdown_enabled
      FROM public.cf_quota_settings
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1
    ),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_application_countdown_enabled() TO anon;
GRANT EXECUTE ON FUNCTION public.get_application_countdown_enabled() TO authenticated;
