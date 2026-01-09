-- Migration Part 3: Add new product columns
-- Run this after Part 2

ALTER TABLE skus
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'Volume',
ADD COLUMN IF NOT EXISTS units_per_carton INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_size DECIMAL(10,2) DEFAULT 1000,
ADD COLUMN IF NOT EXISTS carton_size DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_net_carton DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_gross_carton DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';

SELECT 'Part 3 complete: New columns added' as result;
