from pydantic import BaseModel, Field
from typing import Optional
from app.models.user import RoleEnum


class UserAdminUpdate(BaseModel):
    email: Optional[str] = Field(None, min_length=1)
    username: Optional[str] = Field(None, min_length=1)
    full_name: Optional[str] = Field(None, min_length=1)
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1)
    phone_number: Optional[str] = None