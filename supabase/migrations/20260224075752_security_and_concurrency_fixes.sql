-- Drop insecure Dev/Public RLS policies
DROP POLICY IF EXISTS "Allow all access for dev on submissions" ON public.cf_submissions;
DROP POLICY IF EXISTS "Allow public insert to submissions" ON public.cf_submissions;

-- Remove the old cancel_application function
DROP FUNCTION IF EXISTS cancel_application(text, uuid);
DROP FUNCTION IF EXISTS cancel_application(text);

-- Add cancel_token for secure cancellations
ALTER TABLE public.cf_submissions
ADD COLUMN IF NOT EXISTS cancel_token UUID DEFAULT gen_random_uuid();

-- 1. Recreate check_and_lock_slot with explicit locking and parameter validation
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
    v_capacity_asil INTEGER := 700;
    v_capacity_total INTEGER := 1500;
    v_status TEXT := 'locked';
    v_ticket_type TEXT := 'asil';
BEGIN
    -- Parameter validation
    IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
    END IF;

    -- Get Active Form ID safely (prevent multiple active forms breaking the flow)
    SELECT id INTO v_form_id FROM public.cf_forms WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'form_not_found', 'message', 'Aktif başvuru formu bulunamadı.');
    END IF;

    -- 1. Check Whitelist
    SELECT * INTO v_whitelist FROM public.cf_whitelist WHERE tc_no = p_tc_no;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'TALPA üyesi değilsiniz.');
    END IF;

    -- Check debt
    BEGIN
        EXECUTE 'SELECT is_debtor FROM public.cf_whitelist WHERE tc_no = $1' INTO v_whitelist.is_debtor USING p_tc_no;
        IF v_whitelist.is_debtor THEN
            RETURN jsonb_build_object('success', false, 'error_type', 'debtor', 'message', 'Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Column does not exist, ignore
    END;

    -- Use PostgreSQL advisory lock to prevent race conditions during quota checks without locking the entire table
    PERFORM pg_advisory_xact_lock(hashtext('check_and_lock_slot_quota'));

    -- 2. Check if already has a submission
    SELECT * INTO v_existing_sub FROM public.cf_submissions WHERE tc_no = p_tc_no AND form_id = v_form_id;
    IF FOUND THEN
        -- If already approved/asil/yedek, return info
        IF v_existing_sub.status IN ('pending', 'approved', 'asil', 'yedek') THEN
            RETURN jsonb_build_object('success', true, 'status', v_existing_sub.status, 'message', 'Zaten kayıtlısınız.');
        ELSIF v_existing_sub.status = 'locked' AND v_existing_sub.soft_lock_until > NOW() THEN
            -- DO NOT Extend lock! Return existing remaining time.
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

    -- 3. Quota Control for Locking
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

    -- 4. Create or Update Lock
    IF v_existing_sub IS NOT NULL THEN
        UPDATE public.cf_submissions 
        SET status = 'locked', ticket_type = v_ticket_type, soft_lock_until = NOW() + INTERVAL '15 minutes', cancel_token = gen_random_uuid()
        WHERE id = v_existing_sub.id
        RETURNING cancel_token INTO v_existing_sub.cancel_token;
    ELSE
        INSERT INTO public.cf_submissions (form_id, tc_no, status, soft_lock_until, ticket_count, ticket_type)
        VALUES (v_form_id, p_tc_no, 'locked', NOW() + INTERVAL '15 minutes', 1, v_ticket_type)
        RETURNING cancel_token INTO v_existing_sub.cancel_token;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'status', 'locked', 
        'ticket_type', v_ticket_type,
        'lock_expires_at', NOW() + INTERVAL '15 minutes',
        'remaining_seconds', 900,
        'cancel_token', v_existing_sub.cancel_token,
        'is_attended_before', v_whitelist.attended_before
    );
END;
$$;


-- 2. Recreate cancel_application to require cancel_token
CREATE OR REPLACE FUNCTION cancel_application(p_tc_no TEXT, p_cancel_token UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission RECORD;
BEGIN
    -- Parameter validation
    IF p_tc_no IS NULL OR trim(p_tc_no) = '' THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'invalid_parameter', 'message', 'TC numarası boş olamaz.');
    END IF;
    
    IF p_cancel_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'unauthorized', 'message', 'İptal işlemi için yetkili değilsiniz (Eksik Token).');
    END IF;

    -- Find the active submission
    SELECT * INTO v_submission FROM public.cf_submissions 
    WHERE tc_no = p_tc_no 
      AND status NOT IN ('cancelled', 'rejected', 'expired') 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'İptal edilecek aktif başvuru bulunamadı.');
    END IF;

    -- Verify the token
    IF v_submission.cancel_token != p_cancel_token THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'unauthorized', 'message', 'İptal işlemi reddedildi. Güvenlik belirteci geçersiz.');
    END IF;

    -- Update status to cancelled
    UPDATE public.cf_submissions 
    SET status = 'cancelled'
    WHERE id = v_submission.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Başvuru başarıyla iptal edildi.');
END;
$$;


-- 3. Update cleanup_expired_slots to use soft expiration instead of physical DELETE
CREATE OR REPLACE FUNCTION cleanup_expired_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.cf_submissions 
    SET status = 'expired'
    WHERE status = 'locked' AND soft_lock_until < NOW();
END;
$$;
