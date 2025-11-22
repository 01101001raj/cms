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
