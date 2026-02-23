-- Add soft_lock_until columns
ALTER TABLE public.cf_submissions 
  ADD COLUMN IF NOT EXISTS soft_lock_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ticket_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ticket_type TEXT;

-- Create check_and_lock_slot RPC
CREATE OR REPLACE FUNCTION check_and_lock_slot(p_tc_no TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_whitelist RECORD;
    v_existing_sub RECORD;
    v_total_reserved INTEGER;
    v_capacity_asil INTEGER := 700;
    v_capacity_total INTEGER := 1500;
    v_status TEXT := 'locked';
    v_ticket_type TEXT := 'asil';
BEGIN
    -- 1. Check Whitelist
    SELECT * INTO v_whitelist FROM public.cf_whitelist WHERE tc_no = p_tc_no;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error_type', 'not_found', 'message', 'TALPA üyesi değilsiniz.');
    END IF;

    -- Check debt (assuming is_debtor might exist or is_indebted, we can check dynamically if exists, else skip)
    BEGIN
        EXECUTE 'SELECT is_debtor FROM public.cf_whitelist WHERE tc_no = $1' INTO v_whitelist.is_debtor USING p_tc_no;
        IF v_whitelist.is_debtor THEN
            RETURN jsonb_build_object('success', false, 'error_type', 'debtor', 'message', 'Aidat borcunuz bulunmaktadır, DPG etkinliği kayıt sistemini kullanabilmeniz için borcunuzu ödemeniz gerekmektedir.');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Column does not exist, ignore
    END;

    -- 2. Check if already has a submission
    SELECT * INTO v_existing_sub FROM public.cf_submissions WHERE tc_no = p_tc_no;
    IF FOUND THEN
        -- If already approved/asil/yedek, return info
        IF v_existing_sub.status IN ('pending', 'approved', 'asil', 'yedek') THEN
            RETURN jsonb_build_object('success', true, 'status', v_existing_sub.status, 'message', 'Zaten kayıtlısınız.');
        ELSIF v_existing_sub.status = 'locked' AND v_existing_sub.soft_lock_until > NOW() THEN
            -- Extend lock
            UPDATE public.cf_submissions SET soft_lock_until = NOW() + INTERVAL '15 minutes' WHERE id = v_existing_sub.id;
            RETURN jsonb_build_object('success', true, 'status', 'locked', 'ticket_type', v_existing_sub.ticket_type, 'lock_expires_at', NOW() + INTERVAL '15 minutes');
        END IF;
    END IF;

    -- 3. Quota Control for Locking
    SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
    FROM public.cf_submissions 
    WHERE status != 'rejected' AND status != 'cancelled'
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
        SET status = 'locked', ticket_type = v_ticket_type, soft_lock_until = NOW() + INTERVAL '15 minutes'
        WHERE id = v_existing_sub.id;
    ELSE
        INSERT INTO public.cf_submissions (tc_no, status, soft_lock_until, ticket_count, ticket_type)
        VALUES (p_tc_no, 'locked', NOW() + INTERVAL '15 minutes', 1, v_ticket_type);
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'status', 'locked', 
        'ticket_type', v_ticket_type,
        'lock_expires_at', NOW() + INTERVAL '15 minutes',
        'is_attended_before', v_whitelist.attended_before
    );
END;
$$;

-- Modify get_ticket_stats to include locked slots
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_reserved INTEGER;
BEGIN
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
  FROM public.cf_submissions
  WHERE status != 'rejected' AND status != 'cancelled' AND (status != 'locked' OR soft_lock_until > NOW());

  RETURN json_build_object(
    'total_reserved', v_total_reserved,
    'total_capacity', 1500,
    'asil_capacity', 700,
    'yedek_capacity', 800
  );
END;
$$;

-- Create Cron Job for Expired Slots (Requires pg_cron extension)
CREATE EXTENSION IF NOT EXISTS pg_cron CASCADE;

CREATE OR REPLACE FUNCTION cleanup_expired_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.cf_submissions 
    WHERE status = 'locked' AND soft_lock_until < NOW();
END;
$$;

-- Schedule to run every minute
SELECT cron.schedule(
    'cleanup-slots-every-minute',
    '* * * * *',
    $$SELECT cleanup_expired_slots()$$
);

-- Enable Realtime for submissions (for masa seçimi and locks)
ALTER PUBLICATION supabase_realtime ADD TABLE public.cf_submissions;
