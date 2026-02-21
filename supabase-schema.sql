-- =============================================
-- Garayi Carwash POS - Supabase PostgreSQL Schema
-- Designed for use with PowerSync offline-first sync
-- =============================================

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT DEFAULT 'Garayi Carwash',
  address_street TEXT,
  currency TEXT DEFAULT 'PHP',
  tax_rate NUMERIC(5, 4) DEFAULT 0.08,
  enable_notifications BOOLEAN DEFAULT TRUE,
  theme TEXT DEFAULT 'light',
  receipt_header TEXT,
  receipt_footer TEXT,
  printer_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EMPLOYEES TABLE (for authentication and staff management)
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,

  role TEXT DEFAULT 'staff',
  pin TEXT,
  contact_info JSONB DEFAULT '{}',
  address TEXT,
  status TEXT DEFAULT 'active',
  compensation JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PRODUCTS TABLE (Inventory Only)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id),
  volume TEXT,
  unit_type TEXT,
  sold_by TEXT DEFAULT 'piece',
  cost NUMERIC(12, 2) DEFAULT 0,
  show_in_pos BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INVENTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id)
);

-- =============================================
-- SERVICES TABLE (Labor/Wash Only)
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  service_price NUMERIC(12, 2) DEFAULT 0,
  labor_cost NUMERIC(12, 2) DEFAULT 0,
  labor_cost_type TEXT DEFAULT 'fixed',
  duration_minutes INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  show_in_pos BOOLEAN DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SERVICE INGREDIENTS (Recipe) TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS service_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10, 4) DEFAULT 1,
  unit_cost NUMERIC(12, 2) DEFAULT 0,
  price_basis TEXT DEFAULT 'cost'
);

-- =============================================
-- SERVICE VARIANTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS service_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL
);

-- =============================================
-- SERVICE VARIANT INGREDIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS service_variant_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES service_variants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(10, 4) DEFAULT 1
);

-- =============================================
-- CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_street TEXT,
  address_city TEXT,
  address_zip TEXT,
  notes TEXT,
  loyalty_points INTEGER DEFAULT 0,
  visits_count INTEGER DEFAULT 0,
  last_visit TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CUSTOMER VEHICLES TABLE (One-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS customer_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plate_number TEXT,
  make_model TEXT,
  vehicle_type TEXT,
  vehicle_color TEXT,
  vehicle_size TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- EXPENSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  category TEXT,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  type TEXT DEFAULT 'opex', -- 'opex' or 'capex'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TICKETS (Job Orders)
-- =============================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  subtotal NUMERIC(12, 2) DEFAULT 0,
  tax_rate NUMERIC(5, 4) DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'QUEUED',
  payment_method TEXT,
  customer_id UUID REFERENCES customers(id),
  plate_number TEXT,
  name TEXT
);

-- =============================================
-- TICKET ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  item_type TEXT DEFAULT 'service',
  item_id UUID,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL,
  commission NUMERIC(12, 2) DEFAULT 0,
  crew_snapshot JSONB,
  sort_order INTEGER DEFAULT 0
);

-- =============================================
-- TICKET ASSIGNMENTS (Crew/Staff linking)
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  role TEXT DEFAULT 'crew',
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_items_ticket ON ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON customer_vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);

-- =============================================
-- POWERSYNC SETUP
-- =============================================

-- Create a role/user with replication privileges for PowerSync
-- (Run this as a database admin in Supabase SQL Editor)
-- Note: Replace 'your_secure_password' with a strong password
/*
CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN PASSWORD 'your_secure_password';

-- Grant SELECT access on all tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;

-- Grant SELECT on all future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Create the publication for PowerSync (must be named "powersync")
CREATE PUBLICATION powersync FOR ALL TABLES;
*/

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Admin User
INSERT INTO employees (username, email, name, role, status)
VALUES
('admin', 'admin@garayi.com', 'Administrator', 'admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- Seed Initial Settings
INSERT INTO settings (id, name, currency)
VALUES ('00000000-0000-0000-0000-000000000001', 'Garayi Carwash', 'PHP')
ON CONFLICT (id) DO NOTHING;
