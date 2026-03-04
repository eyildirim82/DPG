-- =============================================================================
-- Migration: Hard cleanup - drop legacy get_checkin_table_occupants RPC
-- Date: 2026-03-04
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_checkin_table_occupants(text, text);
