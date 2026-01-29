from typing import Optional, List
from pydantic import BaseModel
from .base_config import base_config
from .common import UserRole

class UserBase(BaseModel):
    username: str
    role: UserRole
    store_id: Optional[str] = None
    permissions: Optional[List[str]] = None
    asm_id: Optional[str] = None
    
    model_config = base_config

class User(UserBase):
    id: str

class UserCreate(UserBase):
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str
    
    model_config = base_config
