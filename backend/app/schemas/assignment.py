from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    subject_id: Optional[int] = None
    class_id: Optional[int] = None
    teacher_id: Optional[int] = None
    due_date: Optional[datetime] = None
    total_marks: Optional[int] = None
    attachment_url: Optional[str] = Field(None, max_length=500)


class AssignmentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subject_id: Optional[int] = None
    class_id: Optional[int] = None
    teacher_id: Optional[int] = None
    due_date: Optional[datetime] = None
    total_marks: Optional[int] = None
    attachment_url: Optional[str] = Field(None, max_length=500)


class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    subject_id: Optional[int] = None
    class_id: Optional[int] = None
    teacher_id: Optional[int] = None
    due_date: Optional[datetime] = None
    total_marks: Optional[int] = None
    attachment_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True