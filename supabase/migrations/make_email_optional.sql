-- Make email column optional (allow NULLs) and remove unique constraint if it prevents duplicate NULLs (Postgres handles NULLs as unique by default, but let's be safe)
-- Actually, Postgres UNIQUE constraint allows multiple NULLs.
-- So we just need to DROP NOT NULL.

ALTER TABLE public.employees ALTER COLUMN email DROP NOT NULL;
