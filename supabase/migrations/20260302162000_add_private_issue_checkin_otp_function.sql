-- =============================================================================
-- Migration: Private server-side OTP issue function for Edge Function dispatch
-- Date: 2026-03-02
-- =============================================================================

CREATE OR REPLACE FUNCTION public.issue_checkin_otp_for_email(p_tc_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tc_no text;
  v_settings record;
  v_submission record;
  v_existing_request record;
  v_otp_code text;
  v_email text;
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
    COALESCE(otp_enabled, false) AS otp_enabled
  INTO v_settings
  FROM public.cf_quota_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF COALESCE(v_settings.applications_closed, false) = false
     OR COALESCE(v_settings.checkin_enabled, false) = false
     OR COALESCE(v_settings.otp_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'checkin_not_available', 'message', 'Check-in sistemi henüz aktif değil.');
  END IF;

  SELECT
    s.id,
    s.status,
    s.ticket_type,
    s.data,
    s.full_name,
    COALESCE(s.data->>'email', '') AS email
  INTO v_submission
  FROM public.cf_submissions s
  WHERE s.tc_no = v_tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Bu TC numarası için uygun başvuru bulunamadı.');
  END IF;

  v_email := NULLIF(trim(v_submission.email), '');
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'email_not_found', 'message', 'Başvuru e-posta bilgisi bulunamadı.');
  END IF;

  SELECT *
  INTO v_existing_request
  FROM public.cf_checkin_otp_requests
  WHERE tc_no = v_tc_no
    AND consumed_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_existing_request.cooldown_until IS NOT NULL AND v_existing_request.cooldown_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_type', 'cooldown',
      'cooldown_seconds', GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_existing_request.cooldown_until - now())))),
      'masked_email', regexp_replace(v_email, '^(.{2}).*(@.*)$', '\1***\2')
    );
  END IF;

  UPDATE public.cf_checkin_otp_requests
  SET consumed_at = now()
  WHERE tc_no = v_tc_no
    AND consumed_at IS NULL;

  v_otp_code := LPAD((FLOOR(random() * 1000000))::int::text, 6, '0');

  INSERT INTO public.cf_checkin_otp_requests (
    tc_no,
    email,
    otp_hash,
    expires_at,
    attempt_count,
    max_attempt,
    cooldown_until
  ) VALUES (
    v_tc_no,
    v_email,
    crypt(v_otp_code, gen_salt('bf')),
    now() + interval '5 minutes',
    0,
    5,
    now() + interval '60 seconds'
  );

  RETURN jsonb_build_object(
    'success', true,
    'tc_no', v_tc_no,
    'email', v_email,
    'full_name', COALESCE(v_submission.full_name, v_submission.data->>'name', ''),
    'otp_code', v_otp_code,
    'masked_email', regexp_replace(v_email, '^(.{2}).*(@.*)$', '\1***\2'),
    'cooldown_seconds', 60,
    'expires_minutes', 5
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.issue_checkin_otp_for_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.issue_checkin_otp_for_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.issue_checkin_otp_for_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_checkin_otp_for_email(text) TO service_role;
