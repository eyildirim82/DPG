-- Update check_and_lock_slot to include form_id
CREATE OR REPLACE FUNCTION check_and_lock_slot(p_tc_no TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS c:\Users\erkan\DPG
DECLARE
    v_whitelist RECORD;
    v_existing_sub RECORD;
    v_total_reserved INTEGER;
    v_capacity_asil INTEGER := 700;
    v_capacity_total INTEGER := 1500;
    v_status TEXT := 'locked';
    v_ticket_type TEXT := 'asil';
    v_form_id UUID;
BEGIN
    -- 1. Check Whitelist
    SELECT * INTO v_whitelist FROM public.cf_whitelist WHERE tc_no = p_tc_no;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'TALPA üyesi deðilsiniz.');
    END IF;

    -- Check debt
    BEGIN
        EXECUTE 'SELECT is_debtor FROM public.cf_whitelist WHERE tc_no = ' INTO v_whitelist.is_debtor USING p_tc_no;
        IF v_whitelist.is_debtor THEN
            RETURN jsonb_build_object('success', false, 'error_type', 'debtor', 'message', 'Aidat borcunuz bulunmaktadýr, DPG etkinliði kayýt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Column does not exist, ignore
    END;

    -- Lock the table to prevent concurrent capacity read/write race conditions
    LOCK TABLE public.cf_submissions IN EXCLUSIVE MODE;

    -- 2. Check if already has a submission
    SELECT * INTO v_existing_sub FROM public.cf_submissions WHERE tc_no = p_tc_no;
    IF FOUND THEN
        -- If already approved/asil/yedek, return info
        IF v_existing_sub.status IN ('pending', 'approved', 'asil', 'yedek') THEN
            RETURN jsonb_build_object('success', true, 'status', v_existing_sub.status, 'message', 'Zaten kayýtlýsýnýz.');
        ELSIF v_existing_sub.status = 'locked' AND v_existing_sub.soft_lock_until > NOW() THEN
            -- DO NOT Extend lock! Return existing remaining time.
            RETURN jsonb_build_object('success', true, 'status', 'locked', 'ticket_type', v_existing_sub.ticket_type, 'lock_expires_at', v_existing_sub.soft_lock_until, 'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_existing_sub.soft_lock_until - NOW()))), 'message', 'Bu TC ile hali hazýrda devam eden bir iþleminiz bulunmaktadýr.');
        END IF;
    END IF;

    -- 3. Quota Control for Locking
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
    FROM public.cf_submissions 
    WHERE status != 'rejected' AND status != 'cancelled'
    AND (status != 'locked' OR soft_lock_until > NOW());

    IF v_total_reserved + 1 > v_capacity_total THEN
           RETURN jsonb_build_object('success', false, 'error_type', 'quota_full', 'message', 'Kota dolmuþtur. Baþka kayýt alýnamamaktadýr.');
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

    -- Get Active Form ID
    SELECT id INTO v_form_id FROM public.cf_forms WHERE is_active = true LIMIT 1;

    -- 4. Create or Update Lock
    IF v_existing_sub IS NOT NULL THEN
        UPDATE public.cf_submissions 
        SET status = 'locked', ticket_type = v_ticket_type, soft_lock_until = NOW() + INTERVAL '15 minutes'
        WHERE id = v_existing_sub.id;
    ELSE
        INSERT INTO public.cf_submissions (form_id, tc_no, status, soft_lock_until, ticket_count, ticket_type)
        VALUES (v_form_id, p_tc_no, 'locked', NOW() + INTERVAL '15 minutes', 1, v_ticket_type);
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'status', 'locked', 
        'ticket_type', v_ticket_type,
        'lock_expires_at', NOW() + INTERVAL '15 minutes',
        'remaining_seconds', 900,
        'is_attended_before', v_whitelist.attended_before
    );
END;
c:\Users\erkan\DPG;
