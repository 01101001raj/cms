-- Migration: Add shipment_size column to orders table
-- This tracks the total shipment size (volume/weight) of the order
-- Calculated as: sum of (carton_size × quantity) for all items

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipment_size numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN orders.shipment_size IS 'Total shipment size in liters or kg (sum of carton_size × quantity for all items)';

SELECT 'Migration completed: shipment_size column added to orders table' as result;
