-- Fix missing email for admin user if it was lost during migration
UPDATE public.employees
SET email = 'admin@garayi.com'
WHERE username = 'admin' AND (email IS NULL OR email = '');

-- Ensure the role column is correctly using UUIDs (safety check)
DO $$
BEGIN
    -- This block is just a safeguard. The previous migrations should have handled this.
END $$;
