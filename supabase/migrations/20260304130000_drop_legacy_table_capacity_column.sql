-- =============================================================================
-- Migration: Drop legacy table_capacity column after seatmap decommission
-- Date: 2026-03-04
-- =============================================================================

ALTER TABLE public.cf_quota_settings
DROP COLUMN IF EXISTS table_capacity;
