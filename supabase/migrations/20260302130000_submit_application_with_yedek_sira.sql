-- Migration: submit_application with yedek_sira
-- Deployed: 2026-03-02
-- Purpose: Başvuru sonrası yedek sıra numarası döndürme

CREATE OR REPLACE FUNCTION public.submit_application(p_tc_no text, p_data jsonb, p_bring_guest boolean, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket_count INTEGER;
  v_confirmed_reserved INTEGER;
  v_pool_reserved INTEGER;
  v_ticket_type TEXT;
  v_existing_id UUID;
  v_existing_status TEXT;
  v_attended_before BOOLEAN;
  v_form_id UUID;
  v_full_name TEXT;
  v_capacity_total INTEGER := 1500;
  v_capacity_asil_returning INTEGER := 500;
  v_capacity_asil_new INTEGER := 200;
  v_is_whitelisted BOOLEAN;
  v_col_exists BOOLEAN := false;
  v_is_debtor BOOLEAN := false;
  v_yedek_sira BIGINT;
BEGIN
  -- Parameter validation
  IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
    RAISE EXCEPTION 'TC numarası boş olamaz.';
  END IF;

  IF length(trim(p_tc_no)) != 11
     OR trim(p_tc_no) !~ '^\d{11}$'
     OR left(trim(p_tc_no), 1) = '0' THEN
    RAISE EXCEPTION 'Geçersiz TC Kimlik Numarası formatı.';
  END IF;

  p_tc_no := trim(p_tc_no);

  -- Whitelist check
  SELECT EXISTS(SELECT 1 FROM public.cf_whitelist WHERE tc_no = p_tc_no) INTO v_is_whitelisted;
  IF NOT v_is_whitelisted THEN
    RAISE EXCEPTION 'TALPA üyesi değilsiniz.';
  END IF;

  -- Debt check (if column exists)
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
      RAISE EXCEPTION 'Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.';
    END IF;
  END IF;

  v_ticket_count := CASE WHEN p_bring_guest THEN 2 ELSE 1 END;

  -- Active form
  SELECT id INTO v_form_id FROM public.cf_forms WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'Aktif bir başvuru formu bulunamadı (cf_forms tablosu boş).';
  END IF;

  -- Dynamic quota
  BEGIN
    SELECT
      COALESCE(total_capacity, 1500),
      COALESCE(asil_returning_capacity, 500),
      COALESCE(asil_new_capacity, 200)
    INTO v_capacity_total, v_capacity_asil_returning, v_capacity_asil_new
    FROM public.cf_quota_settings
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_capacity_total := 1500;
    v_capacity_asil_returning := 500;
    v_capacity_asil_new := 200;
  END;

  IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
  IF v_capacity_asil_returning IS NULL THEN v_capacity_asil_returning := 500; END IF;
  IF v_capacity_asil_new IS NULL THEN v_capacity_asil_new := 200; END IF;

  -- Whitelist: attended_before
  SELECT COALESCE(attended_before, false) INTO v_attended_before
  FROM public.cf_whitelist WHERE tc_no = p_tc_no;

  -- Unified advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

  -- Existing submission check
  SELECT id, status INTO v_existing_id, v_existing_status
  FROM public.cf_submissions
  WHERE tc_no = p_tc_no;

  IF v_existing_id IS NOT NULL
     AND v_existing_status IN ('pending', 'approved', 'asil', 'yedek') THEN
    RAISE EXCEPTION 'Bu TC kimlik numarası ile daha önce başvuru yapılmıştır.';
  END IF;

  -- HARD quota (excluding locks)
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_confirmed_reserved
  FROM public.cf_submissions
  WHERE form_id = v_form_id
    AND status NOT IN ('rejected', 'cancelled', 'expired', 'locked')
    AND tc_no != p_tc_no;

  IF v_confirmed_reserved + v_ticket_count > v_capacity_total THEN
    RAISE EXCEPTION 'Kota dolmuştur. Başka kayıt alınamamaktadır.';
  END IF;

  v_full_name := p_data->>'name';

  -- Dual asil pool
  IF v_attended_before THEN
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE w.attended_before = true
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired', 'locked')
      AND s.tc_no != p_tc_no;

    v_ticket_type := CASE WHEN v_pool_reserved + v_ticket_count <= v_capacity_asil_returning THEN 'asil' ELSE 'yedek' END;
  ELSE
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE COALESCE(w.attended_before, false) = false
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired', 'locked')
      AND s.tc_no != p_tc_no;

    v_ticket_type := CASE WHEN v_pool_reserved + v_ticket_count <= v_capacity_asil_new THEN 'asil' ELSE 'yedek' END;
  END IF;

  -- Insert/update
  INSERT INTO public.cf_submissions (
    tc_no, data, full_name, ticket_count, ticket_type, status, user_id, form_id, is_confirmed
  ) VALUES (
    p_tc_no, p_data, v_full_name, v_ticket_count, v_ticket_type, 'pending', p_user_id, v_form_id, true
  )
  ON CONFLICT (tc_no) DO UPDATE SET
    data         = EXCLUDED.data,
    full_name    = EXCLUDED.full_name,
    ticket_count = EXCLUDED.ticket_count,
    ticket_type  = EXCLUDED.ticket_type,
    status       = CASE
                     WHEN public.cf_submissions.status IN ('locked', 'cancelled', 'expired') THEN 'pending'
                     ELSE public.cf_submissions.status
                   END,
    user_id      = COALESCE(public.cf_submissions.user_id, EXCLUDED.user_id),
    is_confirmed = true,
    updated_at   = now();

  -- Dinamik yedek sıra hesapla (sadece yedek ise)
  IF v_ticket_type = 'yedek' THEN
    SELECT g.yedek_sira INTO v_yedek_sira
    FROM get_yedek_sira() g
    WHERE g.tc_no = p_tc_no;
  END IF;

  RETURN json_build_object(
    'success', true,
    'ticket_type', v_ticket_type,
    'attended_before', v_attended_before,
    'yedek_sira', v_yedek_sira
  );
END;
$function$;
