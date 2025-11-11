from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Distributor Management System"

    # CORS Configuration
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "*"
    ]

    # JWT Configuration (if needed for custom auth)
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
