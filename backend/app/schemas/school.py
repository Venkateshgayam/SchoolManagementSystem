from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=5000)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    principal_name: Optional[str] = Field(None, max_length=255)
    established_year: Optional[int] = Field(None, ge=1800, le=2030)
    logo_url: Optional[str] = Field(None, max_length=500)


class SchoolUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, max_length=5000)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    principal_name: Optional[str] = Field(None, max_length=255)
    established_year: Optional[int] = Field(None, ge=1800, le=2030)
    logo_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class SchoolResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    principal_name: Optional[str] = None
    established_year: Optional[int] = None
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True