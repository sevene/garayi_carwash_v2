-- FIX for "default for column role cannot be cast automatically" error

-- 1. First, remove the existing default value ('staff') which is text and causes the error
ALTER TABLE public.employees ALTER COLUMN role DROP DEFAULT;

-- 2. Update existing text roles to their corresponding UUIDs from the roles table
--    (Assuming you have 'admin' and 'crew' in your roles table based on the screenshot)

-- Update 'admin' text to the actual UUID of the admin role
UPDATE public.employees
SET role = (SELECT id::text FROM public.roles WHERE name = 'admin' LIMIT 1)
WHERE role = 'admin';

-- Update 'staff' or 'crew' text to the actual UUID of the crew role
UPDATE public.employees
SET role = (SELECT id::text FROM public.roles WHERE name = 'crew' OR name = 'staff' LIMIT 1)
WHERE role = 'staff' OR role = 'crew' OR role IS NULL;

-- 3. Now we can safely convert the column to UUID
ALTER TABLE public.employees
ALTER COLUMN role TYPE UUID USING role::uuid;

-- 4. Add the Foreign Key Constraint
ALTER TABLE public.employees
ADD CONSTRAINT fk_employees_role
FOREIGN KEY (role)
REFERENCES public.roles(id)
ON DELETE SET NULL;

-- 5. (Optional) Set a new default value to the 'crew' role UUID
DO $$
DECLARE
    crew_role_id uuid;
BEGIN
    SELECT id INTO crew_role_id FROM public.roles WHERE name = 'crew' OR name = 'staff' LIMIT 1;
    IF crew_role_id IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.employees ALTER COLUMN role SET DEFAULT ' || quote_literal(crew_role_id);
    END IF;
END $$;
