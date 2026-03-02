-- Migration: Enhanced get_ticket_stats with 4-way split (asil/yedek × eski/yeni)
-- Deployed: 2026-03-02
-- Purpose: Dashboard'da asil ve yedek ayrı ayrı, eski/yeni katılımcı bazında gösterim

CREATE OR REPLACE FUNCTION public.get_ticket_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total_reserved INTEGER;
  v_capacity_total INTEGER := 1500;
  v_capacity_asil INTEGER;
  v_asil_returning_cap INTEGER := 500;
  v_asil_new_cap INTEGER := 200;
  v_asil_returning_reserved INTEGER;
  v_asil_new_reserved INTEGER;
  v_yedek_returning_reserved INTEGER;
  v_yedek_new_reserved INTEGER;
  v_returning_total INTEGER;
BEGIN
  -- Dynamic quota from cf_quota_settings
  BEGIN
    SELECT
      COALESCE(total_capacity, 1500),
      COALESCE(asil_returning_capacity, 500),
      COALESCE(asil_new_capacity, 200)
    INTO v_capacity_total, v_asil_returning_cap, v_asil_new_cap
    FROM public.cf_quota_settings
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_capacity_total := 1500;
    v_asil_returning_cap := 500;
    v_asil_new_cap := 200;
  END;

  IF v_capacity_total IS NULL THEN v_capacity_total := 1500; END IF;
  IF v_asil_returning_cap IS NULL THEN v_asil_returning_cap := 500; END IF;
  IF v_asil_new_cap IS NULL THEN v_asil_new_cap := 200; END IF;

  v_capacity_asil := v_asil_returning_cap + v_asil_new_cap;

  -- Total reserved (including active locks)
  SELECT COALESCE(SUM(ticket_count), 0) INTO v_total_reserved
  FROM public.cf_submissions
  WHERE status NOT IN ('rejected', 'cancelled', 'expired')
    AND (status != 'locked' OR soft_lock_until > NOW());

  -- Asil Eski (attended_before=true, ticket_type='asil')
  SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_asil_returning_reserved
  FROM public.cf_submissions s
  JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
  WHERE w.attended_before = true
    AND s.ticket_type = 'asil'
    AND s.status NOT IN ('rejected', 'cancelled', 'expired')
    AND (s.status != 'locked' OR s.soft_lock_until > NOW());

  -- Yedek Eski (attended_before=true, ticket_type='yedek')
  SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_yedek_returning_reserved
  FROM public.cf_submissions s
  JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
  WHERE w.attended_before = true
    AND s.ticket_type = 'yedek'
    AND s.status NOT IN ('rejected', 'cancelled', 'expired')
    AND (s.status != 'locked' OR s.soft_lock_until > NOW());

  -- Asil Yeni (attended_before=false, ticket_type='asil')
  SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_asil_new_reserved
  FROM public.cf_submissions s
  JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
  WHERE COALESCE(w.attended_before, false) = false
    AND s.ticket_type = 'asil'
    AND s.status NOT IN ('rejected', 'cancelled', 'expired')
    AND (s.status != 'locked' OR s.soft_lock_until > NOW());

  -- Yedek Yeni (attended_before=false, ticket_type='yedek')
  SELECT COALESCE(SUM(s.ticket_count), 0) INTO v_yedek_new_reserved
  FROM public.cf_submissions s
  JOIN public.cf_whitelist w ON w.tc_no = s.tc_no
  WHERE COALESCE(w.attended_before, false) = false
    AND s.ticket_type = 'yedek'
    AND s.status NOT IN ('rejected', 'cancelled', 'expired')
    AND (s.status != 'locked' OR s.soft_lock_until > NOW());

  RETURN json_build_object(
    'total_reserved', v_total_reserved,
    'total_capacity', v_capacity_total,
    'asil_capacity', v_capacity_asil,
    'yedek_capacity', v_capacity_total - v_capacity_asil,
    'asil_returning_capacity', v_asil_returning_cap,
    'asil_returning_reserved', v_asil_returning_reserved,
    'asil_new_capacity', v_asil_new_cap,
    'asil_new_reserved', v_asil_new_reserved,
    'yedek_returning_reserved', v_yedek_returning_reserved,
    'yedek_new_reserved', v_yedek_new_reserved
  );
END;
$function$;
