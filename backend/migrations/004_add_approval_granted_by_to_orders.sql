-- Migration: Add approval_granted_by column to orders table
-- This tracks which manager approved orders that result in negative balance

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS approval_granted_by text;

-- Add comment for documentation
COMMENT ON COLUMN orders.approval_granted_by IS 'Name of the manager who approved this order when it resulted in negative balance';

SELECT 'Migration completed: approval_granted_by column added to orders table' as result;
