-- Reduce application lock duration from 15 minutes to 10 minutes
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

    -- Get Active Form ID safely
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

    -- Advisory lock for race condition prevention
    PERFORM pg_advisory_xact_lock(hashtext('check_and_lock_slot_quota'));

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

    -- 3. Quota Control
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
    IF v_existing_sub IS NOT NULL THEN
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
