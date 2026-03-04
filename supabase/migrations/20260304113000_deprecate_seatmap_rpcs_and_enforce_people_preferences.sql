-- =============================================================================
-- Migration: Deprecate seatmap RPCs and enforce preferred-people payload
-- Date: 2026-03-04
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_checkin_table_occupants(
  p_session_token text,
  p_table_no text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN jsonb_build_object(
    'success', false,
    'error_type', 'deprecated_endpoint',
    'message', 'Masa yerleşim servisi kullanım dışıdır. Lütfen kişi tercihi akışını kullanınız.'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_confirm_and_continue(
  p_session_token text,
  p_table_preferences jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_session record;
  v_submission record;
  v_settings record;
  v_payload jsonb := COALESCE(p_table_preferences, '{}'::jsonb);
  v_preferred_people jsonb := '[]'::jsonb;
  v_source text := 'people_preference_v1';
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

  IF jsonb_typeof(v_payload) = 'array' THEN
    v_preferred_people := v_payload;
  ELSIF jsonb_typeof(v_payload) = 'object' THEN
    IF jsonb_typeof(v_payload->'preferred_people') = 'array' THEN
      v_preferred_people := v_payload->'preferred_people';
    END IF;

    IF NULLIF(trim(COALESCE(v_payload->>'source', '')), '') IS NOT NULL THEN
      v_source := trim(v_payload->>'source');
    END IF;

    IF v_payload ? 'table_no' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_type', 'seatmap_deprecated',
        'message', 'Masa seçimi kullanım dışıdır. Lütfen kişi tercihi ekleyiniz.'
      );
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'Geçerli tercih verisi gönderiniz.');
  END IF;

  IF jsonb_typeof(v_preferred_people) <> 'array' OR jsonb_array_length(v_preferred_people) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'invalid_preferences', 'message', 'En az bir kişi tercihi ekleyiniz.');
  END IF;

  SELECT s.id, s.data
  INTO v_submission
  FROM public.cf_submissions s
  WHERE s.tc_no = v_session.tc_no
    AND s.status NOT IN ('cancelled', 'rejected', 'expired')
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC
  LIMIT 1;

  IF v_submission.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'Uygun başvuru bulunamadı.');
  END IF;

  UPDATE public.cf_submissions
  SET
    checkin_at = now(),
    seating_preference = jsonb_build_object(
      'preferred_people', v_preferred_people,
      'source', v_source
    )::text,
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
