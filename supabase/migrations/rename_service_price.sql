-- Rename service_price column to price in services table for consistency
ALTER TABLE services RENAME COLUMN service_price TO price;
