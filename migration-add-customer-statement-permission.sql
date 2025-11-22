-- Migration: Add /customer-statement permission to existing users based on their roles
-- This grants access to Plant Admin, ASM, Executive, and Store Admin users

-- Update users with Plant Admin role (they get all permissions automatically, but just in case)
UPDATE users
SET permissions = COALESCE(permissions, '{}')::jsonb || '"/customer-statement"'::jsonb
WHERE role = 'Plant Admin'
  AND NOT (COALESCE(permissions, '{}')::jsonb ? '/customer-statement');

-- Update users with ASM role
UPDATE users
SET permissions = COALESCE(permissions, '{}')::jsonb || '"/customer-statement"'::jsonb
WHERE role = 'ASM'
  AND NOT (COALESCE(permissions, '{}')::jsonb ? '/customer-statement');

-- Update users with Executive role
UPDATE users
SET permissions = COALESCE(permissions, '{}')::jsonb || '"/customer-statement"'::jsonb
WHERE role = 'Executive'
  AND NOT (COALESCE(permissions, '{}')::jsonb ? '/customer-statement');

-- Update users with Store Admin role
UPDATE users
SET permissions = COALESCE(permissions, '{}')::jsonb || '"/customer-statement"'::jsonb
WHERE role = 'Store Admin'
  AND NOT (COALESCE(permissions, '{}')::jsonb ? '/customer-statement');
