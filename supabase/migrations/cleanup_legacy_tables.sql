-- Clean up legacy tables after unified service model migration
-- WARN: Ensure 'unify_service_model.sql' has been run successfully before executing this!

DROP TABLE IF EXISTS service_ingredients;
DROP TABLE IF EXISTS service_variant_ingredients;

-- Optional: You can also drop the old 'service_price' column if you are sure everything uses 'price' now.
-- ALTER TABLE services DROP COLUMN IF EXISTS service_price;
