-- Add sort_order column to ticket_items to maintain item order
ALTER TABLE public.ticket_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
