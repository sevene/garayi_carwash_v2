-- Add commission column to ticket_items
ALTER TABLE ticket_items ADD COLUMN IF NOT EXISTS commission NUMERIC(12, 2) DEFAULT 0;
