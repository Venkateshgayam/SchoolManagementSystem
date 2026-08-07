from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class TeacherCreate(BaseModel):
    user_id: Optional[int] = None
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    qualification: Optional[str] = Field(None, max_length=255)
    experience_years: Optional[int] = Field(None, ge=0)
    employment_date: Optional[datetime] = None
    status: str = Field(default="active", max_length=20)


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    qualification: Optional[str] = Field(None, max_length=255)
    experience_years: Optional[int] = Field(None, ge=0)
    employment_date: Optional[datetime] = None
    status: Optional[str] = Field(None, max_length=20)


class TeacherResponse(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    employment_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
