-- =============================================================================
-- Migration: Dual asil list — separate pools for returning vs new members
-- Date: 2026-02-27
-- Purpose:
--   Asil liste iki ayrı havuzdan oluşur:
--     1. attended_before=true  → 400 kişilik "geri dönen üye" asil havuzu
--     2. attended_before=false → 300 kişilik "yeni üye" asil havuzu
--   Kendi havuzu doluysa → yedek
--
--   ÖNCEKİ DAVRANIŞTA attended_before=true olanlar otomatik yedek'e atanıyordu.
--   Artık her iki grup da kendi kapasiteleri dahilinde asil listeye girebilir.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) check_and_lock_slot — Dual asil pool logic
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
    v_pool_reserved INTEGER;
    v_capacity_asil_returning INTEGER;
    v_capacity_asil_new INTEGER;
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
            COALESCE(asil_returning_capacity, 400),
            COALESCE(asil_new_capacity, 300)
        INTO v_capacity_total, v_capacity_asil_returning, v_capacity_asil_new
        FROM public.cf_quota_settings
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        v_capacity_total := 1500;
        v_capacity_asil_returning := 400;
        v_capacity_asil_new := 300;
    END;

    IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
    IF v_capacity_asil_returning IS NULL THEN v_capacity_asil_returning := 400; END IF;
    IF v_capacity_asil_new IS NULL THEN v_capacity_asil_new := 300; END IF;

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

    -- 3. Total Quota Control
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
    FROM public.cf_submissions
    WHERE status NOT IN ('rejected', 'cancelled', 'expired')
      AND (status != 'locked' OR soft_lock_until > NOW());

    IF v_total_reserved + 1 > v_capacity_total THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'quota_full', 'message', 'Kota dolmuştur. Başka kayıt alınamamaktadır.');
    END IF;

    -- 4. DUAL ASIL POOL — Ticket Type Determination
    --    attended_before=true  → 400 kişilik geri dönen üye havuzuna yerleş
    --    attended_before=false → 300 kişilik yeni üye havuzuna yerleş
    --    Havuz doluysa → yedek
    IF COALESCE(v_whitelist.attended_before, false) THEN
        -- Geri dönen üye: asil havuzundaki mevcut geri dönen üye sayısını say
        SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
        FROM public.cf_submissions s
        JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
        WHERE w.attended_before = true
          AND s.ticket_type = 'asil'
          AND s.status NOT IN ('rejected', 'cancelled', 'expired')
          AND (s.status != 'locked' OR s.soft_lock_until > NOW());

        IF v_pool_reserved + 1 <= v_capacity_asil_returning THEN
            v_ticket_type := 'asil';
        ELSE
            v_ticket_type := 'yedek';
        END IF;
    ELSE
        -- Yeni üye: asil havuzundaki mevcut yeni üye sayısını say
        SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
        FROM public.cf_submissions s
        JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
        WHERE COALESCE(w.attended_before, false) = false
          AND s.ticket_type = 'asil'
          AND s.status NOT IN ('rejected', 'cancelled', 'expired')
          AND (s.status != 'locked' OR s.soft_lock_until > NOW());

        IF v_pool_reserved + 1 <= v_capacity_asil_new THEN
            v_ticket_type := 'asil';
        ELSE
            v_ticket_type := 'yedek';
        END IF;
    END IF;

    -- 5. Create or Update Lock (10 minutes)
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
-- 2) submit_application — Dual asil pool logic
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
  v_pool_reserved INTEGER;
  v_ticket_type TEXT;
  v_result json;
  v_existing_id UUID;
  v_existing_ticket_count INTEGER;
  v_attended_before BOOLEAN;
  v_form_id UUID;
  v_full_name TEXT;
  v_capacity_total INTEGER;
  v_capacity_asil_returning INTEGER;
  v_capacity_asil_new INTEGER;
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
      COALESCE(asil_returning_capacity, 400),
      COALESCE(asil_new_capacity, 300)
    INTO v_capacity_total, v_capacity_asil_returning, v_capacity_asil_new
    FROM public.cf_quota_settings
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_capacity_total := 1500;
    v_capacity_asil_returning := 400;
    v_capacity_asil_new := 300;
  END;

  IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
  IF v_capacity_asil_returning IS NULL THEN v_capacity_asil_returning := 400; END IF;
  IF v_capacity_asil_new IS NULL THEN v_capacity_asil_new := 300; END IF;

  -- ===== WHITELIST CHECK =====
  SELECT COALESCE(attended_before, false) INTO v_attended_before
  FROM public.cf_whitelist WHERE tc_no = p_tc_no;

  -- ===== UNIFIED ADVISORY LOCK (same key as check_and_lock_slot) =====
  PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

  -- ===== CHECK EXISTING =====
  SELECT id, COALESCE(ticket_count, 1) INTO v_existing_id, v_existing_ticket_count
  FROM public.cf_submissions WHERE tc_no = p_tc_no;

  -- ===== TOTAL QUOTA CALCULATION =====
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
  FROM public.cf_submissions
  WHERE status != 'rejected' AND status != 'cancelled' AND status != 'expired'
    AND tc_no != p_tc_no;

  IF v_total_reserved + v_ticket_count > v_capacity_total THEN
    RAISE EXCEPTION 'Kota dolmuştur. Başka kayıt alınamamaktadır.';
  END IF;

  v_full_name := p_data->>'name';

  -- ===== DUAL ASIL POOL — Ticket Type Determination =====
  --   attended_before=true  → 400 kişilik geri dönen üye havuzu
  --   attended_before=false → 300 kişilik yeni üye havuzu
  --   Havuz doluysa → yedek
  IF v_attended_before THEN
    -- Geri dönen üye havuzundaki mevcut asil sayısı
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE w.attended_before = true
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired')
      AND s.tc_no != p_tc_no;

    IF v_pool_reserved + v_ticket_count <= v_capacity_asil_returning THEN
      v_ticket_type := 'asil';
    ELSE
      v_ticket_type := 'yedek';
    END IF;
  ELSE
    -- Yeni üye havuzundaki mevcut asil sayısı
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE COALESCE(w.attended_before, false) = false
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired')
      AND s.tc_no != p_tc_no;

    IF v_pool_reserved + v_ticket_count <= v_capacity_asil_new THEN
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
