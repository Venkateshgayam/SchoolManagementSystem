from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class StudentCreate(BaseModel):
    user_id: Optional[int] = None
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    roll_number: Optional[str] = Field(None, max_length=50)
    class_id: Optional[int] = None
    parent_email: Optional[str] = Field(None, max_length=255)
    enrollment_date: Optional[datetime] = None
    status: str = Field(default="active", max_length=20)


class StudentUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    username: Optional[str] = Field(None, max_length=100)
    password: Optional[str] = Field(None, min_length=8)
    roll_number: Optional[str] = Field(None, max_length=50)
    class_id: Optional[int] = None
    parent_email: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, max_length=20)
    enrollment_date: Optional[datetime] = None


class StudentResponse(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    roll_number: Optional[str] = None
    class_id: Optional[int] = None
    parent_email: Optional[str] = None
    enrollment_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
