-- Add is_confirmed
ALTER TABLE public.cf_submissions 
  ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT false;

-- Create RPC for table stats
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO v_stats
  FROM (
    SELECT 
      CASE WHEN seating_preference LIKE '{%' THEN 
        (seating_preference::json)->>'cluster'
      ELSE
        seating_preference
      END as cluster,
      data->>'airline' as airline,
      COUNT(*)::int as count
    FROM public.cf_submissions
    WHERE status NOT IN ('rejected', 'cancelled')
      AND seating_preference IS NOT NULL
      AND seating_preference != ''
      AND seating_preference != 'null'
      AND data->>'airline' IS NOT NULL
      AND data->>'airline' != ''
    GROUP BY 1, 2
  ) t;
  
  RETURN COALESCE(v_stats, '[]'::json);
END;
$$;
