-- =============================================================================
-- Migration: Lock 2 tickets per user + Phantom lock buffer fix
-- Date: 2026-02-28
-- Changes:
--   1. check_and_lock_slot: ticket_count = 2 (üye + potansiyel misafir)
--      Herkes TC girdiğinde kota üzerinde 2 slot kilitlenir.
--      Form tamamlandığında submit_application gerçek sayıyı (1 veya 2) yazar.
--
--   2. Phantom lock fix: Kota kontrolü ikiye ayrıldı:
--      a) HARD quota: sadece onaylı (non-locked) başvurular sayılır.
--         v_confirmed + 2 > total_capacity → quota_full
--      b) SOFT buffer: aktif lock'lar ek olarak sayılır, buffer = %20 ekstra.
--         v_confirmed + v_active_locks + 2 > total_capacity + buffer → quota_full
--      Böylece yoğun anlarda lock'lar hard kotayı kapatamaz;
--      sadece buffer kotasını doldurursa yeni lock reddedilir.
--
--   3. submit_application: kota hesabında lock'lar artık sayılmaz
--      (kullanıcı zaten lock almış, diğer lock'lar spekülatif — onaylıları say).
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) check_and_lock_slot — 2 ticket lock + phantom buffer
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
    v_confirmed_reserved INTEGER;
    v_locked_reserved INTEGER;
    v_pool_reserved INTEGER;
    v_capacity_asil_returning INTEGER;
    v_capacity_asil_new INTEGER;
    v_capacity_total INTEGER;
    v_lock_buffer INTEGER;
    v_ticket_type TEXT := 'asil';
    v_is_debtor BOOLEAN := false;
    v_col_exists BOOLEAN := false;
