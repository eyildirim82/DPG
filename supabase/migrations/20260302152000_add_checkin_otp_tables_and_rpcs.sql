-- =============================================================================
-- Migration: Add check-in OTP tables and RPC skeletons
-- Date: 2026-03-02
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cf_checkin_otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tc_no text NOT NULL,
  email text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempt integer NOT NULL DEFAULT 5,
  cooldown_until timestamptz,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cf_checkin_otp_requests_tc_created
  ON public.cf_checkin_otp_requests (tc_no, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cf_checkin_otp_requests_expires_at
  ON public.cf_checkin_otp_requests (expires_at);

CREATE TABLE IF NOT EXISTS public.cf_checkin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tc_no text NOT NULL,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cf_checkin_sessions_tc_created
  ON public.cf_checkin_sessions (tc_no, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cf_checkin_sessions_expires_at
  ON public.cf_checkin_sessions (expires_at);

ALTER TABLE public.cf_checkin_otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_checkin_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_checkin_otp_requests" ON public.cf_checkin_otp_requests;
CREATE POLICY "deny_all_checkin_otp_requests"
  ON public.cf_checkin_otp_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_checkin_sessions" ON public.cf_checkin_sessions;
CREATE POLICY "deny_all_checkin_sessions"
  ON public.cf_checkin_sessions
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.request_checkin_otp(p_tc_no text)
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
      'cooldown_seconds', GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_existing_request.cooldown_until - now()))))
    );
  END IF;

  -- Invalidate existing unconsumed OTP requests for this TC.
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

  -- NOTE: OTP mail dispatch will be integrated in the next step (Edge Function).
  -- This skeleton RPC only creates and stores OTP securely.

  RETURN jsonb_build_object(
    'success', true,
    'masked_email', regexp_replace(v_email, '^(.{2}).*(@.*)$', '\1***\2'),
    'cooldown_seconds', 60,
    'message', 'OTP kodu gönderim kuyruğuna alındı.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_checkin_otp(p_tc_no text, p_otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tc_no text;
  v_otp text;
  v_request record;
  v_submission record;
  v_session_token text;
BEGIN
  IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
  END IF;

  IF p_otp IS NULL OR trim(p_otp) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'OTP kodu boş olamaz.');
  END IF;

  v_tc_no := trim(p_tc_no);
  v_otp := trim(p_otp);

  SELECT *
  INTO v_request
  FROM public.cf_checkin_otp_requests
  WHERE tc_no = v_tc_no
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'otp_not_found', 'message', 'Doğrulanacak aktif OTP bulunamadı.');
  END IF;

  IF v_request.expires_at <= now() THEN
    UPDATE public.cf_checkin_otp_requests
    SET consumed_at = now()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', false, 'error_type', 'otp_expired', 'message', 'OTP kodunun süresi dolmuş.');
  END IF;

  IF v_request.attempt_count >= v_request.max_attempt THEN
    UPDATE public.cf_checkin_otp_requests
    SET consumed_at = now()
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', false, 'error_type', 'max_attempt', 'message', 'Maksimum deneme sayısına ulaşıldı.');
  END IF;

  IF crypt(v_otp, v_request.otp_hash) <> v_request.otp_hash THEN
    UPDATE public.cf_checkin_otp_requests
    SET attempt_count = attempt_count + 1
    WHERE id = v_request.id;

    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_otp', 'message', 'OTP kodu hatalı.');
  END IF;

  UPDATE public.cf_checkin_otp_requests
  SET consumed_at = now()
  WHERE id = v_request.id;

  v_session_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.cf_checkin_sessions (tc_no, session_token, expires_at)
  VALUES (v_tc_no, v_session_token, now() + interval '15 minutes');

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

GRANT EXECUTE ON FUNCTION public.request_checkin_otp(text) TO anon;
GRANT EXECUTE ON FUNCTION public.request_checkin_otp(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.verify_checkin_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_checkin_otp(text, text) TO authenticated;
