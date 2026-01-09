-- Migration Part 7: Recreate foreign key constraints
-- Run this after Part 6

DO $$
BEGIN
    -- Update order_items table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items') THEN
        ALTER TABLE order_items ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_sku_id_fkey') THEN
            ALTER TABLE order_items ADD CONSTRAINT order_items_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Update schemes table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schemes') THEN
        ALTER TABLE schemes ALTER COLUMN buy_sku_id TYPE VARCHAR(100);
        ALTER TABLE schemes ALTER COLUMN get_sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schemes_buy_sku_id_fkey') THEN
            ALTER TABLE schemes ADD CONSTRAINT schemes_buy_sku_id_fkey
                FOREIGN KEY (buy_sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'schemes_get_sku_id_fkey') THEN
            ALTER TABLE schemes ADD CONSTRAINT schemes_get_sku_id_fkey
                FOREIGN KEY (get_sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Update stock table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock') THEN
        ALTER TABLE stock ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_sku_id_fkey') THEN
            ALTER TABLE stock ADD CONSTRAINT stock_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Update price_tier_items table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_tier_items') THEN
        ALTER TABLE price_tier_items ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'price_tier_items_sku_id_fkey') THEN
            ALTER TABLE price_tier_items ADD CONSTRAINT price_tier_items_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;

    -- Update stock_movements table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
        ALTER TABLE stock_movements ALTER COLUMN sku_id TYPE VARCHAR(100);

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movements_sku_id_fkey') THEN
            ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_sku_id_fkey
                FOREIGN KEY (sku_id) REFERENCES skus(id) ON DELETE RESTRICT;
        END IF;
    END IF;
END $$;

SELECT 'Part 7 complete: All foreign key constraints recreated. Migration complete!' as result;
