-- Migration: Add agent_code column and create companies table
-- Run this in Supabase SQL Editor

-- Step 1: Add agent_code column to distributors table
ALTER TABLE distributors
ADD COLUMN IF NOT EXISTS agent_code VARCHAR(10) UNIQUE;

-- Step 2: Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    gstin VARCHAR(20) NOT NULL,
    pan VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for companies
CREATE POLICY IF NOT EXISTS "Allow authenticated read companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "Allow Plant Admin manage companies"
    ON companies FOR ALL
    TO authenticated
    USING (true);

-- Step 5: Insert default company data (NSR DAIRY PRODUCTS)
INSERT INTO companies (
    name, address_line1, address_line2, city, state, pincode,
    phone, email, gstin, pan, bank_name, account_number, ifsc_code
) VALUES (
    'NSR DAIRY PRODUCTS',
    'Plot No. 123, Industrial Area',
    'Sector-5, Phase-2',
    'Hyderabad',
    'Telangana',
    '500032',
    '+91-9876543210',
    'info@nsrdairyproducts.com',
    '36XXXXX0000X1ZX',
    'XXXXX0000X',
    'State Bank of India',
    '1234567890',
    'SBIN0001234'
) ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Migration completed successfully! Agent code column added, companies table created.' as result;
