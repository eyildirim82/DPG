-- =============================================================================
-- Migration: Add admin-controlled OTP bypass flag and RPC for test environments
-- Date: 2026-03-03
-- =============================================================================

ALTER TABLE public.cf_quota_settings
ADD COLUMN IF NOT EXISTS otp_bypass_enabled boolean NOT NULL DEFAULT false;

UPDATE public.cf_quota_settings
SET otp_bypass_enabled = false
WHERE otp_bypass_enabled IS NULL;

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
    'otp_bypass_enabled', COALESCE(s.otp_bypass_enabled, false),
    'checkin_actions_enabled', COALESCE(s.checkin_actions_enabled, false)
  )
  FROM (
    SELECT
      countdown_enabled,
      applications_closed,
      checkin_enabled,
      otp_enabled,
      otp_bypass_enabled,
      checkin_actions_enabled
    FROM public.cf_quota_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.bypass_checkin_otp(p_tc_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tc_no text;
  v_settings record;
  v_submission record;
  v_session_token text;
BEGIN
  IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
  END IF;

  v_tc_no := trim(p_tc_no);

  IF length(v_tc_no) != 11 OR v_tc_no !~ '^\d{11}$' OR left(v_tc_no, 1) = '0' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Geçersiz TC Kimlik Numarası formatı.');
  END IF;

  SELECT
    COALESCE(applications_closed, false) AS applications_closed,
    COALESCE(checkin_enabled, false) AS checkin_enabled,
    COALESCE(checkin_actions_enabled, false) AS checkin_actions_enabled,
    COALESCE(otp_bypass_enabled, false) AS otp_bypass_enabled
  INTO v_settings
  FROM public.cf_quota_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF COALESCE(v_settings.applications_closed, false) = false
     OR COALESCE(v_settings.checkin_enabled, false) = false
     OR COALESCE(v_settings.checkin_actions_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'checkin_not_available', 'message', 'Check-in sistemi henüz aktif değil.');
  END IF;

  IF COALESCE(v_settings.otp_bypass_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'bypass_not_enabled', 'message', 'OTP bypass devre dışı.');
  END IF;

  SELECT
    s.status,
    s.ticket_type,
    s.data,
    s.full_name
  INTO v_submission
  FROM public.cf_submissions s
  WHERE s.tc_no = v_tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Bu TC numarası için uygun başvuru bulunamadı.');
  END IF;

  v_session_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.cf_checkin_sessions (tc_no, session_token, expires_at)
  VALUES (v_tc_no, v_session_token, now() + interval '15 minutes');

  RETURN jsonb_build_object(
    'success', true,
    'checkin_token', v_session_token,
    'status', v_submission.status,
    'ticket_type', v_submission.ticket_type,
    'full_name', v_submission.full_name,
    'application_data', v_submission.data
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_runtime_flags() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_runtime_flags() TO authenticated;

GRANT EXECUTE ON FUNCTION public.bypass_checkin_otp(text) TO anon;
GRANT EXECUTE ON FUNCTION public.bypass_checkin_otp(text) TO authenticated;
