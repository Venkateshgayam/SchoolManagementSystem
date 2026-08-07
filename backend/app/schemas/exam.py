from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class ExamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    exam_type: Optional[str] = Field(None, max_length=50)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    academic_year: Optional[str] = Field(None, max_length=20)
    created_by: Optional[int] = None


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    exam_type: Optional[str] = Field(None, max_length=50)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    academic_year: Optional[str] = Field(None, max_length=20)


class ExamResponse(BaseModel):
    id: int
    name: str
    exam_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    academic_year: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True