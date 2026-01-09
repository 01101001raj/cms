-- Migration Part 6: Update existing records with default values
-- Run this after Part 5

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

SELECT 'Part 6 complete: Existing data updated' as result;
