from datetime import datetime, time
from pydantic import BaseModel, Field
from typing import Optional


class ScheduleCreate(BaseModel):
    class_id: int
    subject_id: int
    teacher_id: Optional[int] = None
    room: Optional[str] = Field(None, max_length=50)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    date: Optional[str] = None
    start_time: time
    end_time: time
    academic_year: Optional[str] = Field(None, max_length=20)


class ScheduleUpdate(BaseModel):
    class_id: Optional[int] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    room: Optional[str] = Field(None, max_length=50)
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    date: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    academic_year: Optional[str] = Field(None, max_length=20)


class ScheduleResponse(BaseModel):
    id: int
    class_id: int
    subject_id: int
    teacher_id: Optional[int] = None
    room: Optional[str] = None
    day_of_week: int
    start_time: time
    end_time: time
    academic_year: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True