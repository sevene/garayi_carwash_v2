-- Add crew_snapshot column to ticket_items to support crew assignment
ALTER TABLE public.ticket_items ADD COLUMN IF NOT EXISTS crew_snapshot JSONB DEFAULT '[]'::jsonb;
