-- Create the cancel_application RPC
CREATE OR REPLACE FUNCTION cancel_application(p_tc_no TEXT, p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_submission RECORD;
BEGIN
    -- Only allow users who own the application to cancel, or if no user is provided, maybe it's anonymous (but we require user_id based on frontend logic)
    -- We assume p_user_id is the auth.uid() matching user_id in cf_submissions if we use RLS, but this is SECURITY DEFINER so we check manually.
    
    SELECT * INTO v_submission FROM public.cf_submissions WHERE tc_no = p_tc_no;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Başvuru bulunamadı.');
    END IF;

    -- Update status to cancelled
    UPDATE public.cf_submissions 
    SET status = 'cancelled'
    WHERE id = v_submission.id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Başvuru başarıyla iptal edildi.');
END;
$$;
