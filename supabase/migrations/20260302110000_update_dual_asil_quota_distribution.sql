-- =============================================================================
-- Migration: Update dual asil quota distribution
-- Date: 2026-03-02
-- =============================================================================

DO $$
DECLARE
  v_quota_id bigint;
BEGIN
  SELECT id
    INTO v_quota_id
    FROM public.cf_quota_settings
   ORDER BY updated_at DESC NULLS LAST, id DESC
   LIMIT 1;

  IF v_quota_id IS NULL THEN
    RAISE EXCEPTION 'cf_quota_settings tablosunda güncellenecek kayıt bulunamadı.';
  END IF;

  UPDATE public.cf_quota_settings
     SET asil_returning_capacity = 500,
         asil_new_capacity = 200,
         updated_at = NOW()
   WHERE id = v_quota_id
     AND (
       asil_returning_capacity IS DISTINCT FROM 500
       OR asil_new_capacity IS DISTINCT FROM 200
     );
END $$;
