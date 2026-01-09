-- Quick fix: Update stock_items.sku_id to VARCHAR to match skus.id
-- This assumes skus.id is already VARCHAR(100)

-- Step 1: Drop the foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stock_items_sku_id_fkey'
    ) THEN
        ALTER TABLE stock_items DROP CONSTRAINT stock_items_sku_id_fkey;
        RAISE NOTICE 'Dropped constraint stock_items_sku_id_fkey';
    END IF;
END $$;

-- Step 1.5: Clean up orphaned records (SKUs that don't exist anymore)
DELETE FROM stock_items
WHERE sku_id::text NOT IN (SELECT id FROM skus);

-- Step 2: Change sku_id column type to VARCHAR(100)
ALTER TABLE stock_items ALTER COLUMN sku_id TYPE VARCHAR(100);

-- Step 3: Recreate the foreign key constraint
ALTER TABLE stock_items ADD CONSTRAINT stock_items_sku_id_fkey
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;

-- Step 4: Do the same for stock_ledger
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stock_ledger_sku_id_fkey'
    ) THEN
        ALTER TABLE stock_ledger DROP CONSTRAINT stock_ledger_sku_id_fkey;
    END IF;
END $$;

-- Clean up orphaned stock_ledger records
DELETE FROM stock_ledger
WHERE sku_id::text NOT IN (SELECT id FROM skus);

ALTER TABLE stock_ledger ALTER COLUMN sku_id TYPE VARCHAR(100);

ALTER TABLE stock_ledger ADD CONSTRAINT stock_ledger_sku_id_fkey
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;

-- Step 5: Update stock_transfer_items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stock_transfer_items_sku_id_fkey'
    ) THEN
        ALTER TABLE stock_transfer_items DROP CONSTRAINT stock_transfer_items_sku_id_fkey;
    END IF;
END $$;

-- Clean up orphaned stock_transfer_items records
DELETE FROM stock_transfer_items
WHERE sku_id::text NOT IN (SELECT id FROM skus);

ALTER TABLE stock_transfer_items ALTER COLUMN sku_id TYPE VARCHAR(100);

ALTER TABLE stock_transfer_items ADD CONSTRAINT stock_transfer_items_sku_id_fkey
    FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;

SELECT 'Migration complete: stock_items, stock_ledger, and stock_transfer_items updated to VARCHAR(100)' as result;
