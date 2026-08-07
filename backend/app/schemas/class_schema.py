from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ClassCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    section: Optional[str] = Field(None, max_length=50)
    academic_year: Optional[str] = Field(None, max_length=20)
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    capacity: Optional[int] = Field(None, ge=1)


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    section: Optional[str] = Field(None, max_length=50)
    academic_year: Optional[str] = Field(None, max_length=20)
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    capacity: Optional[int] = Field(None, ge=1)


class ClassResponse(BaseModel):
    id: int
    name: str
    section: Optional[str] = None
    academic_year: Optional[str] = None
    teacher_id: Optional[int] = None
    school_id: Optional[int] = None
    capacity: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True