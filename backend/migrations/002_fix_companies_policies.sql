-- Fix RLS policies for companies table
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated read companies" ON companies;
DROP POLICY IF EXISTS "Allow Plant Admin manage companies" ON companies;

-- Create simpler policies that actually work
-- Allow all authenticated users to read companies
CREATE POLICY "companies_select_policy"
    ON companies
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow all authenticated users to insert/update/delete companies
-- (You can restrict this later if needed)
CREATE POLICY "companies_insert_policy"
    ON companies
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "companies_update_policy"
    ON companies
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "companies_delete_policy"
    ON companies
    FOR DELETE
    TO authenticated
    USING (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'companies';
