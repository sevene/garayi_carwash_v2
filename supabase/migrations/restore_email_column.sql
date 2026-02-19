-- Restore email column as optional (nullable)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;

-- Restore updated_at column if missing (also needed for sync)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Trigger for auto-update of updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_employees_updated_at') THEN
        CREATE TRIGGER update_employees_updated_at
        BEFORE UPDATE ON public.employees
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
