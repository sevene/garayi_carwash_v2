-- 0. Add missing columns to service_variants table
-- We need these to move the data from the services table down to the variants
ALTER TABLE service_variants ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_variants ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE service_variants ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 1. Create the unified recipes table
CREATE TABLE IF NOT EXISTS service_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID REFERENCES service_variants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10,4) DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create "Standard" variants for services that don't have any variants
-- We take price directly from the service table (using 'price' as the column has been renamed)
INSERT INTO service_variants (id, service_id, name, price, labor_cost, duration_minutes, active)
SELECT
    uuid_generate_v4(),
    s.id,
    'Standard',
    COALESCE(s.price, 0), -- Updated to use 'price'
    COALESCE(s.labor_cost, 0),
    COALESCE(s.duration_minutes, 0),
    true
FROM services s
WHERE NOT EXISTS (
    SELECT 1 FROM service_variants sv WHERE sv.service_id = s.id
);

-- 3. Migrate Ingredient Data
-- A. Move existing variant ingredients to new recipes table
INSERT INTO service_recipes (variant_id, product_id, quantity)
SELECT variant_id, product_id, quantity
FROM service_variant_ingredients;

-- B. Move base service ingredients to the new "Standard" variants
INSERT INTO service_recipes (variant_id, product_id, quantity)
SELECT
    sv.id, -- Valid Variant ID we just created
    si.product_id,
    si.quantity
FROM service_ingredients si
JOIN service_variants sv ON sv.service_id = si.service_id AND sv.name = 'Standard';
