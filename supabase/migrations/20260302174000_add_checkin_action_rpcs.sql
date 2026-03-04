-- =============================================================================
-- Migration: Add check-in action RPCs (context, continue, update, cancel)
-- Date: 2026-03-02
-- =============================================================================

ALTER TABLE public.cf_submissions
ADD COLUMN IF NOT EXISTS checkin_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_checkin_context(p_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_submission record;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Session token boş olamaz.');
  END IF;

  SELECT * INTO v_session
  FROM public.cf_checkin_sessions
  WHERE session_token = trim(p_session_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_not_found', 'message', 'Check-in oturumu bulunamadı.');
  END IF;

  IF v_session.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_expired', 'message', 'Check-in oturum süresi dolmuş.');
  END IF;

  SELECT
    s.id,
    s.status,
    s.ticket_type,
    s.full_name,
    s.data,
    s.checkin_at
  INTO v_submission
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'tc_no', v_session.tc_no,
    'status', v_submission.status,
    'ticket_type', v_submission.ticket_type,
    'full_name', v_submission.full_name,
    'checkin_at', v_submission.checkin_at,
    'application_data', v_submission.data
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_confirm_and_continue(p_session_token text, p_table_preferences jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_submission_id uuid;
  v_settings record;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Session token boş olamaz.');
  END IF;

  SELECT * INTO v_session
  FROM public.cf_checkin_sessions
  WHERE session_token = trim(p_session_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_not_found', 'message', 'Check-in oturumu bulunamadı.');
  END IF;

  IF v_session.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_expired', 'message', 'Check-in oturum süresi dolmuş.');
  END IF;

  SELECT
    COALESCE(checkin_enabled, false) AS checkin_enabled,
    COALESCE(checkin_actions_enabled, false) AS checkin_actions_enabled
  INTO v_settings
  FROM public.cf_quota_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF COALESCE(v_settings.checkin_enabled, false) = false
     OR COALESCE(v_settings.checkin_actions_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'actions_not_available', 'message', 'Check-in aksiyonları henüz aktif değil.');
  END IF;

  SELECT s.id INTO v_submission_id
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF v_submission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  UPDATE public.cf_submissions
  SET
    checkin_at = now(),
    seating_preference = CASE
      WHEN p_table_preferences IS NULL OR p_table_preferences = '{}'::jsonb THEN seating_preference
      ELSE p_table_preferences::text
    END,
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object('checkin_completed', true, 'checkin_completed_at', now()::text),
    updated_at = now()
  WHERE id = v_submission_id;

  UPDATE public.cf_checkin_sessions
  SET used_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object('success', true, 'message', 'Check-in başarıyla tamamlandı.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_update_application(p_session_token text, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_submission_id uuid;
  v_settings record;
  v_allowed_patch jsonb := '{}'::jsonb;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Session token boş olamaz.');
  END IF;

  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Geçerli bir güncelleme verisi gönderiniz.');
  END IF;

  SELECT * INTO v_session
  FROM public.cf_checkin_sessions
  WHERE session_token = trim(p_session_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_not_found', 'message', 'Check-in oturumu bulunamadı.');
  END IF;

  IF v_session.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_expired', 'message', 'Check-in oturum süresi dolmuş.');
  END IF;

  SELECT
    COALESCE(checkin_enabled, false) AS checkin_enabled,
    COALESCE(checkin_actions_enabled, false) AS checkin_actions_enabled
  INTO v_settings
  FROM public.cf_quota_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF COALESCE(v_settings.checkin_enabled, false) = false
     OR COALESCE(v_settings.checkin_actions_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'actions_not_available', 'message', 'Check-in aksiyonları henüz aktif değil.');
  END IF;

  IF p_patch ? 'email' THEN
    v_allowed_patch := v_allowed_patch || jsonb_build_object('email', trim(p_patch->>'email'));
  END IF;
  IF p_patch ? 'phone' THEN
    v_allowed_patch := v_allowed_patch || jsonb_build_object('phone', trim(p_patch->>'phone'));
  END IF;
  IF p_patch ? 'airline' THEN
    v_allowed_patch := v_allowed_patch || jsonb_build_object('airline', trim(p_patch->>'airline'));
  END IF;
  IF p_patch ? 'fleet' THEN
    v_allowed_patch := v_allowed_patch || jsonb_build_object('fleet', trim(p_patch->>'fleet'));
  END IF;
  IF p_patch ? 'ageGroup' THEN
    v_allowed_patch := v_allowed_patch || jsonb_build_object('ageGroup', trim(p_patch->>'ageGroup'));
  END IF;

  IF v_allowed_patch = '{}'::jsonb THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'no_allowed_fields', 'message', 'Güncellenebilir alan bulunamadı.');
  END IF;

  SELECT s.id INTO v_submission_id
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF v_submission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  UPDATE public.cf_submissions
  SET
    data = COALESCE(data, '{}'::jsonb) || v_allowed_patch || jsonb_build_object('checkin_updated_at', now()::text),
    updated_at = now()
  WHERE id = v_submission_id;

  RETURN jsonb_build_object('success', true, 'message', 'Başvuru bilgileri güncellendi.');
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_cancel_application(p_session_token text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_submission_id uuid;
  v_settings record;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Session token boş olamaz.');
  END IF;

  SELECT * INTO v_session
  FROM public.cf_checkin_sessions
  WHERE session_token = trim(p_session_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_not_found', 'message', 'Check-in oturumu bulunamadı.');
  END IF;

  IF v_session.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'session_expired', 'message', 'Check-in oturum süresi dolmuş.');
  END IF;

  SELECT
    COALESCE(checkin_enabled, false) AS checkin_enabled,
    COALESCE(checkin_actions_enabled, false) AS checkin_actions_enabled
  INTO v_settings
  FROM public.cf_quota_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF COALESCE(v_settings.checkin_enabled, false) = false
     OR COALESCE(v_settings.checkin_actions_enabled, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'actions_not_available', 'message', 'Check-in aksiyonları henüz aktif değil.');
  END IF;

  SELECT s.id INTO v_submission_id
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF v_submission_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  UPDATE public.cf_submissions
  SET
    status = 'cancelled',
    data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
      'cancelled_via_checkin', true,
      'cancel_reason', COALESCE(trim(p_reason), ''),
      'cancelled_at', now()::text
    ),
    updated_at = now()
  WHERE id = v_submission_id;

  UPDATE public.cf_checkin_sessions
  SET used_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object('success', true, 'message', 'Başvuru iptal edildi.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkin_context(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_context(text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.checkin_confirm_and_continue(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_confirm_and_continue(text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.checkin_update_application(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_update_application(text, jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.checkin_cancel_application(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_cancel_application(text, text) TO authenticated;
