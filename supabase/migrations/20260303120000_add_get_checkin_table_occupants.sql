-- =============================================================================
-- Migration: Add RPC to fetch table occupants for check-in popup
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
    'occupant_count', v_count,
    'occupants', v_occupants
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkin_table_occupants(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_checkin_table_occupants(text, text) TO authenticated;
