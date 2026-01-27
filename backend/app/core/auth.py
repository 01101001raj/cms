"""
JWT Authentication Module
Validates Supabase JWT tokens and provides user info to protected routes.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import httpx
from pydantic import BaseModel
from app.core.config import settings


# Security scheme for Swagger docs
security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    """User data extracted from JWT token"""
    user_id: str
    email: str
    role: Optional[str] = None


class CurrentUser(BaseModel):
    """Current authenticated user"""
    id: str
    email: str
    role: str = "user"
    store_id: Optional[str] = None
    permissions: list = []


async def verify_supabase_token(token: str) -> Optional[dict]:
    """
    Verify a Supabase JWT token by calling Supabase's auth API.
    Returns user data if valid, None if invalid.
    """
    try:
        # Supabase auth API endpoint
        url = f"{settings.SUPABASE_URL}/auth/v1/user"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": settings.SUPABASE_KEY
                }
            )
            
            if response.status_code == 200:
                return response.json()
            return None
            
    except Exception as e:
        print(f"[AUTH ERROR] Token verification failed: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    Dependency to get current authenticated user.
    Use this in protected routes: Depends(get_current_user)
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    user_data = await verify_supabase_token(token)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get additional user info from public.users table
    from app.core.supabase import get_supabase_admin_client
    supabase = get_supabase_admin_client()
    
    try:
        user_profile = supabase.table("users").select("*").eq("id", user_data["id"]).single().execute()
        profile = user_profile.data if user_profile.data else {}
    except:
        profile = {}
    
    return CurrentUser(
        id=user_data["id"],
        email=user_data.get("email", ""),
        role=profile.get("role", "user"),
        store_id=profile.get("store_id"),
        permissions=profile.get("permissions", [])
    )


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[CurrentUser]:
    """
    Optional authentication - returns None if no token provided.
    Use for routes that work with or without auth.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


def require_role(*allowed_roles: str):
    """
    Dependency factory to require specific roles.
    Usage: Depends(require_role("admin", "manager"))
    """
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not authorized. Required: {allowed_roles}"
            )
        return current_user
    return role_checker


# Convenience dependencies
require_admin = require_role("admin")
require_manager = require_role("admin", "manager")
