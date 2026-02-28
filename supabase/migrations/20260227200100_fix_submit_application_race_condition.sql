-- =============================================================================
-- Migration: Fix submit_application race condition + add TC validation + dynamic quota
-- Date: 2026-02-27
-- Purpose:
--   1. Add pg_advisory_xact_lock to submit_application (match check_and_lock_slot)
--   2. Add server-side TC kimlik format validation
--   3. Read capacity from cf_quota_settings instead of hardcoded 700/1500
-- =============================================================================

DROP FUNCTION IF EXISTS public.submit_application(text, jsonb, boolean, uuid);
DROP FUNCTION IF EXISTS public.submit_application(text, jsonb, boolean, uuid, text);

CREATE OR REPLACE FUNCTION public.submit_application(
  p_tc_no text,
  p_data jsonb,
  p_bring_guest boolean,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_ticket_count INTEGER;
  v_total_reserved INTEGER;
  v_ticket_type TEXT;
  v_result json;
  v_existing_id UUID;
  v_existing_ticket_count INTEGER;
  v_attended_before BOOLEAN;
  v_form_id UUID;
  v_full_name TEXT;
  v_capacity_total INTEGER;
  v_capacity_asil INTEGER;
BEGIN
  -- ===== PARAMETER VALIDATION =====
  IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
    RAISE EXCEPTION 'TC numarası boş olamaz.';
  END IF;

  -- TC format validation (11 digits, not starting with 0)
  IF length(trim(p_tc_no)) != 11
     OR trim(p_tc_no) !~ '^\d{11}$'
     OR left(trim(p_tc_no), 1) = '0' THEN
    RAISE EXCEPTION 'Geçersiz TC Kimlik Numarası formatı.';
  END IF;

  p_tc_no := trim(p_tc_no);

  -- ===== TICKET COUNT =====
  IF p_bring_guest THEN
    v_ticket_count := 2;
  ELSE
    v_ticket_count := 1;
  END IF;

  -- ===== ACTIVE FORM =====
  SELECT id INTO v_form_id
  FROM public.cf_forms
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'Aktif bir başvuru formu bulunamadı (cf_forms tablosu boş).';
  END IF;

  -- ===== DYNAMIC QUOTA from cf_quota_settings =====
  BEGIN
    SELECT
      COALESCE(total_capacity, 1500),
      COALESCE(asil_returning_capacity + asil_new_capacity, 700)
    INTO v_capacity_total, v_capacity_asil
    FROM public.cf_quota_settings
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Table might not exist yet, fallback to defaults
    v_capacity_total := 1500;
    v_capacity_asil := 700;
  END;

  IF v_capacity_total IS NULL THEN
    v_capacity_total := 1500;
  END IF;
  IF v_capacity_asil IS NULL THEN
    v_capacity_asil := 700;
  END IF;

  -- ===== WHITELIST CHECK =====
  SELECT COALESCE(attended_before, false) INTO v_attended_before
  FROM public.cf_whitelist WHERE tc_no = p_tc_no;

  -- ===== ADVISORY LOCK (prevents race condition on quota) =====
  PERFORM pg_advisory_xact_lock(hashtext('submit_application_quota'));

  -- ===== CHECK EXISTING =====
  SELECT id, COALESCE(ticket_count, 1) INTO v_existing_id, v_existing_ticket_count
  FROM public.cf_submissions WHERE tc_no = p_tc_no;

  -- ===== QUOTA CALCULATION =====
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
  FROM public.cf_submissions
  WHERE status != 'rejected' AND status != 'cancelled' AND status != 'expired'
    AND tc_no != p_tc_no;

  IF v_total_reserved + v_ticket_count > v_capacity_total THEN
    RAISE EXCEPTION 'Kota dolmuştur. Başka kayıt alınamamaktadır.';
  END IF;

  v_full_name := p_data->>'name';

  -- ===== TICKET TYPE DETERMINATION =====
  IF v_attended_before THEN
    v_ticket_type := 'yedek';
  ELSE
    IF v_total_reserved + v_ticket_count <= v_capacity_asil THEN
      v_ticket_type := 'asil';
    ELSE
      v_ticket_type := 'yedek';
    END IF;
  END IF;

  -- ===== INSERT OR UPDATE =====
  INSERT INTO public.cf_submissions (
    tc_no, data, full_name, ticket_count, ticket_type, status, user_id, form_id
  ) VALUES (
    p_tc_no, p_data, v_full_name, v_ticket_count, v_ticket_type, 'pending', p_user_id, v_form_id
  )
  ON CONFLICT (tc_no) DO UPDATE SET
    data = EXCLUDED.data,
    full_name = EXCLUDED.full_name,
    ticket_count = EXCLUDED.ticket_count,
    ticket_type = EXCLUDED.ticket_type,
    status = CASE
                WHEN public.cf_submissions.status = 'locked' THEN 'pending'
                ELSE public.cf_submissions.status
             END,
    user_id = COALESCE(public.cf_submissions.user_id, EXCLUDED.user_id),
    updated_at = now();

  v_result := json_build_object(
    'success', true,
    'ticket_type', v_ticket_type,
    'attended_before', v_attended_before
  );
  RETURN v_result;
END;
$function$;
