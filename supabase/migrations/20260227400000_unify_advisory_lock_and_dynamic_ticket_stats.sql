-- =============================================================================
-- Migration: Unify advisory lock keys + dynamic get_ticket_stats
-- Date: 2026-02-27
-- Purpose:
--   1. #6: check_and_lock_slot & submit_application use SAME advisory lock key
--   2. #8: get_ticket_stats reads from cf_quota_settings (not hardcoded 700/1500)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Recreate submit_application with unified lock key
-- ─────────────────────────────────────────────────────────────────────────────
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
    v_capacity_total := 1500;
    v_capacity_asil := 700;
  END;

  IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
  IF v_capacity_asil IS NULL THEN v_capacity_asil := 700; END IF;

  -- ===== WHITELIST CHECK =====
  SELECT COALESCE(attended_before, false) INTO v_attended_before
  FROM public.cf_whitelist WHERE tc_no = p_tc_no;

  -- ===== UNIFIED ADVISORY LOCK (same key as check_and_lock_slot) =====
  PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

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
                WHEN public.cf_submissions.status IN ('locked', 'cancelled', 'expired') THEN 'pending'
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


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Recreate check_and_lock_slot with unified lock key
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_and_lock_slot(p_tc_no TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_form_id UUID;
    v_whitelist RECORD;
    v_existing_sub RECORD;
    v_total_reserved INTEGER;
    v_capacity_asil INTEGER;
    v_capacity_total INTEGER;
    v_status TEXT := 'locked';
    v_ticket_type TEXT := 'asil';
    v_is_debtor BOOLEAN := false;
    v_col_exists BOOLEAN := false;
BEGIN
    -- Parameter validation
    IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
    END IF;

    p_tc_no := trim(p_tc_no);

    -- Get Active Form ID safely
    SELECT id INTO v_form_id FROM public.cf_forms WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'form_not_found', 'message', 'Aktif başvuru formu bulunamadı.');
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
        v_capacity_total := 1500;
        v_capacity_asil := 700;
    END;

    IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
    IF v_capacity_asil IS NULL THEN v_capacity_asil := 700; END IF;

    -- 1. Check Whitelist
    SELECT * INTO v_whitelist FROM public.cf_whitelist WHERE tc_no = p_tc_no;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'TALPA üyesi değilsiniz.');
    END IF;

    -- Check debt — only if is_debtor column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cf_whitelist'
          AND column_name = 'is_debtor'
    ) INTO v_col_exists;

    IF v_col_exists THEN
        EXECUTE 'SELECT is_debtor FROM public.cf_whitelist WHERE tc_no = $1'
        INTO v_is_debtor USING p_tc_no;

        IF COALESCE(v_is_debtor, false) THEN
            RETURN jsonb_build_object('success', false, 'error_type', 'debtor', 'message',
                'Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.');
        END IF;
    END IF;

    -- ===== UNIFIED ADVISORY LOCK (same key as submit_application) =====
    PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

    -- 2. Check if already has a submission
    SELECT * INTO v_existing_sub FROM public.cf_submissions WHERE tc_no = p_tc_no AND form_id = v_form_id;
    IF FOUND THEN
        IF v_existing_sub.status IN ('pending', 'approved', 'asil', 'yedek') THEN
            RETURN jsonb_build_object('success', true, 'status', v_existing_sub.status, 'message', 'Zaten kayıtlısınız.');
        ELSIF v_existing_sub.status = 'locked' AND v_existing_sub.soft_lock_until > NOW() THEN
            RETURN jsonb_build_object(
                'success', true,
                'status', 'locked',
                'ticket_type', v_existing_sub.ticket_type,
                'lock_expires_at', v_existing_sub.soft_lock_until,
                'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_existing_sub.soft_lock_until - NOW()))),
                'cancel_token', v_existing_sub.cancel_token,
                'message', 'Bu TC ile hali hazırda devam eden bir işleminiz bulunmaktadır.'
            );
        END IF;
    END IF;

    -- 3. Quota Control (using dynamic values)
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
    FROM public.cf_submissions
    WHERE status != 'rejected' AND status != 'cancelled' AND status != 'expired'
    AND (status != 'locked' OR soft_lock_until > NOW());

    IF v_total_reserved + 1 > v_capacity_total THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'quota_full', 'message', 'Kota dolmuştur. Başka kayıt alınamamaktadır.');
    END IF;

    IF v_whitelist.attended_before THEN
        v_ticket_type := 'yedek';
    ELSE
        IF v_total_reserved + 1 <= v_capacity_asil THEN
            v_ticket_type := 'asil';
        ELSE
            v_ticket_type := 'yedek';
        END IF;
    END IF;

    -- 4. Create or Update Lock (10 minutes)
    IF v_existing_sub.id IS NOT NULL THEN
        UPDATE public.cf_submissions
        SET status = 'locked', ticket_type = v_ticket_type, soft_lock_until = NOW() + INTERVAL '10 minutes', cancel_token = gen_random_uuid()
        WHERE id = v_existing_sub.id
        RETURNING cancel_token INTO v_existing_sub.cancel_token;
    ELSE
        INSERT INTO public.cf_submissions (form_id, tc_no, status, soft_lock_until, ticket_count, ticket_type)
        VALUES (v_form_id, p_tc_no, 'locked', NOW() + INTERVAL '10 minutes', 1, v_ticket_type)
        RETURNING cancel_token INTO v_existing_sub.cancel_token;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'locked',
        'ticket_type', v_ticket_type,
        'lock_expires_at', NOW() + INTERVAL '10 minutes',
        'remaining_seconds', 600,
        'cancel_token', v_existing_sub.cancel_token,
        'is_attended_before', v_whitelist.attended_before
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Recreate get_ticket_stats with dynamic quota from cf_quota_settings
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_reserved INTEGER;
  v_capacity_total INTEGER;
  v_capacity_asil INTEGER;
  v_asil_returning_cap INTEGER;
  v_asil_new_cap INTEGER;
  v_asil_returning_reserved INTEGER;
  v_asil_new_reserved INTEGER;
