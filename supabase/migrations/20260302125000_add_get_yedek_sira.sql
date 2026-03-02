-- Migration: Dynamic yedek sıra (reserve queue number)
-- Deployed: 2026-03-02
-- Purpose: Yedek başvurulara dinamik sıra numarası atanması.
--          İptal olduğunda sıralar otomatik güncellenir (ROW_NUMBER hesaplı).

-- 1) get_yedek_sira: Tüm aktif yedek başvuruların dinamik sıra numarasını döner
CREATE OR REPLACE FUNCTION public.get_yedek_sira(p_tc_no text DEFAULT NULL::text)
 RETURNS TABLE(tc_no text, yedek_sira bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.tc_no,
    ROW_NUMBER() OVER (ORDER BY s.created_at ASC) AS yedek_sira
  FROM public.cf_submissions s
  WHERE s.ticket_type = 'yedek'
    AND s.status NOT IN ('rejected', 'cancelled', 'expired', 'locked')
  ORDER BY s.created_at ASC;
END;
$function$;

-- 2) submit_application güncellendi: yedek ise yedek_sira hesaplayıp döner
-- Not: submit_application fonksiyonu 20260302130000_submit_application_with_yedek_sira.sql migration'ında ayrıca tanımlandı.
