from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    school_id: Optional[int] = None
    teacher_id: Optional[int] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    school_id: Optional[int] = None
    teacher_id: Optional[int] = None


class SubjectResponse(BaseModel):
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    school_id: Optional[int] = None
    teacher_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True