-- Create inventory_logs table for tracking all inventory changes
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('stock_adjustment', 'threshold_change', 'stock_and_threshold', 'initial_stock')),
    quantity_before INTEGER NOT NULL DEFAULT 0,
    quantity_after INTEGER NOT NULL DEFAULT 0,
    threshold_before INTEGER DEFAULT 10,
    threshold_after INTEGER DEFAULT 10,
    reason TEXT,
    notes TEXT,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    employee_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON public.inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_change_type ON public.inventory_logs(change_type);

-- Enable Row Level Security (matching your other tables)
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read/write
-- Adjust this based on your existing RLS policies
CREATE POLICY "Allow authenticated users full access to inventory_logs"
ON public.inventory_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.inventory_logs TO authenticated;
GRANT ALL ON public.inventory_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE public.inventory_logs IS 'Audit log for all inventory changes including stock adjustments and threshold modifications';
