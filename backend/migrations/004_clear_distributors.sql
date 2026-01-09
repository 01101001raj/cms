-- Clear all distributors from the table
-- This is needed to re-import the correct distributor data

DELETE FROM distributors;

-- Reset sequence for agent codes if needed
-- The bulk import will handle generating the correct agent codes
