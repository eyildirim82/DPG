-- Create Whitelist table
CREATE TABLE IF NOT EXISTS public.cf_whitelist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tc_no TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update Submissions table
ALTER TABLE public.cf_submissions 
  ADD COLUMN IF NOT EXISTS tc_no TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS seating_preference TEXT;

-- Enable RLS for whitelist
ALTER TABLE public.cf_whitelist ENABLE ROW LEVEL SECURITY;

-- Add Dev Policies
CREATE POLICY "Allow all access for dev on whitelist" ON public.cf_whitelist FOR ALL USING (true);

-- Allow public read of whitelist for TC verification
CREATE POLICY "Allow public read of whitelist" 
ON public.cf_whitelist FOR SELECT 
USING (true);
