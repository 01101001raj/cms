-- Migration Part 2: Change ID column type from UUID to VARCHAR
-- Run this after Part 1

ALTER TABLE skus ALTER COLUMN id TYPE VARCHAR(100);

SELECT 'Part 2 complete: ID column changed to VARCHAR(100)' as result;
