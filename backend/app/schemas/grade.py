from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class GradeCreate(BaseModel):
    student_id: int
    subject_id: int
    exam_id: Optional[int] = None
    marks_obtained: float = Field(..., ge=0)
    total_marks: float = Field(..., gt=0)
    created_by: Optional[int] = None


class GradeUpdate(BaseModel):
    marks_obtained: Optional[float] = Field(None, ge=0)
    total_marks: Optional[float] = Field(None, gt=0)
    exam_id: Optional[int] = None


class GradeResponse(BaseModel):
    id: int
    student_id: int
    subject_id: int
    exam_id: Optional[int] = None
    marks_obtained: float
    total_marks: float
    percentage: Optional[float] = None
    letter_grade: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True