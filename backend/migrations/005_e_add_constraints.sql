-- Migration Part 5: Add constraints
-- Run this after Part 4

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

SELECT 'Part 5 complete: Constraints added' as result;
