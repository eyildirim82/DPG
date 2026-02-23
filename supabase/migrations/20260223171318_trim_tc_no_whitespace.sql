-- Replaces all non-digit characters (including spaces, newlines, etc.) with empty string
UPDATE public.cf_whitelist
SET tc_no = regexp_replace(tc_no, '\D', '', 'g');
