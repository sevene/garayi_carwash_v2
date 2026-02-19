-- Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    permissions TEXT, -- Stores JSON array of permissions
    assignments TEXT, -- Stores JSON array of assignments (e.g. ['pos_crew'])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON public.roles
    FOR SELECT TO authenticated USING (true);

-- Allow full access to authenticated users (adjust for production)
CREATE POLICY "Allow full access to authenticated users" ON public.roles
    FOR ALL TO authenticated USING (true);

-- Add to PowerSync publication (Uncomment if needed)
-- ALTER PUBLICATION powersync ADD TABLE public.roles;

-- =================================================================
-- LINK EMPLOYEES TO ROLES
-- =================================================================
-- 1. Create default roles if they don't exist
INSERT INTO public.roles (id, name, display_name, description, assignments)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'Administrator', 'Full system access', '[]'),
    ('00000000-0000-0000-0000-000000000002', 'staff', 'Staff', 'Standard access', '["pos_crew"]')
ON CONFLICT (id) DO NOTHING;

-- 2. Update existing employees to point to these role IDs instead of role names
--    Note: This assumes your current employees.role column contains 'admin' or 'staff' strings.
--    We will temporarily disable the foreign key constraint check if we were altering, but here we update data first.

-- Update 'admin' text roles to the admin UUID
UPDATE public.employees
SET role = '00000000-0000-0000-0000-000000000001'
WHERE role = 'admin';

-- Update 'staff' text roles (or any others) to the staff UUID
UPDATE public.employees
SET role = '00000000-0000-0000-0000-000000000002'
WHERE role = 'staff' OR role IS NULL;

-- 3. Now that data is aligned (mostly), we could alter the column type to UUID and add the FK.
--    However, safely changing a column type from TEXT to UUID can be tricky if dirty data remains.
--    Here is the safe approach:

-- A. Add a temporary foreign key constraint (but keep type as TEXT for now to avoid casting issues if not all GUIDs)
--    Actually, best practice is to cast to UUID if we are sure.
--    Let's Try to alter the column.
/*
   WARNING: The following block will fail if 'employees.role' contains values that are not valid UUIDs.
   Ensure the UPDATE statements above covered all cases.
*/

DO $$
BEGIN
    -- Check if we can cast all roles to UUID (naive check)
    -- If this block fails, you have distinct role names other than 'admin'/'staff' that need mapping.

    -- Alter the column type to UUID
    ALTER TABLE public.employees
    ALTER COLUMN role TYPE UUID USING role::UUID;

    -- Add the foreign key constraint
    ALTER TABLE public.employees
    ADD CONSTRAINT fk_employees_role
    FOREIGN KEY (role)
    REFERENCES public.roles(id)
    ON DELETE SET NULL;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not alter employees.role to UUID. You may have custom role names. Manual migration required.';
END $$;
