from fastapi import APIRouter, HTTPException, Depends, status, Response
from app.core.auth import get_current_user, CurrentUser
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.core.supabase import get_supabase_admin_client
from supabase import Client
from gotrue.errors import AuthApiError
from app.services.audit import log_user_created, log_user_updated, log_user_deleted

router = APIRouter(prefix="/users", tags=["Users"])


class UserCreate(BaseModel):
    username: str  # email
    password: str
    role: str
    storeId: Optional[str] = None
    permissions: Optional[List[str]] = []
    asmId: Optional[str] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None  # Optional - only update if provided
    role: Optional[str] = None
    storeId: Optional[str] = None
    permissions: Optional[List[str]] = None
    asmId: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    storeId: Optional[str] = None
    permissions: Optional[List[str]] = []
    asmId: Optional[str] = None


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Create a new user using Supabase Admin SDK.
    This allows instant user creation without email confirmation.
    """
    try:
        # Create user in Supabase Auth using admin API
        auth_response = supabase.auth.admin.create_user({
            "email": user_data.username,
            "password": user_data.password,
            "email_confirm": True  # Auto-confirm email
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user in auth system")
        
        user_id = auth_response.user.id
        
        # Update the user profile in public.users table
        # (A trigger should have created a basic row, we update it with full data)
        profile_data = {
            "username": user_data.username,
            "role": user_data.role,
            "store_id": user_data.storeId,
            "permissions": user_data.permissions or [],
            "asm_id": user_data.asmId
        }
        
        profile_response = supabase.table("users").update(profile_data).eq("id", user_id).execute()
        
        if not profile_response.data:
            # If update failed, try insert (in case trigger didn't create row)
            profile_data["id"] = user_id
            profile_response = supabase.table("users").insert(profile_data).execute()
        
        user = profile_response.data[0] if profile_response.data else None
        
        if not user:
            raise HTTPException(status_code=400, detail="Failed to create user profile")
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            role=user["role"],
            storeId=user.get("store_id"),
            permissions=user.get("permissions", []),
            asmId=user.get("asm_id")
        )
        
        # Audit log
        await log_user_created(
            new_user_id=user["id"],
            admin_id=current_user.id,
            admin_username=current_user.email,
            user_data={"username": user_data.username, "role": user_data.role}
        )
        
    except AuthApiError as e:
        error_msg = str(e)
        if "already been registered" in error_msg.lower() or "already exists" in error_msg.lower():
            raise HTTPException(status_code=400, detail="A user with this email already exists")
        raise HTTPException(status_code=400, detail=f"Auth error: {error_msg}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Update a user's profile and optionally their password.
    Uses admin API so any user's password can be changed.
    """
    try:
        # Update password if provided (using admin API)
        if user_data.password:
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"password": user_data.password}
            )
        
        # Build profile update data (only include non-None fields)
        profile_update = {}
        if user_data.username is not None:
            profile_update["username"] = user_data.username
            # Also update email in auth if username changed
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"email": user_data.username}
            )
        if user_data.role is not None:
            profile_update["role"] = user_data.role
        if user_data.storeId is not None:
            profile_update["store_id"] = user_data.storeId if user_data.storeId else None
        if user_data.permissions is not None:
            profile_update["permissions"] = user_data.permissions
        if user_data.asmId is not None:
            profile_update["asm_id"] = user_data.asmId if user_data.asmId else None
        
        # Update profile in users table if there are changes
        if profile_update:
            response = supabase.table("users").update(profile_update).eq("id", user_id).execute()
        else:
            # Just fetch current data if only password was updated
            response = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = response.data[0]
        
        # Audit log
        await log_user_updated(
            user_id=user_id,
            admin_id=current_user.id,
            admin_username=current_user.email,
            changes=profile_update
        )
        
        return UserResponse(
            id=user["id"],
            username=user["username"],
            role=user["role"],
            storeId=user.get("store_id"),
            permissions=user.get("permissions", []),
            asmId=user.get("asm_id")
        )
        
    except AuthApiError as e:
        raise HTTPException(status_code=400, detail=f"Auth error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_admin_client)
):
    """
    Delete a user completely from both auth.users and public.users.
    Uses admin API for proper cleanup.
    """
    try:
        # First get user info before deleting
        user_info = supabase.table("users").select("username").eq("id", user_id).execute()
        deleted_username = user_info.data[0]["username"] if user_info.data else "unknown"
        
        # Delete from public.users table
        supabase.table("users").delete().eq("id", user_id).execute()
        
        # Then delete from auth.users using admin API
        supabase.auth.admin.delete_user(user_id)
        
        # Audit log
        await log_user_deleted(
            deleted_user_id=user_id,
            admin_id=current_user.id,
            admin_username=current_user.email,
            deleted_username=deleted_username
        )
        
        return Response(status_code=status.HTTP_204_NO_CONTENT)
        
    except AuthApiError as e:
        # If auth deletion fails but profile was deleted, that's still partial success
        print(f"Warning: Auth deletion failed: {e}")
        return {"message": "User profile deleted, but auth entry may remain"}
    except Exception as e:
        print(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