BEGIN
    -- Parameter validation
    IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
    END IF;

    p_tc_no := trim(p_tc_no);

    -- Active form
    SELECT id INTO v_form_id FROM public.cf_forms WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'form_not_found', 'message', 'Aktif başvuru formu bulunamadı.');
    END IF;

    -- Dynamic quota
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

    -- Lock buffer = 20% of total capacity (phantom lock koruma tamponu)
    v_lock_buffer := CEIL(v_capacity_total * 0.2);

    -- 1. Whitelist check
    SELECT * INTO v_whitelist FROM public.cf_whitelist WHERE tc_no = p_tc_no;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'TALPA üyesi değilsiniz.');
    END IF;

    -- Debt check
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

    -- Advisory lock
    PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

    -- 2. Existing submission check
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

    -- 3a. HARD quota: sadece onaylı (non-locked) başvurular
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_confirmed_reserved
    FROM public.cf_submissions
    WHERE form_id = v_form_id
      AND status NOT IN ('rejected', 'cancelled', 'expired', 'locked');

    IF v_confirmed_reserved + 2 > v_capacity_total THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'quota_full',
            'message', 'Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.');
    END IF;

    -- 3b. SOFT buffer: onaylı + aktif lock toplamı (buffer dahil)
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_locked_reserved
    FROM public.cf_submissions
    WHERE form_id = v_form_id
      AND status = 'locked'
      AND soft_lock_until > NOW();

    IF v_confirmed_reserved + v_locked_reserved + 2 > v_capacity_total + v_lock_buffer THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'quota_full',
            'message', 'Değerli Kaptanlarımız etkinliğe olan ilginizden dolayı teşekkür ederiz. Asil ve yedek kotalarımız tamamen dolmuştur.');
    END IF;

    -- 4. Dual asil pool: ticket_count=2 ile pool kontrolü
    IF COALESCE(v_whitelist.attended_before, false) THEN
        SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
        FROM public.cf_submissions s
        JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
        WHERE w.attended_before = true
          AND s.ticket_type = 'asil'
          AND s.form_id = v_form_id
          AND s.status NOT IN ('rejected', 'cancelled', 'expired')
          AND (s.status != 'locked' OR s.soft_lock_until > NOW());

        v_ticket_type := CASE WHEN v_pool_reserved + 2 <= v_capacity_asil_returning THEN 'asil' ELSE 'yedek' END;
    ELSE
        SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
        FROM public.cf_submissions s
        JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
        WHERE COALESCE(w.attended_before, false) = false
          AND s.ticket_type = 'asil'
          AND s.form_id = v_form_id
          AND s.status NOT IN ('rejected', 'cancelled', 'expired')
          AND (s.status != 'locked' OR s.soft_lock_until > NOW());

        v_ticket_type := CASE WHEN v_pool_reserved + 2 <= v_capacity_asil_new THEN 'asil' ELSE 'yedek' END;
    END IF;

    -- 5. Lock oluştur / güncelle — ticket_count = 2 (üye + potansiyel misafir)
    IF v_existing_sub.id IS NOT NULL THEN
        UPDATE public.cf_submissions
        SET status        = 'locked',
            ticket_type   = v_ticket_type,
            ticket_count  = 2,
            soft_lock_until = NOW() + INTERVAL '10 minutes',
            cancel_token  = gen_random_uuid()
        WHERE id = v_existing_sub.id
        RETURNING cancel_token INTO v_existing_sub.cancel_token;
    ELSE
        INSERT INTO public.cf_submissions (form_id, tc_no, status, soft_lock_until, ticket_count, ticket_type)
        VALUES (v_form_id, p_tc_no, 'locked', NOW() + INTERVAL '10 minutes', 2, v_ticket_type)
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
-- 2) submit_application — sadece onaylı başvuruları say (lock'ları sayma)
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
  v_confirmed_reserved INTEGER;
  v_pool_reserved INTEGER;
  v_ticket_type TEXT;
  v_result json;
  v_existing_id UUID;
  v_attended_before BOOLEAN;
  v_form_id UUID;
  v_full_name TEXT;
  v_capacity_total INTEGER;
  v_capacity_asil_returning INTEGER;
  v_capacity_asil_new INTEGER;
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

  -- Actual ticket count based on guest choice
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

  -- Whitelist: attended_before
  SELECT COALESCE(attended_before, false) INTO v_attended_before
  FROM public.cf_whitelist WHERE tc_no = p_tc_no;

  -- Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext('dpg_quota_lock'));

  -- Existing submission id
  SELECT id INTO v_existing_id FROM public.cf_submissions WHERE tc_no = p_tc_no;

  -- HARD quota: sadece onaylı başvurular (lock'lar hariç, mevcut kullanıcı hariç)
  -- Bu kullanıcının lock'u zaten "reserved" — sadece diğer onaylıları say
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_confirmed_reserved
  FROM public.cf_submissions
  WHERE form_id = v_form_id
    AND status NOT IN ('rejected', 'cancelled', 'expired', 'locked')
    AND tc_no != p_tc_no;

  IF v_confirmed_reserved + v_ticket_count > v_capacity_total THEN
    RAISE EXCEPTION 'Kota dolmuştur. Başka kayıt alınamamaktadır.';
  END IF;

  v_full_name := p_data->>'name';

  -- Dual asil pool — ticket_type belirleme
  IF v_attended_before THEN
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE w.attended_before = true
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired')
      AND s.tc_no != p_tc_no;

    v_ticket_type := CASE WHEN v_pool_reserved + v_ticket_count <= v_capacity_asil_returning THEN 'asil' ELSE 'yedek' END;
  ELSE
    SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_pool_reserved
    FROM public.cf_submissions s
    JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
    WHERE COALESCE(w.attended_before, false) = false
      AND s.ticket_type = 'asil'
      AND s.status NOT IN ('rejected', 'cancelled', 'expired')
      AND s.tc_no != p_tc_no;

    v_ticket_type := CASE WHEN v_pool_reserved + v_ticket_count <= v_capacity_asil_new THEN 'asil' ELSE 'yedek' END;
  END IF;

  -- INSERT or UPDATE
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

  RETURN json_build_object(
    'success', true,
    'ticket_type', v_ticket_type,
    'attended_before', v_attended_before
  );
END;
$function$;
