-- Migration: Update SKUs table with comprehensive product management fields
-- Run this in Supabase SQL Editor

-- Step 0: Change id column type from UUID to VARCHAR to support custom SKU codes
-- First, drop any foreign key constraints that reference skus.id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE confrelid = 'skus'::regclass
    ) LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
        RAISE NOTICE 'Dropped constraint % on table %', r.conname, r.table_name;
    END LOOP;
END $$;

-- Change id column type from UUID to VARCHAR(100)
ALTER TABLE skus ALTER COLUMN id TYPE VARCHAR(100);

-- Step 1: Add new columns to skus table
ALTER TABLE skus
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'Volume',
ADD COLUMN IF NOT EXISTS units_per_carton INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_size DECIMAL(10,2) DEFAULT 1000,
ADD COLUMN IF NOT EXISTS carton_size DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_net_carton DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_gross_carton DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';

-- Step 2: Rename camelCase columns to snake_case if they exist
-- (Use ALTER TABLE only if columns exist in camelCase format)
DO $$
BEGIN
    -- Check and rename hsnCode to hsn_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'skus' AND column_name = 'hsnCode'
    ) THEN
        ALTER TABLE skus RENAME COLUMN "hsnCode" TO hsn_code;
    END IF;

    -- Check and rename gstPercentage to gst_percentage
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'skus' AND column_name = 'gstPercentage'
    ) THEN
        ALTER TABLE skus RENAME COLUMN "gstPercentage" TO gst_percentage;
    END IF;
END $$;

-- Step 3: Add hsn_code and gst_percentage if they don't exist (in case table was already using snake_case)
ALTER TABLE skus
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2);

-- Step 4: Add constraints for new fields (with safe exception handling)
DO $$
BEGIN
    -- Add product_type constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_type'
    ) THEN
        ALTER TABLE skus ADD CONSTRAINT chk_product_type
            CHECK (product_type IN ('Volume', 'Mass'));
    END IF;

    -- Add status constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_status'
    ) THEN
        ALTER TABLE skus ADD CONSTRAINT chk_status
            CHECK (status IN ('Active', 'Discontinued', 'Out of Stock'));
    END IF;
END $$;

-- Step 5: Update existing records with default values if null
UPDATE skus
SET
    category = COALESCE(category, 'Uncategorized'),
    product_type = COALESCE(product_type, 'Volume'),
    units_per_carton = COALESCE(units_per_carton, 1),
    unit_size = COALESCE(unit_size, 1000),
    carton_size = COALESCE(carton_size, 0),
    price_net_carton = COALESCE(price_net_carton, 0),
    price_gross_carton = COALESCE(price_gross_carton, price),
    status = COALESCE(status, 'Active')
WHERE category IS NULL
   OR product_type IS NULL
   OR units_per_carton IS NULL
   OR unit_size IS NULL
   OR carton_size IS NULL
   OR price_net_carton IS NULL
   OR price_gross_carton IS NULL
   OR status IS NULL;

-- Step 6: Recreate foreign key constraints with new VARCHAR type
-- Recreate constraints for tables that reference skus.id
DO $$
BEGIN
    -- Add back foreign key for order_items table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        -- First update sku_id column type in order_items
        ALTER TABLE order_items ALTER COLUMN sku_id TYPE VARCHAR(100);
        -- Add foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sku_id_fkey'
        ) THEN
            ALTER TABLE order_items ADD CONSTRAINT order_items_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Add back foreign key for schemes table (buy_sku_id and get_sku_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schemes') THEN
        ALTER TABLE schemes ALTER COLUMN buy_sku_id TYPE VARCHAR(100);
        ALTER TABLE schemes ALTER COLUMN get_sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'schemes_buy_sku_id_fkey'
        ) THEN
            ALTER TABLE schemes ADD CONSTRAINT schemes_buy_sku_id_fkey
                FOREIGN KEY (buy_sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'schemes_get_sku_id_fkey'
        ) THEN
            ALTER TABLE schemes ADD CONSTRAINT schemes_get_sku_id_fkey
                FOREIGN KEY (get_sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Add back foreign key for stock table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock') THEN
        ALTER TABLE stock ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'stock_sku_id_fkey'
        ) THEN
            ALTER TABLE stock ADD CONSTRAINT stock_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Add back foreign key for price_tier_items table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_tier_items') THEN
        ALTER TABLE price_tier_items ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'price_tier_items_sku_id_fkey'
        ) THEN
            ALTER TABLE price_tier_items ADD CONSTRAINT price_tier_items_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Add back foreign key for stock_movements table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        ALTER TABLE stock_movements ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_sku_id_fkey'
        ) THEN
            ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

-- Success message
SELECT 'Migration completed successfully! SKUs table updated with comprehensive product management fields.' as result;
