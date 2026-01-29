from fastapi import APIRouter, HTTPException, Depends
from app.models import LoginRequest, User
from app.core.supabase import get_supabase_client
from supabase import Client

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=User)
async def login(
    credentials: LoginRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Authenticate user with email and password
    """
    try:
        # Use Supabase Auth
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Fetch user details from users table
        user_data = supabase.table("users").select("*").eq("id", response.user.id).single().execute()

        if not user_data.data:
            raise HTTPException(status_code=404, detail="User not found")

        return user_data.data

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase_client)):
    """
    Logout current user
    """
    try:
        supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/password-reset")
async def send_password_reset(
    email: str,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Send password reset email
    """
    try:
        supabase.auth.reset_password_email(email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
