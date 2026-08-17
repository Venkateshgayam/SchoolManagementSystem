from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class TeacherClassAssignmentCreate(BaseModel):
    teacher_id: int
    class_id: int
    subject_id: Optional[int] = None


class TeacherClassAssignmentUpdate(BaseModel):
    teacher_id: Optional[int] = None
    class_id: Optional[int] = None
    subject_id: Optional[int] = None


class TeacherClassAssignmentResponse(BaseModel):
    id: int
    teacher_id: int
    class_id: int
    subject_id: Optional[int] = None
    teacher_name: Optional[str] = None
    class_name: Optional[str] = None
    class_section: Optional[str] = None
    subject_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
