from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import RoleEnum


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)
    remember_me: bool = False


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    full_name: str
    phone_number: str | None = None
    profile_picture_url: str | None = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=1)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class UserCreate(BaseModel):
    email: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    role: RoleEnum
    full_name: str = Field(..., min_length=1)
    phone_number: str | None = None


class UserUpdate(BaseModel):
    email: str | None = None
    username: str | None = None
    full_name: str | None = None
    phone_number: str | None = None
    is_active: bool | None = None