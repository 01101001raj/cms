from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase import get_supabase_admin_client
from supabase import Client

router = APIRouter(prefix="/migrations", tags=["Migrations"])


@router.post("/add-customer-statement-permission")
async def add_customer_statement_permission(
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    One-time migration to add /customer-statement permission to existing users
    Based on their roles: Plant Admin, ASM, Executive, Store Admin
    """
    try:
        # Roles that should have access to customer statement
        allowed_roles = ['Plant Admin', 'ASM', 'Executive', 'Store Admin']

        # Get all users with these roles
        response = supabase.table("users").select("*").in_("role", allowed_roles).execute()
        users = response.data or []

        updated_count = 0
        for user in users:
            current_permissions = user.get("permissions") or []

            # Check if already has the permission
            if "/customer-statement" not in current_permissions:
                # Add the permission
                new_permissions = current_permissions + ["/customer-statement"]

                # Update the user
                supabase.table("users").update({
                    "permissions": new_permissions
                }).eq("id", user["id"]).execute()

                updated_count += 1

        return {
            "message": f"Successfully added /customer-statement permission to {updated_count} users",
            "total_users_checked": len(users),
            "users_updated": updated_count
        }

    except Exception as e:
        import traceback
        print(f"ERROR in add_customer_statement_permission: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-agent-code-and-companies")
async def add_agent_code_and_companies(
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Comprehensive migration to:
    1. Add agent_code column to distributors
    2. Generate agent codes for existing distributors
    3. Create companies table
    """
    try:
        results = {}

        # Step 1: Add agent_code column to distributors table (SQL)
        try:
            # Note: This requires a PostgreSQL function or direct SQL execution
            # Since Supabase doesn't support ALTER TABLE directly, we'll handle this differently
            # Check if any distributor has agent_code field
            test_response = supabase.table("distributors").select("agent_code").limit(1).execute()
            results["agent_code_column"] = "Column already exists or needs manual SQL migration"
        except Exception as col_error:
            results["agent_code_column"] = f"Need to run SQL manually: ALTER TABLE distributors ADD COLUMN IF NOT EXISTS agent_code VARCHAR(10) UNIQUE;"

        # Step 2: Generate agent codes for existing distributors
        try:
            # Get all distributors
            response = supabase.table("distributors").select("id, agent_code").execute()
            distributors = response.data or []

            # Find distributors without agent codes
            without_codes = [d for d in distributors if not d.get('agent_code')]

            # Get the highest existing agent code
            existing_codes = [int(d.get('agent_code', '0')) for d in distributors if d.get('agent_code') and d.get('agent_code').isdigit()]
            next_code = max(existing_codes) + 1 if existing_codes else 101

            updated_count = 0
            for distributor in without_codes:
                agent_code = str(next_code).zfill(3)  # Format as 3 digits: 101, 102, etc.

                try:
                    supabase.table("distributors").update({
                        "agent_code": agent_code
                    }).eq("id", distributor["id"]).execute()

                    next_code += 1
                    updated_count += 1
                except:
                    # If column doesn't exist yet, skip
                    pass

            results["agent_codes_generated"] = f"Updated {updated_count} distributors. Next code: {str(next_code).zfill(3)}"
        except Exception as code_error:
            results["agent_codes_generated"] = f"Error: {str(code_error)}"

        # Step 3: Create companies table (SQL)
        # This needs to be run manually or via SQL editor
        results["companies_table"] = """
Run this SQL in Supabase SQL Editor:

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

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read companies"
    ON companies FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow Plant Admin manage companies"
    ON companies FOR ALL
    TO authenticated
    USING (true);
"""

        return {
            "success": True,
            "message": "Migration completed with partial success",
            "results": results,
            "note": "Some steps require manual SQL execution in Supabase dashboard"
        }

    except Exception as e:
        import traceback
        print(f"ERROR in add_agent_code_and_companies: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-asm-users")
async def create_asm_users(
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Create ASM users with default credentials
    """
    try:
        asm_users = [
            {"email": "Narendar.asm@nrichwater.com", "username": "Narendar"},
            {"email": "Suresh.asm@nrichwater.com", "username": "Suresh"},
            {"email": "Raju.asm@nrichwater.com", "username": "Raju"},
            {"email": "Prudvi.asm@nrichwater.com", "username": "Prudvi"},
            {"email": "Venkatesh.asm@nrichwater.com", "username": "Venkatesh"},
        ]

        created_users = []
        skipped_users = []
        errors = []
        default_password = "Nrich@123"  # Users should change on first login

        # ASM permissions
        asm_permissions = [
            '/dashboard', '/distributors/new', '/place-order', '/order-history',
            '/recharge-wallet', '/confirm-returns', '/sales', '/customer-statement'
        ]

        for asm_data in asm_users:
            try:
                # Check if user already exists
                existing = supabase.table("users").select("id").eq("username", asm_data["username"]).execute()
                if existing.data:
                    skipped_users.append(f"{asm_data['email']} (already exists)")
                    continue

                # Create auth user using admin API
                auth_user = supabase.auth.admin.create_user({
                    "email": asm_data["email"],
                    "password": default_password,
                    "email_confirm": True
                })

                # Create user profile in users table
                supabase.table("users").insert({
                    "id": auth_user.user.id,
                    "username": asm_data["username"],
                    "role": "ASM",
                    "permissions": asm_permissions,
                    "store_id": None,
                    "asm_id": None
                }).execute()

                created_users.append(asm_data["email"])

            except Exception as e:
                error_msg = str(e)
                errors.append(f"{asm_data['email']}: {error_msg}")

        return {
            "success": True,
            "message": f"ASM user creation completed",
            "created": created_users,
            "skipped": skipped_users,
            "errors": errors if errors else None,
            "default_password": default_password,
            "note": "Users should change password on first login"
        }

    except Exception as e:
        import traceback
        print(f"ERROR in create_asm_users: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
