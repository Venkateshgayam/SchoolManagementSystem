from datetime import datetime, date
from pydantic import BaseModel, Field
from typing import Optional


class AttendanceCreate(BaseModel):
    student_id: int
    class_id: int
    date: date
    status: str = Field(..., min_length=1, max_length=20)
    marked_by: Optional[int] = None


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, min_length=1, max_length=20)
    marked_by: Optional[int] = None


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    class_id: int
    date: date
    status: str
    marked_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True