-- Clear all distributor data
-- Run this in Supabase SQL Editor

-- Delete all distributors
DELETE FROM distributors;

-- Reset any sequences if needed
-- This ensures the next distributor will get a fresh ID

-- Verify deletion
SELECT COUNT(*) as remaining_distributors FROM distributors;

SELECT 'All distributors deleted successfully!' as status;
