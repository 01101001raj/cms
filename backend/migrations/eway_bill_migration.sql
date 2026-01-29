-- ============================================
-- MIGRATION: Add E-Way Bill Support
-- Description: Add E-Way Bill fields to orders
-- ============================================

-- Add E-Way Bill fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eway_bill_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eway_bill_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eway_bill_valid_until TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transporter_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transport_mode TEXT; -- Road, Rail, Air, Ship
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS supply_type TEXT DEFAULT 'Outward'; -- Outward, Inward

-- Add indexes for E-Way Bill queries
CREATE INDEX IF NOT EXISTS idx_orders_eway_bill_number ON orders(eway_bill_number) WHERE eway_bill_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_eway_bill_date ON orders(eway_bill_date) WHERE eway_bill_date IS NOT NULL;

-- Add constraint to ensure E-Way Bill number is unique
ALTER TABLE orders ADD CONSTRAINT unique_eway_bill_number UNIQUE (eway_bill_number);

COMMENT ON COLUMN orders.eway_bill_number IS 'E-Way Bill number generated from NIC portal';
COMMENT ON COLUMN orders.supply_type IS 'Outward for sales, Inward for returns';