BEGIN
  -- ===== DYNAMIC QUOTA from cf_quota_settings =====
  BEGIN
    SELECT
      COALESCE(total_capacity, 1500),
      COALESCE(asil_returning_capacity, 400),
      COALESCE(asil_new_capacity, 300)
    INTO v_capacity_total, v_asil_returning_cap, v_asil_new_cap
    FROM public.cf_quota_settings
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_capacity_total := 1500;
    v_asil_returning_cap := 400;
    v_asil_new_cap := 300;
  END;

  IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
  IF v_asil_returning_cap IS NULL THEN v_asil_returning_cap := 400; END IF;
  IF v_asil_new_cap IS NULL THEN v_asil_new_cap := 300; END IF;

  v_capacity_asil := v_asil_returning_cap + v_asil_new_cap;

  -- Total reserved tickets
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
  FROM public.cf_submissions
  WHERE status != 'rejected' AND status != 'cancelled' AND status != 'expired'
    AND (status != 'locked' OR soft_lock_until > NOW());

  -- Returning (attended_before = true) reserved count
  SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_asil_returning_reserved
  FROM public.cf_submissions s
  JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
  WHERE w.attended_before = true
    AND s.status NOT IN ('rejected', 'cancelled', 'expired')
    AND (s.status != 'locked' OR s.soft_lock_until > NOW());

  -- New (attended_before = false or null) reserved count
  v_asil_new_reserved := v_total_reserved - v_asil_returning_reserved;

  RETURN json_build_object(
    'total_reserved', v_total_reserved,
    'total_capacity', v_capacity_total,
    'asil_capacity', v_capacity_asil,
    'yedek_capacity', v_capacity_total - v_capacity_asil,
    'asil_returning_capacity', v_asil_returning_cap,
    'asil_returning_reserved', v_asil_returning_reserved,
    'asil_new_capacity', v_asil_new_cap,
    'asil_new_reserved', GREATEST(0, v_asil_new_reserved)
  );
END;
$$;
