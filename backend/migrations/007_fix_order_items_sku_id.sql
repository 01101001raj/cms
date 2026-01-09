-- Fix order_items.sku_id to VARCHAR to match skus.id
-- This migration changes order_items.sku_id from UUID to VARCHAR(100)

-- Step 1: Drop the foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'order_items_sku_id_fkey'
    ) THEN
        ALTER TABLE order_items DROP CONSTRAINT order_items_sku_id_fkey;
        RAISE NOTICE 'Dropped constraint order_items_sku_id_fkey';
    END IF;
END $$;

-- Step 2: Clean up orphaned records (SKUs that don't exist anymore)
DELETE FROM order_items
WHERE sku_id::text NOT IN (SELECT id FROM skus);

-- Step 3: Change sku_id column type to VARCHAR(100)
ALTER TABLE order_items ALTER COLUMN sku_id TYPE VARCHAR(100);

-- Step 4: Recreate the foreign key constraint
ALTER TABLE order_items ADD CONSTRAINT order_items_sku_id_fkey
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;

SELECT 'Migration complete: order_items.sku_id updated to VARCHAR(100)' as result;
