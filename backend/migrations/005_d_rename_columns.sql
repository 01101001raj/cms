-- Migration Part 4: Rename camelCase columns to snake_case
-- Run this after Part 3

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

-- Add columns if they don't exist (in case table was already using snake_case)
ALTER TABLE skus
ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS gst_percentage DECIMAL(5,2);

SELECT 'Part 4 complete: Columns renamed to snake_case' as result;
