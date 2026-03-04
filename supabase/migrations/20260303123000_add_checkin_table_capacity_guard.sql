-- =============================================================================
-- Migration: Add table capacity guard for check-in selection
-- Date: 2026-03-03
-- =============================================================================
-- ARCHIVE / NOT-IN-USE (2026-03-04):
-- This migration is kept for historical schema evolution.
-- Active behavior is overridden by:
--   20260304113000_deprecate_seatmap_rpcs_and_enforce_people_preferences.sql

CREATE OR REPLACE FUNCTION public.get_checkin_table_occupants(
  p_session_token text,
  p_table_no text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_table_no text;
  v_occupants jsonb;
  v_count integer;
  v_table_capacity integer := 10;
BEGIN
  IF p_session_token IS NULL OR trim(p_session_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Session token boş olamaz.');
  END IF;

  IF p_table_no IS NULL OR trim(p_table_no) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Masa numarası boş olamaz.');
  END IF;

  v_table_no := upper(trim(p_table_no));

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
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'full_name', s.full_name,
          'ticket_type', s.ticket_type,
          'status', s.status
        )
        ORDER BY s.full_name
      ),
      '[]'::jsonb
    ),
    COUNT(*)::int
  INTO v_occupants, v_count
  FROM public.cf_submissions s
  WHERE s.status NOT IN ('cancelled', 'rejected', 'expired')
    AND s.seating_preference IS NOT NULL
    AND s.seating_preference ~ ('"table_no"\\s*:\\s*"' || v_table_no || '"');

  RETURN jsonb_build_object(
    'success', true,
    'table_no', v_table_no,
    'table_capacity', v_table_capacity,
    'occupant_count', v_count,
    'is_full', v_count >= v_table_capacity,
    'occupants', v_occupants
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
  v_submission record;
  v_settings record;
  v_target_table_no text;
  v_table_capacity integer := 10;
  v_table_occupied_count integer := 0;
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

  SELECT s.id, s.seating_preference
  INTO v_submission
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF v_submission.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  IF p_table_preferences IS NOT NULL
     AND p_table_preferences <> '{}'::jsonb
     AND p_table_preferences ? 'table_no'
     AND NULLIF(trim(p_table_preferences->>'table_no'), '') IS NOT NULL THEN
    v_target_table_no := upper(trim(p_table_preferences->>'table_no'));

    SELECT COUNT(*)::int
    INTO v_table_occupied_count
    FROM public.cf_submissions s
    WHERE s.id <> v_submission.id
      AND s.status NOT IN ('cancelled', 'rejected', 'expired')
      AND s.seating_preference IS NOT NULL
      AND s.seating_preference ~ ('"table_no"\\s*:\\s*"' || v_target_table_no || '"');

    IF v_table_occupied_count >= v_table_capacity THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_type', 'table_full',
        'message', 'Seçilen masa doludur. Lütfen başka bir masa seçiniz.',
        'table_no', v_target_table_no,
        'table_capacity', v_table_capacity,
        'occupant_count', v_table_occupied_count
      );
    END IF;
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
  WHERE id = v_submission.id;

  UPDATE public.cf_checkin_sessions
  SET used_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object('success', true, 'message', 'Check-in başarıyla tamamlandı.');
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkin_table_occupants(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_table_occupants(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.checkin_confirm_and_continue(text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_confirm_and_continue(text, jsonb) TO authenticated;
