-- Create the forms table
CREATE TABLE public.cf_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    schema JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true
);

-- Create the submissions table
CREATE TABLE public.cf_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    form_id UUID REFERENCES public.cf_forms(id) ON DELETE CASCADE NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.cf_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cf_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for public access (allow reading active forms and submitting data)
CREATE POLICY "Allow public read of active forms" 
ON public.cf_forms FOR SELECT 
USING (is_active = true);

CREATE POLICY "Allow public insert to submissions" 
ON public.cf_submissions FOR INSERT 
WITH CHECK (true);

-- (In a real app, you would add admin policies here authenticated by Supabase Auth.
-- For now, we will allow all access for development, or you can manage rows via Supabase UI)
CREATE POLICY "Allow all access for dev on forms" ON public.cf_forms FOR ALL USING (true);
CREATE POLICY "Allow all access for dev on submissions" ON public.cf_submissions FOR ALL USING (true);

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cf_forms_updated_at
    BEFORE UPDATE ON public.cf_forms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
