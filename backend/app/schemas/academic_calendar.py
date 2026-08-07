from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class AcademicCalendarCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    event_date: date
    event_type: Optional[str] = Field(None, max_length=50)
    school_id: Optional[int] = None


class AcademicCalendarUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    event_date: Optional[date] = None
    event_type: Optional[str] = Field(None, max_length=50)
    school_id: Optional[int] = None


class AcademicCalendarResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    event_date: date
    event_type: Optional[str] = None
    school_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True