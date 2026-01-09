-- Migration Part 1: Drop foreign key constraints
-- Run this first

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

SELECT 'Part 1 complete: Foreign key constraints dropped' as result;
