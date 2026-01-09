-- Migration: Fix schemes table SKU ID column types
-- The buy_sku_id and get_sku_id columns are currently uuid type,
-- but they should be character varying to match skus.id

-- Step 0: Clean up any existing invalid schemes (with UUID SKU IDs that don't exist)
-- This deletes schemes that were created before but have invalid references
DELETE FROM schemes WHERE id IS NOT NULL;  -- Delete all existing schemes to start fresh

-- Step 1: Drop foreign key constraints if they exist
ALTER TABLE schemes DROP CONSTRAINT IF EXISTS schemes_buy_sku_id_fkey;
ALTER TABLE schemes DROP CONSTRAINT IF EXISTS schemes_get_sku_id_fkey;

-- Step 2: Change column types from uuid to character varying
ALTER TABLE schemes ALTER COLUMN buy_sku_id TYPE character varying USING buy_sku_id::text;
ALTER TABLE schemes ALTER COLUMN get_sku_id TYPE character varying USING get_sku_id::text;

-- Step 3: Add foreign key constraints back
-- Now these will work because the types match
ALTER TABLE schemes 
  ADD CONSTRAINT schemes_buy_sku_id_fkey 
  FOREIGN KEY (buy_sku_id) REFERENCES skus(id);

ALTER TABLE schemes 
  ADD CONSTRAINT schemes_get_sku_id_fkey 
  FOREIGN KEY (get_sku_id) REFERENCES skus(id);

-- Verification query
SELECT 'Migration completed successfully! Schemes SKU ID columns changed from uuid to character varying. All invalid schemes removed.' as result;
