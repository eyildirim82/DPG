-- =============================================================================
-- Migration: Add runtime flags for safe check-in rollout
-- Date: 2026-03-02
-- =============================================================================

ALTER TABLE public.cf_quota_settings
ADD COLUMN IF NOT EXISTS applications_closed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS checkin_actions_enabled boolean NOT NULL DEFAULT false;

UPDATE public.cf_quota_settings
SET
  applications_closed = COALESCE(applications_closed, false),
  checkin_enabled = COALESCE(checkin_enabled, false),
  otp_enabled = COALESCE(otp_enabled, false),
  checkin_actions_enabled = COALESCE(checkin_actions_enabled, false)
WHERE
  applications_closed IS NULL
  OR checkin_enabled IS NULL
  OR otp_enabled IS NULL
  OR checkin_actions_enabled IS NULL;

CREATE OR REPLACE FUNCTION public.get_public_runtime_flags()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'countdown_enabled', COALESCE(s.countdown_enabled, true),
    'applications_closed', COALESCE(s.applications_closed, false),
    'checkin_enabled', COALESCE(s.checkin_enabled, false),
    'otp_enabled', COALESCE(s.otp_enabled, false),
    'checkin_actions_enabled', COALESCE(s.checkin_actions_enabled, false)
  )
  FROM (
    SELECT
      countdown_enabled,
      applications_closed,
      checkin_enabled,
      otp_enabled,
      checkin_actions_enabled
    FROM public.cf_quota_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  ) s;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_runtime_flags() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_runtime_flags() TO authenticated;
